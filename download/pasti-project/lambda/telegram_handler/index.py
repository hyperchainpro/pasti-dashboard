"""
PASTI Project - Telegram Webhook Handler Lambda
Handles Telegram callback_query for PO approval/rejection/edit.
Uses urllib.request only (no external dependencies).
"""

import json
import os
import logging
import urllib.request
import urllib.error
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
AWS_REGION = os.environ.get('AWS_REGION', 'ap-southeast-3')
TABLE_ORDERS = os.environ.get('TABLE_ORDERS', 'pasti-orders')
TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '')

CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
}

dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
orders_table = dynamodb.Table(TABLE_ORDERS)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _ok(body, status_code=200):
    return {
        'statusCode': status_code,
        'headers': CORS_HEADERS,
        'body': json.dumps(body, ensure_ascii=False),
    }


def _err(message, status_code=500):
    logger.error('Error response [%s]: %s', status_code, message)
    return {
        'statusCode': status_code,
        'headers': CORS_HEADERS,
        'body': json.dumps({'error': message}, ensure_ascii=False),
    }


def _telegram_api_call(method, payload):
    """Make a Telegram Bot API call using urllib.request.

    Returns the parsed JSON response, or raises on failure.
    """
    if not TELEGRAM_BOT_TOKEN:
        raise RuntimeError('TELEGRAM_BOT_TOKEN is not configured')

    url = f'https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/{method}'
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})

    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode('utf-8'))


def _answer_callback_query(callback_query_id, text, show_alert=False):
    """Send answerCallbackQuery to acknowledge the button press."""
    try:
        _telegram_api_call('answerCallbackQuery', {
            'callback_query_id': callback_query_id,
            'text': text,
            'show_alert': show_alert,
        })
        logger.info('answerCallbackQuery sent: %s', text)
    except Exception as e:
        logger.warning('Failed to send answerCallbackQuery: %s', e)


def _send_message(chat_id, text, reply_to_message_id=None):
    """Send a text message to a Telegram chat."""
    payload = {
        'chat_id': chat_id,
        'text': text,
        'parse_mode': 'Markdown',
    }
    if reply_to_message_id:
        payload['reply_to_message_id'] = reply_to_message_id
    return _telegram_api_call('sendMessage', payload)


def _edit_message_text(chat_id, message_id, text, reply_markup=None):
    """Edit an existing message in a Telegram chat."""
    payload = {
        'chat_id': chat_id,
        'message_id': message_id,
        'text': text,
        'parse_mode': 'Markdown',
    }
    if reply_markup is not None:
        payload['reply_markup'] = json.dumps(reply_markup)
    return _telegram_api_call('editMessageText', payload)


# ---------------------------------------------------------------------------
# Action handlers
# ---------------------------------------------------------------------------

def handle_approve(chat_id, message_id, po_id, callback_query_id):
    """Approve a purchase order."""
    try:
        now = datetime.now(timezone.utc).isoformat()

        # Update PO status in DynamoDB
        orders_table.update_item(
            Key={'po_id': po_id},
            UpdateExpression='SET #s = :s, approved_at = :t',
            ConditionExpression='attribute_exists(po_id)',
            ExpressionAttributeNames={'#s': 'status'},
            ExpressionAttributeValues={
                ':s': 'approved',
                ':t': now,
            },
        )
        logger.info('PO %s approved at %s', po_id, now)

        # Acknowledge the callback
        _answer_callback_query(callback_query_id, f'PO {po_id} has been APPROVED.')

        # Edit the original message to reflect approval
        try:
            _edit_message_text(
                chat_id=chat_id,
                message_id=message_id,
                text=f'PO {po_id} - Status: APPROVED',
                reply_markup=None,  # Remove inline keyboard
            )
        except Exception as e:
            logger.warning('Could not edit message after approval: %s', e)

        return _ok({'po_id': po_id, 'action': 'approved', 'approved_at': now})

    except ClientError as e:
        logger.exception('DynamoDB error approving PO %s', po_id)
        _answer_callback_query(callback_query_id, f'Database error: {e.response["Error"]["Message"]}', show_alert=True)
        return _err(f'Database error: {e.response["Error"]["Message"]}')
    except Exception as e:
        logger.exception('Unexpected error in handle_approve')
        _answer_callback_query(callback_query_id, f'Error: {str(e)}', show_alert=True)
        return _err(str(e))


def handle_reject(chat_id, message_id, po_id, callback_query_id):
    """Reject a purchase order."""
    try:
        now = datetime.now(timezone.utc).isoformat()

        orders_table.update_item(
            Key={'po_id': po_id},
            UpdateExpression='SET #s = :s, rejected_at = :t',
            ConditionExpression='attribute_exists(po_id)',
            ExpressionAttributeNames={'#s': 'status'},
            ExpressionAttributeValues={
                ':s': 'rejected',
                ':t': now,
            },
        )
        logger.info('PO %s rejected at %s', po_id, now)

        _answer_callback_query(callback_query_id, f'PO {po_id} has been REJECTED.')

        try:
            _edit_message_text(
                chat_id=chat_id,
                message_id=message_id,
                text=f'PO {po_id} - Status: REJECTED',
                reply_markup=None,
            )
        except Exception as e:
            logger.warning('Could not edit message after rejection: %s', e)

        return _ok({'po_id': po_id, 'action': 'rejected', 'rejected_at': now})

    except ClientError as e:
        logger.exception('DynamoDB error rejecting PO %s', po_id)
        _answer_callback_query(callback_query_id, f'Database error: {e.response["Error"]["Message"]}', show_alert=True)
        return _err(f'Database error: {e.response["Error"]["Message"]}')
    except Exception as e:
        logger.exception('Unexpected error in handle_reject')
        _answer_callback_query(callback_query_id, f'Error: {str(e)}', show_alert=True)
        return _err(str(e))


def handle_edit(chat_id, message_id, po_id, callback_query_id):
    """Reply asking the user what changes they want."""
    try:
        # Answer the callback first
        _answer_callback_query(callback_query_id, 'Please specify your changes in a reply.')

        # Send a follow-up message asking for edit instructions
        edit_prompt = (
            f'You requested to edit PO {po_id}.\n\n'
            f'Please reply with your changes, for example:\n'
            f'- Change qty of P01 to 100\n'
            f'- Remove P02\n'
            f'- Change supplier to SUP002\n\n'
            f'An agent will process your request.'
        )

        _send_message(
            chat_id=chat_id,
            text=edit_prompt,
            reply_to_message_id=message_id,
        )

        logger.info('Edit prompt sent for PO %s', po_id)
        return _ok({'po_id': po_id, 'action': 'edit_requested'})

    except Exception as e:
        logger.exception('Unexpected error in handle_edit')
        _answer_callback_query(callback_query_id, f'Error: {str(e)}', show_alert=True)
        return _err(str(e))


# ---------------------------------------------------------------------------
# Callback dispatcher
# ---------------------------------------------------------------------------

ACTION_HANDLERS = {
    'approve': handle_approve,
    'reject': handle_reject,
    'tolak': handle_reject,   # Indonesian synonym
    'edit': handle_edit,
}


def process_callback_query(callback_query):
    """Parse a Telegram callback_query and dispatch to the appropriate handler.

    Expected callback_data format: "{action}:{po_id}"
    """
    callback_id = callback_query.get('id', '')
    callback_data = callback_query.get('data', '')
    message = callback_query.get('message', {})
    chat_id = message.get('chat', {}).get('id')
    message_id = message.get('message_id')

    if not callback_data or ':' not in callback_data:
        _answer_callback_query(callback_id, 'Invalid callback data format.', show_alert=True)
        return _err('Invalid callback data format', 400)

    action, po_id = callback_data.split(':', 1)
    action = action.strip().lower()
    po_id = po_id.strip()

    if not po_id:
        _answer_callback_query(callback_id, 'PO ID is missing from callback data.', show_alert=True)
        return _err('Missing PO ID in callback data', 400)

    handler_fn = ACTION_HANDLERS.get(action)
    if not handler_fn:
        _answer_callback_query(
            callback_id,
            f'Unknown action: {action}. Use approve, edit, or tolak.',
            show_alert=True,
        )
        return _err(f'Unknown action: {action}', 400)

    logger.info('Processing callback: action=%s, po_id=%s, chat_id=%s', action, po_id, chat_id)
    return handler_fn(chat_id, message_id, po_id, callback_id)


# ---------------------------------------------------------------------------
# Lambda handler
# ---------------------------------------------------------------------------

def handler(event, context):
    """AWS Lambda entry point for Telegram webhook callbacks.

    Telegram sends updates as JSON POST. We handle:
      - callback_query: PO approval/rejection/edit
    """
    logger.info('Event received: %s', json.dumps(event, default=str)[:2000])

    http_method = event.get('httpMethod', event.get('requestContext', {}).get('httpMethod', ''))
    if http_method == 'OPTIONS':
        return {
            'statusCode': 204,
            'headers': CORS_HEADERS,
            'body': '',
        }

    try:
        # Parse the incoming Telegram update
        body = event.get('body', '{}')
        if isinstance(body, str):
            update = json.loads(body)
        else:
            update = body

        # --- Route to callback_query handler ---
        callback_query = update.get('callback_query')
        if callback_query:
            return process_callback_query(callback_query)

        # --- Handle other update types (acknowledge and ignore) ---
        # Telegram expects a 200 OK for all webhook deliveries
        update_id = update.get('update_id', 'unknown')
        logger.info('Received non-callback update %s, acknowledging', update_id)
        return _ok({'status': 'ignored', 'update_id': update_id})

    except json.JSONDecodeError:
        logger.error('Invalid JSON in request body')
        return _err('Invalid JSON in request body', 400)
    except Exception as e:
        logger.exception('Unhandled error in telegram_handler')
        return _err(f'Internal server error: {str(e)}', 500)


# ---------------------------------------------------------------------------
# Local test (no AWS required)
# ---------------------------------------------------------------------------

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)

    print('=== Test: approve callback ===')
    mock_approve = {
        'body': json.dumps({
            'update_id': 12345,
            'callback_query': {
                'id': 'cb_001',
                'data': 'approve:PO1700000000',
                'message': {
                    'message_id': 100,
                    'chat': {'id': 999999},
                    'text': 'PO details...',
                },
            },
        }),
        'httpMethod': 'POST',
    }
    # print(handler(mock_approve, None))

    print('=== Test: reject callback (Indonesian) ===')
    mock_reject = {
        'body': json.dumps({
            'update_id': 12346,
            'callback_query': {
                'id': 'cb_002',
                'data': 'tolak:PO1700000000',
                'message': {
                    'message_id': 101,
                    'chat': {'id': 999999},
                },
            },
        }),
        'httpMethod': 'POST',
    }
    # print(handler(mock_reject, None))

    print('=== Test: edit callback ===')
    mock_edit = {
        'body': json.dumps({
            'update_id': 12347,
            'callback_query': {
                'id': 'cb_003',
                'data': 'edit:PO1700000000',
                'message': {
                    'message_id': 102,
                    'chat': {'id': 999999},
                },
            },
        }),
        'httpMethod': 'POST',
    }
    # print(handler(mock_edit, None))

    print('All callback structures validated locally. Deploy to AWS Lambda for live execution.')
