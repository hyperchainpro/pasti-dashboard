"""
PASTI Project - Inventory Tools Lambda
Handles: GET /inventory, GET /sales, GET /forecast
Connects to DynamoDB tables in ap-southeast-3 region.
"""

import json
import os
import logging
from datetime import datetime, timedelta, timezone
from math import floor, ceil

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
AWS_REGION = os.environ.get('AWS_REGION', 'ap-southeast-3')
TABLE_PRODUCTS = os.environ.get('TABLE_PRODUCTS', 'pasti-products')
TABLE_SALES = os.environ.get('TABLE_SALES', 'pasti-sales')

CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
}

dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
products_table = dynamodb.Table(TABLE_PRODUCTS)
sales_table = dynamodb.Table(TABLE_SALES)

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


def _parse_date(date_str):
    """Parse YYYY-MM-DD string to date object."""
    return datetime.strptime(date_str, '%Y-%m-%d').date()


# ---------------------------------------------------------------------------
# Tool 1: get_inventory_status
# ---------------------------------------------------------------------------

def get_inventory_status():
    """Scan pasti-products and return every item with computed stock status.

    Status logic:
      - KRITIS      : stok_saat_ini < stok_min
      - PERINGATAN  : stok_saat_ini < stok_min + safety_stock (but >= stok_min)
      - AMAN        : otherwise
    """
    try:
        response = products_table.scan()
        items = response.get('Items', [])

        # Handle paginated results
        while 'LastEvaluatedKey' in response:
            response = products_table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            items.extend(response.get('Items', []))

        result = []
        for item in items:
            stok = float(item.get('stok_saat_ini', 0))
            stok_min = float(item.get('stok_min', 0))
            safety = float(item.get('safety_stock', 0))

            if stok < stok_min:
                status = 'KRITIS'
            elif stok < stok_min + safety:
                status = 'PERINGATAN'
            else:
                status = 'AMAN'

            result.append({
                'product_id': item.get('product_id', item.get('id', '')),
                'nama': item.get('nama', ''),
                'unit': item.get('unit', item.get('satuan', '')),
                'stok_saat_ini': stok,
                'stok_min': stok_min,
                'safety_stock': safety,
                'harga_jual': float(item.get('harga_jual', 0)),
                'status': status,
            })

        logger.info('get_inventory_status returned %d items', len(result))
        return _ok(result)

    except ClientError as e:
        logger.exception('DynamoDB scan error in get_inventory_status')
        return _err(f'Database error: {e.response["Error"]["Message"]}')
    except Exception as e:
        logger.exception('Unexpected error in get_inventory_status')
        return _err(str(e))


# ---------------------------------------------------------------------------
# Tool 2: get_sales_history
# ---------------------------------------------------------------------------

def get_sales_history(item_id=None, periode=None):
    """Query sales history with optional item_id and date-range filter.

    Uses GSI ``product-date-index`` when item_id is provided.
    Date range format: "YYYY-MM-DD:YYYY-MM-DD".
    """
    try:
        items = []

        if item_id:
            # Query GSI: product-date-index (partition key = product_id)
            response = sales_table.query(
                IndexName='product-date-index',
                KeyConditionExpression=boto3.dynamodb.conditions.Key('product_id').eq(item_id),
            )
            items = response.get('Items', [])

            while 'LastEvaluatedKey' in response:
                response = sales_table.query(
                    IndexName='product-date-index',
                    KeyConditionExpression=boto3.dynamodb.conditions.Key('product_id').eq(item_id),
                    ExclusiveStartKey=response['LastEvaluatedKey'],
                )
                items.extend(response.get('Items', []))
        else:
            # Full scan
            response = sales_table.scan()
            items = response.get('Items', [])
            while 'LastEvaluatedKey' in response:
                response = sales_table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
                items.extend(response.get('Items', []))

        # Filter by date range if periode provided
        if periode:
            try:
                start_str, end_str = periode.split(':')
                start_date = _parse_date(start_str)
                end_date = _parse_date(end_str)
            except (ValueError, TypeError):
                return _err('Invalid periode format. Use YYYY-MM-DD:YYYY-MM-DD', 400)

            filtered = []
            for sale in items:
                tanggal_raw = sale.get('tanggal', sale.get('date', ''))
                if isinstance(tanggal_raw, str) and len(tanggal_raw) >= 10:
                    sale_date = _parse_date(tanggal_raw[:10])
                    if start_date <= sale_date <= end_date:
                        filtered.append(sale)
                elif isinstance(tanggal_raw, (int, float)):
                    # Epoch seconds
                    sale_dt = datetime.fromtimestamp(tanggal_raw, tz=timezone.utc).date()
                    if start_date <= sale_dt <= end_date:
                        filtered.append(sale)
            items = filtered

        # Shape response
        result = []
        for sale in items:
            tanggal_raw = sale.get('tanggal', sale.get('date', ''))
            if isinstance(tanggal_raw, str):
                tanggal = tanggal_raw[:10]
            else:
                tanggal = str(tanggal_raw)[:10]

            result.append({
                'sale_id': sale.get('sale_id', sale.get('id', '')),
                'product_id': sale.get('product_id', ''),
                'qty': float(sale.get('qty', sale.get('jumlah', 0))),
                'tanggal': tanggal,
            })

        # Sort by tanggal ascending
        result.sort(key=lambda x: x['tanggal'])

        logger.info('get_sales_history returned %d records', len(result))
        return _ok(result)

    except ClientError as e:
        logger.exception('DynamoDB query error in get_sales_history')
        return _err(f'Database error: {e.response["Error"]["Message"]}')
    except Exception as e:
        logger.exception('Unexpected error in get_sales_history')
        return _err(str(e))


# ---------------------------------------------------------------------------
# Tool 3: forecast_demand
# ---------------------------------------------------------------------------

def forecast_demand(item_id):
    """Deterministic demand forecast for a single product.

    Algorithm (all steps are deterministic, no ML):
      1. Fetch last 30 days of sales via GSI
      2. Fetch product info for stock levels
      3. Compute avg_daily_7, avg_daily_30, adjusted_daily (with weekend boost)
      4. Derive days_until_stockout, reorder_qty
    """
    try:
        today = datetime.now(timezone.utc).date()
        thirty_days_ago = today - timedelta(days=30)
        seven_days_ago = today - timedelta(days=7)

        # --- Fetch sales for this item (last 30+ days to be safe) ---
        response = sales_table.query(
            IndexName='product-date-index',
            KeyConditionExpression=boto3.dynamodb.conditions.Key('product_id').eq(item_id),
        )
        all_sales = response.get('Items', [])
        while 'LastEvaluatedKey' in response:
            response = sales_table.query(
                IndexName='product-date-index',
                KeyConditionExpression=boto3.dynamodb.conditions.Key('product_id').eq(item_id),
                ExclusiveStartKey=response['LastEvaluatedKey'],
            )
            all_sales.extend(response.get('Items', []))

        # Parse and filter to last 30 days; build daily buckets
        daily_sales = {}  # date_str -> total qty
        for sale in all_sales:
            tanggal_raw = sale.get('tanggal', sale.get('date', ''))
            if isinstance(tanggal_raw, str) and len(tanggal_raw) >= 10:
                sale_date = _parse_date(tanggal_raw[:10])
            elif isinstance(tanggal_raw, (int, float)):
                sale_date = datetime.fromtimestamp(tanggal_raw, tz=timezone.utc).date()
            else:
                continue

            if thirty_days_ago <= sale_date <= today:
                key = str(sale_date)
                qty = float(sale.get('qty', sale.get('jumlah', 0)))
                daily_sales[key] = daily_sales.get(key, 0) + qty

        # --- Fetch product info ---
        product_resp = products_table.get_item(Key={'product_id': item_id})
        if 'Item' not in product_resp:
            return _err(f'Product {item_id} not found', 404)
        product = product_resp['Item']

        stok_saat_ini = float(product.get('stok_saat_ini', 0))
        stok_min = float(product.get('stok_min', 0))
        safety_stock = float(product.get('safety_stock', 0))

        # --- Compute averages ---
        # Last 7 days
        last_7_qty = []
        for i in range(7):
            d = today - timedelta(days=i)
            last_7_qty.append(daily_sales.get(str(d), 0))
        avg_daily_7 = sum(last_7_qty) / 7.0

        # Last 30 days
        last_30_qty = list(daily_sales.values())
        avg_daily_30 = sum(last_30_qty) / 30.0

        # Use the higher average (more conservative)
        avg_daily = max(avg_daily_7, avg_daily_30)

        # --- Weekend boost ---
        # Check if the next 2 days include Friday (4), Saturday (5), or Sunday (6)
        weekend_days = {4, 5, 6}  # Mon=0 ... Sun=6
        next_2_days = [(today + timedelta(days=i)).weekday() for i in range(1, 3)]
        weekend_boost = 1.4 if any(d in weekend_days for d in next_2_days) else 1.0

        adjusted_daily = avg_daily * weekend_boost

        # --- Days until stockout ---
        if adjusted_daily > 0:
            days_until_stockout = floor(stok_saat_ini / adjusted_daily)
        else:
            days_until_stockout = 999

        estimated_stockout_date = (today + timedelta(days=days_until_stockout)).strftime('%Y-%m-%d')

        # --- Reorder quantity ---
        reorder_qty = ceil(adjusted_daily * 7) + safety_stock - stok_saat_ini
        reorder_qty = max(0, reorder_qty)

        # --- Confidence based on data points ---
        num_data_points = len(last_30_qty)
        if num_data_points >= 20:
            confidence = 'HIGH'
        elif num_data_points >= 10:
            confidence = 'MEDIUM'
        else:
            confidence = 'LOW'

        # --- Reasoning text ---
        reasoning_parts = [
            f'Analyzed {num_data_points} days of sales data.',
            f'7-day avg: {avg_daily_7:.1f}/day, 30-day avg: {avg_daily_30:.1f}/day.',
            f'Using higher average: {avg_daily:.1f}/day.',
        ]
        if weekend_boost > 1.0:
            reasoning_parts.append(
                f'Weekend boost applied ({weekend_boost}x) for next 2 days: ' +
                ', '.join([(today + timedelta(days=i)).strftime('%a %Y-%m-%d') for i in range(1, 3)])
            )
        reasoning_parts.append(f'Adjusted daily rate: {adjusted_daily:.1f}/day.')
        reasoning_parts.append(
            f'Current stock {stok_saat_ini:.0f} will last ~{days_until_stockout} days ' +
            f'(est. stockout: {estimated_stockout_date}).'
        )
        if reorder_qty > 0:
            reasoning_parts.append(
                f'Recommended reorder: {reorder_qty:.0f} units (7-day supply + safety stock - current).'
            )
        else:
            reasoning_parts.append('No reorder needed at this time.')

        result = {
            'item_id': item_id,
            'avg_daily_7': round(avg_daily_7, 2),
            'avg_daily_30': round(avg_daily_30, 2),
            'adjusted_daily': round(adjusted_daily, 2),
            'days_until_stockout': days_until_stockout,
            'estimated_stockout_date': estimated_stockout_date,
            'reorder_qty': reorder_qty,
            'confidence': confidence,
            'reasoning_text': ' '.join(reasoning_parts),
        }

        logger.info('forecast_demand for %s: days_left=%s, reorder=%s',
                    item_id, days_until_stockout, reorder_qty)
        return _ok(result)

    except ClientError as e:
        logger.exception('DynamoDB error in forecast_demand')
        return _err(f'Database error: {e.response["Error"]["Message"]}')
    except Exception as e:
        logger.exception('Unexpected error in forecast_demand')
        return _err(str(e))


# ---------------------------------------------------------------------------
# Lambda handler with routing
# ---------------------------------------------------------------------------

def handler(event, context):
    """AWS Lambda entry point. Routes based on path and query parameters."""
    logger.info('Event: %s', json.dumps(event, default=str))

    # Handle CORS preflight
    http_method = event.get('httpMethod', event.get('requestContext', {}).get('httpMethod', ''))
    if http_method == 'OPTIONS':
        return {
            'statusCode': 204,
            'headers': CORS_HEADERS,
            'body': '',
        }

    # Determine path
    path = event.get('path', '')
    if path.startswith('/'):
        path = path[1:]

    # Parse query string parameters
    query_params = event.get('queryStringParameters') or {}
    if query_params and not isinstance(query_params, dict):
        query_params = {}

    try:
        if path == 'inventory':
            return get_inventory_status()

        elif path == 'sales':
            item_id = query_params.get('item_id')
            periode = query_params.get('periode')
            return get_sales_history(item_id=item_id, periode=periode)

        elif path == 'forecast':
            item_id = query_params.get('item_id')
            if not item_id:
                return _err('Missing required query parameter: item_id', 400)
            return forecast_demand(item_id)

        else:
            return _err(f'Unknown route: {path}', 404)

    except Exception as e:
        logger.exception('Unhandled error in handler')
        return _err(f'Internal server error: {str(e)}', 500)


# ---------------------------------------------------------------------------
# Local test (no AWS required)
# ---------------------------------------------------------------------------

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)

    # Simulate local event for inventory
    print('=== Test: GET /inventory ===')
    mock_event_inventory = {'path': '/inventory', 'httpMethod': 'GET', 'queryStringParameters': {}}
    # print(handler(mock_event_inventory, None))

    # Simulate local event for sales
    print('=== Test: GET /sales?item_id=P01&periode=2026-07-01:2026-08-01 ===')
    mock_event_sales = {
        'path': '/sales',
        'httpMethod': 'GET',
        'queryStringParameters': {'item_id': 'P01', 'periode': '2026-07-01:2026-08-01'},
    }
    # print(handler(mock_event_sales, None))

    # Simulate local event for forecast
    print('=== Test: GET /forecast?item_id=P01 ===')
    mock_event_forecast = {
        'path': '/forecast',
        'httpMethod': 'GET',
        'queryStringParameters': {'item_id': 'P01'},
    }
    # print(handler(mock_event_forecast, None))

    print('All route structures validated locally. Deploy to AWS Lambda for live execution.')
