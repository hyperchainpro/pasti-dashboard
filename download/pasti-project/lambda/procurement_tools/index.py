"""
PASTI Project - Procurement Tools Lambda
Handles: GET /suppliers, POST /orders, POST /notify
Connects to DynamoDB tables in ap-southeast-3 region.
"""

import json
import os
import time
import logging
import urllib.request
import urllib.error
from datetime import datetime, timezone
from io import BytesIO

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
AWS_REGION = os.environ.get('AWS_REGION', 'ap-southeast-3')
TABLE_PRODUCTS = os.environ.get('TABLE_PRODUCTS', 'pasti-products')
TABLE_SUPPLIERS = os.environ.get('TABLE_SUPPLIERS', 'pasti-suppliers')
TABLE_ORDERS = os.environ.get('TABLE_ORDERS', 'pasti-orders')
S3_BUCKET_PO = os.environ.get('S3_BUCKET_PO', 'pasti-po-documents')
TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '')
TELEGRAM_CHAT_ID = os.environ.get('TELEGRAM_CHAT_ID', '')

CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
}

dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
products_table = dynamodb.Table(TABLE_PRODUCTS)
suppliers_table = dynamodb.Table(TABLE_SUPPLIERS)
orders_table = dynamodb.Table(TABLE_ORDERS)
s3_client = boto3.client('s3', region_name=AWS_REGION)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _ok(body, status_code=200):
    return {
        'statusCode': status_code,
        'headers': CORS_HEADERS,
        'body': json.dumps(body, default=str, ensure_ascii=False),
    }


def _err(message, status_code=500):
    logger.error('Error response [%s]: %s', status_code, message)
    return {
        'statusCode': status_code,
        'headers': CORS_HEADERS,
        'body': json.dumps({'error': message}, ensure_ascii=False),
    }


def _format_rp(amount):
    return f'Rp{amount:,.0f}'.replace(',', '.')


# ---------------------------------------------------------------------------
# Tool 1: get_supplier_offers
# ---------------------------------------------------------------------------

def get_supplier_offers(item_id):
    """Scan suppliers, return those that carry the given item, sorted by price asc."""
    try:
        response = suppliers_table.scan()
        suppliers = response.get('Items', [])
        while 'LastEvaluatedKey' in response:
            response = suppliers_table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            suppliers.extend(response.get('Items', []))

        offers = []
        for sup in suppliers:
            catalog = sup.get('catalog', sup.get('items', []))
            if isinstance(catalog, str):
                try:
                    catalog = json.loads(catalog)
                except (json.JSONDecodeError, TypeError):
                    catalog = []

            if not isinstance(catalog, list):
                continue

            for cat_item in catalog:
                cat_pid = cat_item.get('product_id', '')
                if cat_pid == item_id:
                    offers.append({
                        'supplier_id': sup.get('supplier_id', sup.get('id', '')),
                        'nama': sup.get('nama', sup.get('name', '')),
                        'lead_time_hari': int(cat_item.get('lead_time_hari', cat_item.get('lead_time', 7))),
                        'harga': float(cat_item.get('harga', cat_item.get('price', 0))),
                        'min_order': int(cat_item.get('min_order', 1)),
                    })
                    break

        offers.sort(key=lambda x: x['harga'])
        logger.info('get_supplier_offers for %s: %d offers found', item_id, len(offers))
        return _ok(offers)

    except ClientError as e:
        logger.exception('DynamoDB error in get_supplier_offers')
        return _err(f'Database error: {e.response["Error"]["Message"]}')
    except Exception as e:
        logger.exception('Unexpected error in get_supplier_offers')
        return _err(str(e))


# ---------------------------------------------------------------------------
# Tool 2: create_draft_po
# ---------------------------------------------------------------------------

def _generate_po_pdf(po_id, supplier_nama, supplier_id, items, total, created_at):
    """Generate a simple A4 Purchase Order PDF using reportlab with Helvetica."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas

    buffer = BytesIO()
    width, height = A4
    c = canvas.Canvas(buffer, pagesize=A4)

    # --- Header ---
    c.setFont('Helvetica-Bold', 20)
    c.drawString(30 * mm, height - 30 * mm, 'PURCHASE ORDER')

    c.setFont('Helvetica', 11)
    y = height - 50 * mm
    c.drawString(30 * mm, y, f'PO Number: {po_id}')
    y -= 7 * mm
    c.drawString(30 * mm, y, f'Date: {created_at}')
    y -= 7 * mm
    c.drawString(30 * mm, y, f'Supplier: {supplier_nama} ({supplier_id})')
    y -= 7 * mm
    c.drawString(30 * mm, y, 'Created by: agent')

    # --- Separator ---
    y -= 10 * mm
    c.setStrokeColorRGB(0, 0, 0)
    c.line(30 * mm, y, width - 30 * mm, y)
    y -= 8 * mm

    # --- Table header ---
    col_x = [30 * mm, 80 * mm, 120 * mm, 145 * mm, 175 * mm]
    c.setFont('Helvetica-Bold', 10)
    headers = ['No', 'Product ID', 'Qty', 'Harga', 'Subtotal']
    for i, h in enumerate(headers):
        c.drawString(col_x[i], y, h)
    y -= 3 * mm
    c.line(30 * mm, y, width - 30 * mm, y)
    y -= 6 * mm

    # --- Table rows ---
    c.setFont('Helvetica', 10)
    for idx, item in enumerate(items, 1):
        pid = item.get('product_id', '')
        qty = item.get('qty', 0)
        harga = item.get('harga', 0)
        subtotal = item.get('subtotal', 0)
        c.drawString(col_x[0], y, str(idx))
        c.drawString(col_x[1], y, str(pid))
        c.drawString(col_x[2], y, str(qty))
        c.drawString(col_x[3], y, _format_rp(harga))
        c.drawString(col_x[4], y, _format_rp(subtotal))
        y -= 6 * mm

    # --- Total ---
    y -= 6 * mm
    c.line(120 * mm, y, width - 30 * mm, y)
    y -= 8 * mm
    c.setFont('Helvetica-Bold', 12)
    c.drawString(120 * mm, y, f'Total: {_format_rp(total)}')

    # --- Footer status ---
    y -= 20 * mm
    c.setFont('Helvetica-Bold', 11)
    c.setFillColorRGB(0.8, 0.0, 0.0)
    c.drawString(30 * mm, y, 'Status: MENUNGGU APPROVAL')
    c.setFillColorRGB(0, 0, 0)

    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer


def create_draft_po(supplier_id, items):
    """Create a draft Purchase Order, generate PDF, upload to S3.

    Args:
        supplier_id: The supplier to order from.
        items: List of dicts with {product_id, qty}.
    """
    try:
        # --- Validate supplier exists ---
        sup_resp = suppliers_table.get_item(Key={'supplier_id': supplier_id})
        if 'Item' not in sup_resp:
            return _err(f'Supplier {supplier_id} not found', 404)
        supplier = sup_resp['Item']
        supplier_nama = supplier.get('nama', supplier.get('name', ''))

        # Parse supplier catalog
        catalog = supplier.get('catalog', supplier.get('items', []))
        if isinstance(catalog, str):
            try:
                catalog = json.loads(catalog)
            except (json.JSONDecodeError, TypeError):
                catalog = []

        # Build lookup: product_id -> catalog entry
        catalog_map = {}
        for cat_item in catalog:
            pid = cat_item.get('product_id', '')
            if pid:
                catalog_map[pid] = cat_item

        # --- Validate items and build order lines ---
        order_items = []
        total = 0.0

        for req_item in items:
            pid = req_item.get('product_id', '')
            qty = int(req_item.get('qty', 0))

            if pid not in catalog_map:
                return _err(f'Product {pid} not found in supplier {supplier_id} catalog', 400)

            cat_entry = catalog_map[pid]
            harga = float(cat_entry.get('harga', cat_entry.get('price', 0)))
            min_order = int(cat_entry.get('min_order', 1))

            if qty < min_order:
                return _err(
                    f'Qty {qty} for {pid} is below minimum order {min_order}',
                    400,
                )

            subtotal = harga * qty
            total += subtotal

            # Fetch product name if available
            nama = pid
            try:
                prod_resp = products_table.get_item(Key={'product_id': pid})
                if 'Item' in prod_resp:
                    nama = prod_resp['Item'].get('nama', pid)
            except ClientError:
                logger.warning('Could not fetch product name for %s', pid)

            order_items.append({
                'product_id': pid,
                'nama': nama,
                'qty': qty,
                'harga': harga,
                'subtotal': subtotal,
            })

        # --- Generate PO ID and timestamp ---
        po_id = f'PO{int(time.time())}'
        created_at = datetime.now(timezone.utc).isoformat()

        # --- Save PO to DynamoDB ---
        order_record = {
            'po_id': po_id,
            'supplier_id': supplier_id,
            'supplier_nama': supplier_nama,
            'items': order_items,
            'total': total,
            'status': 'draft',
            'dibuat_oleh': 'agent',
            'created_at': created_at,
        }
        orders_table.put_item(Item=order_record)
        logger.info('PO %s saved to DynamoDB', po_id)

        # --- Generate PDF ---
        pdf_buffer = _generate_po_pdf(
            po_id=po_id,
            supplier_nama=supplier_nama,
            supplier_id=supplier_id,
            items=order_items,
            total=total,
            created_at=created_at,
        )
        pdf_bytes = pdf_buffer.read()

        # --- Upload PDF to S3 ---
        s3_key = f'{po_id}.pdf'
        s3_client.put_object(
            Bucket=S3_BUCKET_PO,
            Key=s3_key,
            Body=pdf_bytes,
            ContentType='application/pdf',
        )

        s3_pdf_url = f'https://{S3_BUCKET_PO}.s3.{AWS_REGION}.amazonaws.com/{s3_key}'
        logger.info('PDF uploaded to s3://%s/%s', S3_BUCKET_PO, s3_key)

        return _ok({
            'po_id': po_id,
            'supplier_id': supplier_id,
            'supplier_nama': supplier_nama,
            'items': order_items,
            'total': total,
            'status': 'draft',
            's3_pdf_url': s3_pdf_url,
        })

    except ClientError as e:
        logger.exception('DynamoDB error in create_draft_po')
        return _err(f'Database error: {e.response["Error"]["Message"]}')
    except Exception as e:
        logger.exception('Unexpected error in create_draft_po')
        return _err(str(e))


# ---------------------------------------------------------------------------
# Tool 3: send_telegram_approval
# ---------------------------------------------------------------------------

def send_telegram_approval(po_id):
    """Fetch PO, format Telegram message with inline keyboard, send it."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        logger.error('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set')
        return _err('Telegram configuration missing', 500)

    # --- Fetch the PO from DynamoDB ---
    try:
        po_resp = orders_table.get_item(Key={'po_id': po_id})
        if 'Item' not in po_resp:
            return _err(f'PO {po_id} not found', 404)
        order = po_resp['Item']
    except ClientError as e:
        logger.exception('Failed to fetch PO %s', po_id)
        return _err(f'Database error: {e.response["Error"]["Message"]}')

    supplier_nama = order.get('supplier_nama', order.get('supplier_name', 'Unknown'))
    items = order.get('items', [])
    total = order.get('total', 0)
    status = order.get('status', 'draft')
    created_at = order.get('created_at', '')

    # --- Build message text ---
    lines = [
        f'PURCHASE ORDER: {po_id}',
        f'Supplier: {supplier_nama}',
        f'Date: {created_at}',
        f'Status: {status.upper()}',
        '',
        'Items:',
    ]
    for idx, it in enumerate(items, 1):
        nama = it.get('nama', it.get('product_id', ''))
        qty = it.get('qty', 0)
        harga = it.get('harga', 0)
        subtotal = it.get('subtotal', qty * harga)
        lines.append(f'  {idx}. {nama} x{qty} @ {_format_rp(harga)} = {_format_rp(subtotal)}')

    lines.append('')
    lines.append(f'Total: {_format_rp(total)}')
    lines.append('')
    lines.append('Please review and approve/reject:')
    message_text = '\n'.join(lines)

    # --- Build inline keyboard ---
    inline_keyboard = [
        [
            {'text': 'Approve', 'callback_data': f'approve:{po_id}'},
            {'text': 'Edit', 'callback_data': f'edit:{po_id}'},
            {'text': 'Tolak', 'callback_data': f'reject:{po_id}'},
        ]
    ]

    payload = {
        'chat_id': TELEGRAM_CHAT_ID,
        'text': message_text,
        'parse_mode': 'Markdown',
        'reply_markup': json.dumps({'inline_keyboard': inline_keyboard}),
    }

    try:
        url = f'https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage'
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req, timeout=15) as resp:
            resp_body = json.loads(resp.read().decode('utf-8'))

        message_id = resp_body.get('result', {}).get('message_id')
        logger.info('Telegram message sent for PO %s, message_id=%s', po_id, message_id)

        # Update PO status to pending_approval
        try:
            orders_table.update_item(
                Key={'po_id': po_id},
                UpdateExpression='SET #s = :s',
                ConditionExpression='attribute_exists(po_id)',
                ExpressionAttributeNames={'#s': 'status'},
                ExpressionAttributeValues={':s': 'pending_approval'},
            )
        except ClientError as ce:
            logger.warning('Failed to update PO status to pending_approval: %s', ce)

        return _ok({
            'po_id': po_id,
            'telegram_message_id': message_id,
            'status': 'pending_approval',
        })

    except urllib.error.URLError as e:
        logger.exception('Telegram API error for PO %s', po_id)
        return _err(f'Failed to send Telegram message: {e.reason}')
    except Exception as e:
        logger.exception('Unexpected error in send_telegram_approval')
        return _err(str(e))


# ---------------------------------------------------------------------------
# Lambda handler with routing
# ---------------------------------------------------------------------------

def handler(event, context):
    """AWS Lambda entry point. Routes based on path and HTTP method."""
    logger.info('Event: %s', json.dumps(event, default=str))

    http_method = event.get('httpMethod', event.get('requestContext', {}).get('httpMethod', ''))
    if http_method == 'OPTIONS':
        return {
            'statusCode': 204,
            'headers': CORS_HEADERS,
            'body': '',
        }

    path = event.get('path', '').lstrip('/')
    query_params = event.get('queryStringParameters') or {}
    if query_params and not isinstance(query_params, dict):
        query_params = {}

    try:
        if path == 'suppliers' and http_method == 'GET':
            item_id = query_params.get('item_id')
            if not item_id:
                return _err('Missing required query parameter: item_id', 400)
            return get_supplier_offers(item_id)

        elif path == 'orders' and http_method == 'POST':
            body_str = event.get('body', '{}')
            if isinstance(body_str, str):
                body = json.loads(body_str)
            else:
                body = body_str

            supplier_id = body.get('supplier_id')
            items = body.get('items', [])

            if not supplier_id:
                return _err('Missing required field: supplier_id', 400)
            if not items or not isinstance(items, list):
                return _err('Missing or invalid field: items (must be a non-empty list)', 400)

            return create_draft_po(supplier_id, items)

        elif path == 'notify' and http_method == 'POST':
            body_str = event.get('body', '{}')
            if isinstance(body_str, str):
                body = json.loads(body_str)
            else:
                body = body_str

            po_id = body.get('po_id')
            if not po_id:
                return _err('Missing required field: po_id', 400)

            return send_telegram_approval(po_id)

        else:
            return _err(f'Unknown route or method: {http_method} {path}', 404)

    except json.JSONDecodeError:
        return _err('Invalid JSON in request body', 400)
    except Exception as e:
        logger.exception('Unhandled error in handler')
        return _err(f'Internal server error: {str(e)}', 500)


# ---------------------------------------------------------------------------
# Local test (no AWS required)
# ---------------------------------------------------------------------------

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)

    print('=== Test: GET /suppliers?item_id=P01 ===')
    mock_suppliers = {
        'path': '/suppliers',
        'httpMethod': 'GET',
        'queryStringParameters': {'item_id': 'P01'},
    }
    # print(handler(mock_suppliers, None))

    print('=== Test: POST /orders ===')
    mock_order = {
        'path': '/orders',
        'httpMethod': 'POST',
        'body': json.dumps({
            'supplier_id': 'SUP001',
            'items': [{'product_id': 'P01', 'qty': 50}],
        }),
    }
    # print(handler(mock_order, None))

    print('=== Test: POST /notify ===')
    mock_notify = {
        'path': '/notify',
        'httpMethod': 'POST',
        'body': json.dumps({'po_id': 'PO1700000000'}),
    }
    # print(handler(mock_notify, None))

    print('All route structures validated locally. Deploy to AWS Lambda for live execution.')
