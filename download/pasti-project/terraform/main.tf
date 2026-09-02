# PASTI - Terraform Infrastructure
# Deploy seluruh infrastruktur AWS dengan satu command:
#   terraform init && terraform plan && terraform apply

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Ganti dengan S3 bucket Anda untuk state
  # backend "s3" {
  #   bucket = "pasti-tf-state"
  #   key    = "terraform.tfstate"
  #   region = "ap-southeast-3"
  # }
}

provider "aws" {
  region = var.aws_region
}

# ── Variables ──
variable "aws_region" {
  default = "ap-southeast-3"
}

variable "bedrock_model_id" {
  default = "anthropic.claude-3-haiku-20240307-v1:0"
}

variable "telegram_bot_token" {
  description = "Telegram Bot Token dari @BotFather"
  type      = string
  sensitive  = true
}

variable "telegram_chat_id" {
  description = "Chat ID owner di Telegram"
  type      = string
}

variable "budget_amount" {
  default = 5
}

variable "budget_email" {
  description = "Email untuk notifikasi budget alarm"
  type      = string
}

# ── S3 Buckets ──
resource "aws_s3_bucket" "agent_schemas" {
  bucket = "pasti-agent-schemas"
}

resource "aws_s3_bucket" "po_documents" {
  bucket = "pasti-po-documents"
}

resource "aws_s3_bucket_public_access_block" "agent_schemas_pab" {
  bucket                  = aws_s3_bucket.agent_schemas.id
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# ── DynamoDB Tables ──
resource "aws_dynamodb_table" "products" {
  name         = "pasti-products"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "product_id"
  attribute {
    name = "product_id"
    type = "S"
  }
}

resource "aws_dynamodb_table" "sales" {
  name         = "pasti-sales"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "sale_id"
  attribute {
    name = "sale_id"
    type = "S"
  }
  # GSI for product + date queries
  global_secondary_index {
    name            = "product-date-index"
    hash_key        = "product_id"
    range_key       = "tanggal"
    projection_type = "ALL"
    write_provisioned_capacity = null
    read_provisioned_capacity  = null
  }
  attribute {
    name = "product_id"
    type = "S"
  }
  attribute {
    name = "tanggal"
    type = "S"
  }
}

resource "aws_dynamodb_table" "suppliers" {
  name         = "pasti-suppliers"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "supplier_id"
  attribute {
    name = "supplier_id"
    type = "S"
  }
}

resource "aws_dynamodb_table" "orders" {
  name         = "pasti-orders"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "po_id"
  attribute {
    name = "po_id"
    type = "S"
  }
  global_secondary_index {
    name            = "status-index"
    hash_key        = "status"
    range_key       = "created_at"
    projection_type = "ALL"
    write_provisioned_capacity = null
    read_provisioned_capacity  = null
  }
  attribute {
    name = "status"
    type = "S"
  }
  attribute {
    name = "created_at"
    type = "S"
  }
}

resource "aws_dynamodb_table" "agent_logs" {
  name         = "pasti-agent-logs"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "trace_id"
  attribute {
    name = "trace_id"
    type = "S"
  }
}

resource "aws_dynamodb_table" "owner_preferences" {
  name         = "pasti-owner-preferences"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pref_key"
  attribute {
    name = "pref_key"
    type = "S"
  }
}

# ── IAM: Lambda Execution Role ──
resource "aws_iam_role" "lambda_exec" {
  name = "PASTI-LambdaExecRole"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "lambda_dynamodb" {
  name = "PASTI-LambdaDynamoDB"
  role = aws_iam_role.lambda_exec.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = [
          "dynamodb:GetItem", "dynamodb:Query", "dynamodb:Scan",
          "dynamodb:PutItem", "dynamodb:UpdateItem"
        ]
        Resource = [
          aws_dynamodb_table.products.arn,
          aws_dynamodb_table.sales.arn,
          aws_dynamodb_table.suppliers.arn,
          aws_dynamodb_table.orders.arn,
          aws_dynamodb_table.agent_logs.arn,
          aws_dynamodb_table.owner_preferences.arn,
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:GetObject"]
        Resource = [aws_s3_bucket.po_documents.arn, "${aws_s3_bucket.po_documents.arn}/*"]
      },
      {
        Effect = "Allow"
        Action = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "*"
      }
    ]
  })
}

# ── IAM: Service-linked role for Bedrock Agent ──
# Note: Bedrock Agent memerlukan AmazonBedrockAgentServiceRole
# Buat manual atau via console

# ── Budget Alarm ──
resource "aws_budgets_budget" "pasti" {
  name              = "PASTI-Monthly-Budget"
  budget_type       = "COST"
  limit_amount      = var.budget_amount
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  cost_filters = {
    Service = [
      "Amazon Bedrock", "AWS Lambda", "Amazon DynamoDB",
      "Amazon EventBridge", "Amazon API Gateway", "Amazon S3"
    ]
  }
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.budget_email]
  }
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.budget_email]
  }
}

# ── Outputs ──
output "dynamodb_tables" {
  value = {
    products          = aws_dynamodb_table.products.name
    sales             = aws_dynamodb_table.sales.name
    suppliers         = aws_dynamodb_table.suppliers.name
    orders            = aws_dynamodb_table.orders.name
    agent_logs        = aws_dynamodb_table.agent_logs.name
    owner_preferences = aws_dynamodb_table.owner_preferences.name
  }
}

output "s3_buckets" {
  value = {
    agent_schemas = aws_s3_bucket.agent_schemas.bucket
    po_documents  = aws_s3_bucket.po_documents.bucket
  }
}

output "lambda_role_arn" {
  value = aws_iam_role.lambda_exec.arn
}