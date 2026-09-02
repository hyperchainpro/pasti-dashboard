# PASTI - Proactive Agentic Supply-chain Tracking & Inventory

AI agent otonom yang menjadi juru pembelian harian untuk UMKM F&B Indonesia.

## Arsitektur

```
EventBridge (20:00) -> Bedrock Agent -> Lambda Tools -> DynamoDB / S3 / Telegram
```

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Setup AWS infrastructure (DynamoDB, S3, IAM, Budget Alarm)
python scripts/create_dynamodb_tables.py
python scripts/create_budget_alarm.py

# 3. Seed data dummy (60 hari)
python scripts/seed_data.py --days 60

# 4. Deploy Lambda functions
sam build && sam deploy

# 5. Setup Bedrock Agent
python bedrock_agent/create_agent.py

# 6. Setup EventBridge Scheduler
python scripts/create_scheduler.py

# 7. Run Streamlit dashboard (opsional)
streamlit run streamlit/app.py
```

## Project Structure

```
pasti-project/
lambda/
  inventory_tools/       # Lambda: get_inventory_status, get_sales_history, forecast_demand
  procurement_tools/     # Lambda: get_supplier_offers, create_draft_po, send_telegram_approval
  telegram_handler/       # Lambda: webhook Telegram (approval callback)
bedrock_agent/
  create_agent.py        # Script buat Bedrock Agent + Action Groups
  system_prompt.txt      # System prompt template
streamlit/
  app.py                # Dashboard web
scripts/
  create_dynamodb_tables.py  # Buat 5 tabel DynamoDB
  create_budget_alarm.py     # AWS Budget alarm $5/bulan
  create_scheduler.py        # EventBridge scheduler harian 20:00
  seed_data.py               # Generator data dummy 60 hari
terraform/
  main.tf                  # Infrastructure as Code (opsional)
requirements.txt
README.md
```

## Data Model (DynamoDB)

| Table | PK | Fungsi |
|-------|----|--------|
| products | product_id (S) | Katalog bahan baku |
| sales | sale_id (S) | Riwayat penjualan |
| suppliers | supplier_id (S) | Data supplier |
| orders | po_id (S) | Purchase Order |
| agent_logs | trace_id (S) | Log reasoning agent |
| owner_preferences | pref_key (S) | Instruksi owner (memory) |

## Biaya Estimasi

| Layanan | Biaya |
|---------|-------|
| Lambda + DynamoDB + EventBridge + API Gateway + S3 | Rp0 (free tier) |
| Bedrock (~600K token/bulan) | ~Rp15.000-30.000 |
| **Total** | **< Rp50.000/bulan** |

## Tim

- AI Engineer: Bedrock Agent, system prompt, testing
- Backend Engineer: Lambda, DynamoDB, Telegram bot
- Product & Pitch: PRD, demo scenario, pitch deck

## Timeline

| Fase | Tanggal | Deliverable |
|-------|---------|-------------|
| Sprint 1 | Minggu 1 Okt | Bedrock Agent + 6 tools jalan lokal |
| Sprint 2 | Minggu 2 Okt | Telegram bot + approval flow + PO PDF |
| Sprint 3 | Minggu 3 Okt | Streamlit + trace visualization |
| Sprint 4 | Minggu 4 Okt | Video backup, latihan pitch |
| Demo Day | 31 Okt | Live demo + Q&A |
