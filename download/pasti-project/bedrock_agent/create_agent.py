# -*- coding: utf-8 -*-
"""
PASTI - Bedrock Agent Creation Script
Membuat Bedrock Agent dengan Action Groups terhubung ke Lambda functions.

Usage:
    python create_agent.py \
        --inventory-lambda arn:aws:lambda:...:function:PASTI-InventoryTools \
        --procurement-lambda arn:aws:lambda:...:function:PASTI-ProcurementTools \
        --kb-id your-knowledge-base-id (opsional)
"""
import boto3
import json
import argparse
import time


AGENT_NAME = "PASTI-ProcurementAgent"
AGENT_DESCRIPTION = (
    "AI agent otonom untuk pembelian bahan baku UMKM F&B. "
    "Membaca stok, memprediksi kebutuhan, membandingkan supplier, "
    "membuat draf PO, dan meminta persetujuan owner via Telegram."
)

# Model options: anthropic.claude-3-haiku-20240307-v1:0 or amazon.nova-pro
DEFAULT_MODEL = "anthropic.claude-3-haiku-20240307-v1:0"


SYSTEM_PROMPT = """Kamu adalah PASTI, asisten AI pembelian otonom untuk usaha kuliner.

Tugasmu: memastikan stok bahan baku selalu tersedia.

PRINSIP INTI: LLM mengatur, kode menghitung.
Kamu TIDAK menghitung angka. Gunakan tool forecast_demand.

Alur wajib setiap run:
1. PERCEIVE: get_inventory_status + get_sales_history
2. REASON: Analisis stok, identifikasi item kritis
3. FORECAST: forecast_demand untuk item kritis
4. COMPARE: get_supplier_offers untuk item yang perlu diorder
5. SELF-CHECK: Validasi budget, instruksi owner, min order
6. ACT: create_draft_po + send_telegram_approval
7. LEARN: Catat keputusan

Aturan:
- JANGAN menghitung angka sendiri
- JANGAN membuat PO tanpa persetujuan owner
- JANGAN abaikan instruksi owner
- Satu PO per supplier per run
- Jika ragu, konservatif (lebih baik over-order)
- Pesan Telegram harus sederhana dan jelas
"""


def create_action_groups(inventory_lambda_arn, procurement_lambda_arn):
    """Return list of ActionGroup definitions for Bedrock Agent."""
    return [
        {
            "actionGroupName": "inventory_tools",
            "description": "Membaca data inventaris dan prediksi kebutuhan",
            "actionGroupExecutor": {
                "lambda": inventory_lambda_arn,
            },
            "apiSchema": {
                "s3": {
                    "s3BucketName": "pasti-agent-schemas",
                    "s3ObjectKey": "inventory_tools_schema.json",
                }
            },
            "actionState": "ENABLED",
        },
        {
            "actionGroupName": "procurement_tools",
            "description": "Membandingkan supplier, membuat PO, dan mengirim notifikasi",
            "actionGroupExecutor": {
                "lambda": procurement_lambda_arn,
            },
            "apiSchema": {
                "s3": {
                    "s3BucketName": "pasti-agent-schemas",
                    "s3ObjectKey": "procurement_tools_schema.json",
                }
            },
            "actionState": "ENABLED",
        },
    ]


def upload_schemas(s3_client, bucket_name):
    """Upload OpenAPI schemas to S3 for Bedrock Agent Action Groups."""
    inventory_schema = {
        "openapi": "3.0.0",
        "info": {"title": "Inventory Tools", "version": "1.0"},
        "paths": {
            "/inventory": {
                "get": {
                    "summary": "Ambil status inventaris semua produk",
                    "operationId": "get_inventory_status",
                    "responses": {"200": {"description": "Daftar produk dengan status stok"}}
                }
            },
            "/sales": {
                "get": {
                    "summary": "Ambil riwayat penjualan",
                    "operationId": "get_sales_history",
                    "parameters": [
                        {"name": "item_id", "in": "query", "schema": {"type": "string"},
                         "description": "ID produk (opsional)"},
                        {"name": "periode", "in": "query", "schema": {"type": "string"},
                         "description": "Periode format YYYY-MM-DD:YYYY-MM-DD (opsional)"},
                    ],
                    "responses": {"200": {"description": "Riwayat penjualan"}}
                }
            },
            "/forecast": {
                "get": {
                    "summary": "Prediksi kebutuhan item (deterministik)",
                    "operationId": "forecast_demand",
                    "description": "Menghitung prediksi kebutuhan, tanggal habis, dan rekomendasi jumlah order. Hasil dihitung kode secara deterministik, bukan oleh LLM.",
                    "parameters": [
                        {"name": "item_id", "in": "query", "required": True,
                         "schema": {"type": "string"},
                         "description": "ID produk yang ingin diprediksi"},
                    ],
                    "responses": {"200": {"description": "Prediksi kebutuhan"}}
                }
            },
        },
    }

    procurement_schema = {
        "openapi": "3.0.0",
        "info": {"title": "Procurement Tools", "version": "1.0"},
        "paths": {
            "/suppliers": {
                "get": {
                    "summary": "Ambil penawaran supplier untuk item",
                    "operationId": "get_supplier_offers",
                    "parameters": [
                        {"name": "item_id", "in": "query", "required": True,
                         "schema": {"type": "string"},
                         "description": "ID produk"},
                    ],
                    "responses": {"200": {"description": "Daftar supplier dengan harga dan lead time"}}
                }
            },
            "/orders": {
                "post": {
                    "summary": "Buat draf Purchase Order",
                    "operationId": "create_draft_po",
                    "description": "Membuat draf PO dan menghasilkan PDF. Status: draft.",
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "required": ["supplier_id", "items"],
                                    "properties": {
                                        "supplier_id": {"type": "string", "description": "ID supplier"},
                                        "items": {
                                            "type": "array",
                                            "items": {
                                                "type": "object",
                                                "required": ["product_id", "qty"],
                                                "properties": {
                                                    "product_id": {"type": "string"},
                                                    "qty": {"type": "number"},
                                                }
                                            },
                                            "description": "Daftar item yang dipesan",
                                        },
                                    }
                                }
                            }
                        }
                    },
                    "responses": {"200": {"description": "PO dibuat dengan po_id dan detail"}}
                }
            },
            "/notify": {
                "post": {
                    "summary": "Kirim notifikasi approval ke Telegram",
                    "operationId": "send_telegram_approval",
                    "description": "Mengirim draf PO ke owner via Telegram dengan tombol approve/edit/tolak",
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "required": ["po_id"],
                                    "properties": {
                                        "po_id": {"type": "string", "description": "ID Purchase Order"},
                                    }
                                }
                            }
                        }
                    },
                    "responses": {"200": {"description": "Status pengiriman"}}
                }
            },
        },
    }

    # Upload schemas to S3
    s3_client.put_object(
        Bucket=bucket_name,
        Key="inventory_tools_schema.json",
        Body=json.dumps(inventory_schema, indent=2),
        ContentType="application/json",
    )
    print(f"  Uploaded: inventory_tools_schema.json")

    s3_client.put_object(
        Bucket=bucket_name,
        Key="procurement_tools_schema.json",
        Body=json.dumps(procurement_schema, indent=2),
        ContentType="application/json",
    )
    print(f"  Uploaded: procurement_tools_schema.json")


def create_agent(bedrock_agent, action_groups, kb_id=None, model_id=DEFAULT_MODEL):
    """Create or update the PASTI Bedrock Agent."""
    kwargs = {
        "agentName": AGENT_NAME,
        "agentResourceRoleArn": f"arn:aws:iam::{boto3.client('sts').get_caller_identity()['Account']}:role/AmazonBedrockAgentRoleForPASTI",
        "description": AGENT_DESCRIPTION,
        "actionGroups": action_groups,
        "foundationModel": model_id,
        "instruction": SYSTEM_PROMPT,
        "idleSessionTTLInSeconds": 3600,
    }

    if kb_id:
        kwargs["knowledgeBases"] = [
            {
                "knowledgeBaseId": kb_id,
                "description": "Kebijakan reorder dan data supplier",
            }
        ]

    try:
        response = bedrock_agent.create_agent(**kwargs)
        agent_id = response["agent"]["agentId"]
        print(f"\nAgent created: {AGENT_NAME}")
        print(f"  Agent ID: {agent_id}")
        print(f"  Model: {model_id}")
    except bedrock_agent.exceptions.ConflictException:
        # Update existing
        list_resp = bedrock_agent.list_agents(agentNameFilter=AGENT_NAME)
        agent_id = list_resp["agentSummaries"][0]["agentId"]
        bedrock_agent.update_agent(
            agentId=agent_id,
            agentName=AGENT_NAME,
            actionGroups=action_groups,
            instruction=SYSTEM_PROMPT,
            foundationModel=model_id,
            description=AGENT_DESCRIPTION,
        )
        if kb_id:
            bedrock_agent.update_agent_knowledge_base(
                agentId=agent_id,
                knowledgeBases=[
                    {"knowledgeBaseId": kb_id, "description": "Kebijakan reorder dan data supplier"}
                ],
            )
        print(f"\nAgent updated: {AGENT_NAME}")
        print(f"  Agent ID: {agent_id}")

    # Prepare agent (creates aliases)
    print("\nPreparing agent (this may take 1-2 minutes)...")
    try:
        bedrock_agent.prepare_agent(agentId=agent_id)
        print("Agent prepared successfully.")
    except Exception as e:
        print(f"Prepare agent: {e}")
        print("Agent can still be invoked. Prepare may complete asynchronously.")

    return agent_id


def create_s3_bucket(s3_client, region):
    """Create S3 bucket for agent schemas and PO documents."""
    buckets = ["pasti-agent-schemas", "pasti-po-documents"]
    account_id = boto3.client("sts").get_caller_identity()["Account"]

    for bucket in buckets:
        try:
            if region == "us-east-1":
                s3_client.create_bucket(Bucket=bucket)
            else:
                s3_client.create_bucket(
                    Bucket=bucket,
                    CreateBucketConfiguration={"LocationConstraint": region},
                )
            print(f"Created S3 bucket: {bucket}")
        except s3_client.exceptions.BucketAlreadyOwnedByYou:
            print(f"S3 bucket '{bucket}' already exists")
        except s3_client.exceptions.BucketAlreadyExists:
            print(f"S3 bucket '{bucket}' already exists (different account)")


def main():
    parser = argparse.ArgumentParser(description="Create PASTI Bedrock Agent")
    parser.add_argument("--inventory-lambda", required=True, help="ARN Lambda inventory_tools")
    parser.add_argument("--procurement-lambda", required=True, help="ARN Lambda procurement_tools")
    parser.add_argument("--kb-id", default=None, help="Knowledge Base ID (opsional)")
    parser.add_argument("--model", default=DEFAULT_MODEL,
                        choices=["anthropic.claude-3-haiku-20240307-v1:0", "amazon.nova-pro"])
    parser.add_argument("--region", default="ap-southeast-3")
    args = parser.parse_args()

    s3_client = boto3.client("s3", region_name=args.region)
    bedrock_agent = boto3.client("bedrock-agent", region_name=args.region)

    # 1. Create S3 buckets
    print("=== Creating S3 buckets ===")
    create_s3_bucket(s3_client, args.region)

    # 2. Upload OpenAPI schemas
    print("\n=== Uploading Action Group schemas ===")
    upload_schemas(s3_client, "pasti-agent-schemas")

    # 3. Create Action Groups
    print("\n=== Creating Action Groups ===")
    action_groups = create_action_groups(args.inventory_lambda, args.procurement_lambda)
    print(f"  Action groups: {[ag['actionGroupName'] for ag in action_groups]}")

    # 4. Create Agent
    print("\n=== Creating Bedrock Agent ===")
    agent_id = create_agent(bedrock_agent, action_groups, args.kb_id, args.model)

    print(f"\n=== Done ===")
    print(f"Agent ID: {agent_id}")
    print(f"Invoke via: bedrock-agent-runtime with agentId={agent_id}")


if __name__ == "__main__":
    main()
