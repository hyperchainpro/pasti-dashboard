#!/bin/bash
# PASTI - Deploy Script
# Usage: chmod +x deploy.sh && ./deploy.sh

set -e

echo "========================================="
echo "  PASTI Deployment Script"
echo "========================================="

# 1. Check prerequisites
command -v sam >/dev/null 2>&1 || { echo "ERROR: SAM CLI not installed. Run: pip install aws-sam-cli"; exit 1; }
command -v aws >/dev/null 2>&1 || { echo "ERROR: AWS CLI not installed."; exit 1; }

# 2. Check AWS credentials
aws sts get-caller-identity >/dev/null 2>&1 || { echo "ERROR: AWS credentials not configured. Run: aws configure"; exit 1; }

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=$(aws configure get region 2>/dev/null || echo "ap-southeast-3")
echo "  Account: $ACCOUNT_ID"
echo "  Region:  $REGION"
echo ""

# 3. Ask for Telegram credentials
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    read -p "  Telegram Bot Token: " TELEGRAM_BOT_TOKEN
fi
if [ -z "$TELEGRAM_CHAT_ID" ]; then
    read -p "  Telegram Chat ID:   " TELEGRAM_CHAT_ID
fi

BUDGET_EMAIL=""
read -p "  Budget Alarm Email (opsional, enter untuk skip): " BUDGET_EMAIL

# 4. Build SAM
echo ""
echo "[1/5] Building SAM application..."
sam build

# 5. Deploy SAM
echo ""
echo "[2/5] Deploying to AWS..."

SAM_PARAMS=""
SAM_PARAMS="$SAM_PARAMS ParameterKey=TelegramBotToken,ParameterValue=$TELEGRAM_BOT_TOKEN"
SAM_PARAMS="$SAM_PARAMS ParameterKey=TelegramChatId,ParameterValue=$TELEGRAM_CHAT_ID"

if [ -n "$BUDGET_EMAIL" ]; then
    SAM_PARAMS="$SAM_PARAMS ParameterKey=BudgetEmail,ParameterValue=$BUDGET_EMAIL"
fi

sam deploy \
    --resolve-s3 \
    --parameter-overrides $SAM_PARAMS \
    --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND

# 6. Get API endpoint
API_URL=$(aws cloudformation describe-stacks \
    --stack-name pasti \
    --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue" \
    --output text)

echo ""
echo "[3/5] API Endpoint: $API_URL"

# 7. Seed data
echo ""
echo "[4/5] Seeding data dummy (60 hari)..."
python scripts/seed_data.py --days 60

# 8. Set Telegram webhook
WEBHOOK_URL="${API_URL}/prod/telegram/webhook"
echo ""
echo "[5/5] Setting Telegram webhook..."
echo "  Webhook URL: $WEBHOOK_URL"

RESPONSE=$(curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${WEBHOOK_URL}")
echo "  Response: $RESPONSE"

echo ""
echo "========================================="
echo "  PASTI deployed successfully!"
echo "========================================="
echo ""
echo "  API Endpoint:  $API_URL"
echo "  Webhook URL:   $WEBHOOK_URL"
echo ""
echo "  Test inventory:  curl $API_URL/prod/inventory"
echo "  Test forecast:   curl $API_URL/prod/forecast?item_id=P03"
echo "  Test suppliers:  curl $API_URL/prod/suppliers?item_id=P03"
echo ""
echo "  Next: Run 'python bedrock_agent/create_agent.py' to setup Bedrock Agent"
echo "  Next: Run 'python scripts/create_scheduler.py --lambda-arn <arn>' to enable daily runs"
echo "  Next: Run 'streamlit run streamlit/app.py' to start dashboard"
