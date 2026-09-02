#!/bin/bash
# PASTI - GitHub Repo Init
# Usage: GITHUB_TOKEN=ghp_xxx ./scripts/init_github.sh

set -e

REPO_NAME="pasti-ai-agent"
REPO_DESC="PASTI - Proactive Agentic Supply-chain Tracking & Inventory | AWS Bedrock Agents + Lambda + DynamoDB + Telegram"

if [ -z "$GITHUB_TOKEN" ]; then
    echo "ERROR: Set GITHUB_TOKEN environment variable."
    echo "  export GITHUB_TOKEN=ghp_your_token_here"
    exit 1
fi

echo "=== Creating GitHub repo: $REPO_NAME ==="

# Create private repo
HTTP_RESP=$(curl -s -w "\n%{http_code}" -X POST \
    "https://api.github.com/user/repos" \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    -d "{
        \"name\": \"$REPO_NAME\",
        \"description\": \"$REPO_DESC\",
        \"private\": true,
        \"auto_init\": false
    }")

HTTP_CODE=$(echo "$HTTP_RESP" | tail -1)
BODY=$(echo "$HTTP_RESP" | sed '$d')

if [ "$HTTP_CODE" -ne 201 ]; then
    # Check if repo already exists
    if echo "$BODY" | grep -q "already exists"; then
        echo "  Repo already exists. Skipping creation."
    else
        echo "  Error creating repo:"
        echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
        exit 1
    fi
fi

CLONE_URL="https://${GITHUB_TOKEN}@github.com/$(curl -s -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user | python3 -c "import sys,json; print(json.load(sys.stdin)['login'])")/${REPO_NAME}.git"
echo "  Repo: $CLONE_URL"

# Initialize git in project directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

if [ ! -d ".git" ]; then
    echo ""
echo "=== Initializing git ==="
    git init
    git checkout -b main
fi

# Add all files
echo ""
echo "=== Staging files ==="
git add -A
git status --short | head -30

# Commit
echo ""
echo "=== Committing ==="
git commit -m "Initial commit: PASTI AI Agent

- 3 Lambda functions (inventory, procurement, telegram handler)
- SAM template for one-command deploy
- DynamoDB table creation script
- Seed data generator (60 hari, 10 produk, 587 penjualan)
- Streamlit dashboard (stok, PO, agent trace)
- Bedrock Agent creation script + system prompt
- Terraform IaC
- Video concept script 60 detik
- Deploy script (build + deploy + seed + webhook)"

# Add remote and push
echo ""
echo "=== Pushing to GitHub ==="
GITHUB_USER=$(curl -s -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user | python3 -c "import sys,json; print(json.load(sys.stdin)['login'])")
REMOTE_URL="https://github.com/${GITHUB_USER}/${REPO_NAME}.git"

git remote remove origin 2>/dev/null || true
git remote add origin "$REMOTE_URL"
git push -u origin main --force

echo ""
echo "=== Done ==="
echo "  Repo: https://github.com/${GITHUB_USER}/${REPO_NAME}"
