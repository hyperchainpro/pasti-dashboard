# -*- coding: utf-8 -*-
"""
PASTI - Seed Data Dummy Generator
Generates 60 hari data realistis untuk DynamoDB: products, sales, suppliers, orders.
Pola realistis: weekend naik 40%, gajian tanggal 25-5 naik, 1 item musiman.

Usage:
    python pasti_seed_data.py [--output-dir ./output] [--days 60]

Output:
    products.json, sales.json, suppliers.json, orders.json, agent_logs.json
    Or directly seed to DynamoDB if AWS credentials are configured.
"""
import json
import random
import math
import os
import argparse
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict, field
from typing import List, Optional

random.seed(42)

# ── Configuration ──
DEFAULT_DAYS = 60
START_DATE = datetime(2026, 7, 1)  # 1 Juli 2026


# ── Data Models ──
@dataclass
class Product:
    product_id: str
    nama: str
    unit: str
    stok_saat_ini: float
    stok_min: float
    safety_stock: float
    harga_jual: int  # Rupiah per unit


@dataclass
class Sale:
    sale_id: str
    product_id: str
    qty: float
    tanggal: str  # YYYY-MM-DD


@dataclass
class SupplierItem:
    product_id: str
    harga: int  # Rupiah per unit
    min_order: float


@dataclass
class Supplier:
    supplier_id: str
    nama: str
    lead_time_hari: int
    items: List[SupplierItem] = field(default_factory=list)


@dataclass
class OrderItem:
    product_id: str
    nama: str
    qty: float
    harga_satuan: int
    subtotal: int


@dataclass
class Order:
    po_id: str
    supplier_id: str
    supplier_nama: str
    items: List[OrderItem] = field(default_factory=list)
    total: int = 0
    status: str = "draft"
    dibuat_oleh: str = "agent"
    approved_at: Optional[str] = None


@dataclass
class AgentLog:
    trace_id: str
    waktu: str
    thoughts: List[str] = field(default_factory=list)
    tools_called: List[str] = field(default_factory=list)
    keputusan: str = ""
    hasil: str = ""


# ── Product Definitions (Warung Makan Bu Sari) ──
PRODUCTS_DEF = [
    {"product_id": "P01", "nama": "Beras Premium", "unit": "kg", "stok_saat_ini": 8, "stok_min": 10, "safety_stock": 5, "harga_jual": 14000},
    {"product_id": "P02", "nama": "Minyak Goreng", "unit": "liter", "stok_saat_ini": 3, "stok_min": 5, "safety_stock": 3, "harga_jual": 18000},
    {"product_id": "P03", "nama": "Ayam Potong", "unit": "ekor", "stok_saat_ini": 5, "stok_min": 8, "safety_stock": 4, "harga_jual": 35000},
    {"product_id": "P04", "nama": "Telur Ayam", "unit": "kg", "stok_saat_ini": 4, "stok_min": 5, "safety_stock": 2, "harga_jual": 28000},
    {"product_id": "P05", "nama": "Gula Pasir", "unit": "kg", "stok_saat_ini": 3, "stok_min": 4, "safety_stock": 2, "harga_jual": 16000},
    {"product_id": "P06", "nama": "Bawang Merah", "unit": "kg", "stok_saat_ini": 1.5, "stok_min": 3, "safety_stock": 1.5, "harga_jual": 45000},
    {"product_id": "P07", "nama": "Bawang Putih", "unit": "kg", "stok_saat_ini": 1, "stok_min": 2, "safety_stock": 1, "harga_jual": 40000},
    {"product_id": "P08", "nama": "Cabai Merah", "unit": "kg", "stok_saat_ini": 0.5, "stok_min": 2, "safety_stock": 1, "harga_jual": 55000},
    {"product_id": "P09", "nama": "Kecap Manis", "unit": "botol", "stok_saat_ini": 4, "stok_min": 3, "safety_stock": 2, "harga_jual": 12000},
    {"product_id": "P10", "nama": "Tepung Terigu", "unit": "kg", "stok_saat_ini": 6, "stok_min": 4, "safety_stock": 2, "harga_jual": 10000},
]

# ── Base daily consumption (avg units sold per day) ──
# Mapped to each product to generate realistic sales patterns
BASE_DAILY_USAGE = {
    "P01": 2.5,   # Beras: 2.5 kg/hari
    "P02": 1.5,   # Minyak goreng: 1.5 L/hari
    "P03": 6.0,   # Ayam: 6 ekor/hari
    "P04": 2.0,   # Telur: 2 kg/hari
    "P05": 0.8,   # Gula: 0.8 kg/hari
    "P06": 1.2,   # Bawang merah: 1.2 kg/hari
    "P07": 0.6,   # Bawang putih: 0.6 kg/hari
    "P08": 0.8,   # Cabai: 0.8 kg/hari
    "P09": 0.5,   # Kecap: 0.5 botol/hari
    "P10": 1.0,   # Tepung: 1 kg/hari
}

# ── Supplier Definitions ──
SUPPLIERS_DEF = [
    {
        "supplier_id": "S01",
        "nama": "Pasar Induk Kramat Jati",
        "lead_time_hari": 1,
        "items": {
            "P01": {"harga": 12500, "min_order": 5},
            "P02": {"harga": 16000, "min_order": 2},
            "P03": {"harga": 30000, "min_order": 5},
            "P04": {"harga": 24000, "min_order": 2},
            "P06": {"harga": 38000, "min_order": 1},
            "P07": {"harga": 35000, "min_order": 1},
            "P08": {"harga": 45000, "min_order": 1},
        }
    },
    {
        "supplier_id": "S02",
        "nama": "Toko Sembako Pak Hadi",
        "lead_time_hari": 0,
        "items": {
            "P01": {"harga": 13500, "min_order": 10},
            "P02": {"harga": 17500, "min_order": 2},
            "P04": {"harga": 26000, "min_order": 2},
            "P05": {"harga": 14000, "min_order": 2},
            "P09": {"harga": 10000, "min_order": 6},
            "P10": {"harga": 9000, "min_order": 5},
        }
    },
    {
        "supplier_id": "S03",
        "nama": "Distributor Ayam Sejahtera",
        "lead_time_hari": 1,
        "items": {
            "P03": {"harga": 28000, "min_order": 10},
        }
    },
]


def generate_sales(products: List[Product], days: int, start_date: datetime) -> List[Sale]:
    """
    Generate realistic sales data with:
    - Weekend boost (+40% Fri-Sat)
    - Payday boost (tgl 25-5, +25%)
    - Random daily variation (+/- 20%)
    - Occasional stockout days (0 sales for item)
    - One seasonal item (P08 Cabai) spikes during certain periods
    """
    sales = []
    sale_counter = 0

    for day_offset in range(days):
        current_date = start_date + timedelta(days=day_offset)
        date_str = current_date.strftime("%Y-%m-%d")
        day_of_week = current_date.weekday()  # 0=Mon, 6=Sun
        day_of_month = current_date.day

        # Determine multipliers
        weekend_mult = 1.0
        if day_of_week in (4, 5, 6):  # Fri, Sat, Sun
            weekend_mult = 1.4

        payday_mult = 1.0
        if 25 <= day_of_month <= 31 or 1 <= day_of_month <= 5:
            payday_mult = 1.25

        # Seasonal: Cabai mahal & jarang di pertengahan bulan
        cabai_mult = 1.0
        if 10 <= day_of_month <= 20:
            cabai_mult = 0.5  # panen cabai, stok melimpah

        for prod in products:
            base_qty = BASE_DAILY_USAGE.get(prod.product_id, 1.0)

            # Apply multipliers
            qty = base_qty * weekend_mult * payday_mult

            # Seasonal for cabai
            if prod.product_id == "P08":
                qty *= cabai_mult

            # Random daily variation (+/- 20%)
            variation = random.gauss(1.0, 0.15)  # 15% std dev
            variation = max(0.3, min(1.5, variation))  # clamp
            qty *= variation

            # 5% chance of stockout (very low sales day)
            if random.random() < 0.05:
                qty *= 0.2

            # Round appropriately
            if prod.unit in ("ekor", "botol"):
                qty = max(0, round(qty))
            else:
                qty = max(0, round(qty, 1))

            if qty > 0:
                sale_counter += 1
                sale = Sale(
                    sale_id=f"SL{sale_counter:05d}",
                    product_id=prod.product_id,
                    qty=qty,
                    tanggal=date_str
                )
                sales.append(sale)

    return sales


def build_suppliers() -> List[dict]:
    """Build supplier data in DynamoDB-compatible format."""
    suppliers = []
    for s_def in SUPPLIERS_DEF:
        items = []
        for pid, item_data in s_def["items"].items():
            items.append({
                "product_id": pid,
                "harga": item_data["harga"],
                "min_order": item_data["min_order"]
            })
        suppliers.append({
            "supplier_id": s_def["supplier_id"],
            "nama": s_def["nama"],
            "lead_time_hari": s_def["lead_time_hari"],
            "items": items
        })
    return suppliers


def generate_sample_orders(suppliers: List[dict], products: List[Product],
                           sales: List[Sale]) -> List[dict]:
    """Generate 3-5 sample past orders for realism."""
    orders = []
    order_dates = [
        datetime(2026, 7, 10),
        datetime(2026, 7, 20),
        datetime(2026, 8, 1),
        datetime(2026, 8, 15),
    ]

    supplier_items_map = {}
    for s in suppliers:
        supplier_items_map[s["supplier_id"]] = {
            item["product_id"]: item for item in s["items"]
        }

    for i, order_date in enumerate(order_dates):
        # Pick a supplier that has the most needed items
        supplier = suppliers[i % len(suppliers)]
        sid = supplier["supplier_id"]
        sname = supplier["nama"]
        items_map = supplier_items_map[sid]

        # Pick 2-4 random items from this supplier
        available_pids = list(items_map.keys())
        chosen = random.sample(available_pids, min(random.randint(2, 4), len(available_pids)))

        order_items = []
        total = 0
        for pid in chosen:
            item_info = items_map[pid]
            prod = next((p for p in products if p.product_id == pid), None)
            if not prod:
                continue
            qty = max(item_info["min_order"], random.randint(1, 3) * item_info["min_order"])
            subtotal = qty * item_info["harga"]
            total += subtotal
            order_items.append({
                "product_id": pid,
                "nama": prod.nama,
                "qty": qty,
                "harga_satuan": item_info["harga"],
                "subtotal": subtotal
            })

        statuses = ["approved", "approved", "approved", "draft"]
        approved_at = order_date.strftime("%Y-%m-%d") if statuses[i] == "approved" else None

        orders.append({
            "po_id": f"PO{i+1:04d}",
            "supplier_id": sid,
            "supplier_nama": sname,
            "items": order_items,
            "total": total,
            "status": statuses[i],
            "dibuat_oleh": "agent",
            "approved_at": approved_at
        })

    return orders


def generate_sample_agent_log() -> dict:
    """Generate one sample agent log entry showing the reasoning trace."""
    return {
        "trace_id": "TR20260815001",
        "waktu": "2026-08-15T20:00:00+07:00",
        "thoughts": [
            "Memulai agent run harian. Membaca status inventaris dan riwayat penjualan 30 hari terakhir.",
            "Bawang Merah (P06): stok 1.5 kg, di bawah stok minimum 3 kg. Rata-rata penjualan 1.2 kg/hari, weekend naik 40%. Dengan safety stock 1.5 kg, estimasi habis dalam 1 hari. Status: KRITIS.",
            "Ayam Potong (P03): stok 5 ekor, di bawah stok minimum 8 ekor. Rata-rata 6 ekor/hari. Estimasi habis dalam <1 hari. Status: KRITIS.",
            "Minyak Goreng (P02): stok 3 liter, di bawah stok minimum 5 liter. Rata-rata 1.5 L/hari. Status: PERINGATAN.",
            "Membandingkan supplier untuk Bawang Merah: S01 (Rp38.000/kg, lead 1 hari) vs tidak tersedia di S02/S03. Memilih S01.",
            "Membandingkan supplier untuk Ayam: S01 (Rp30.000/ekor, min 5) vs S03 (Rp28.000/ekor, min 10). Total terbaik S03 jika order 10 ekor, tapi S01 lebih fleksibel. Memilih S01 (5 ekor dulu, darurat).",
            "Self-check: Total draf PO = Rp490.000. Budget harian owner Rp1.000.000. Masih dalam batas. Tidak ada item terlarang. OK.",
            "Draf PO dibuat. Mengirim notifikasi ke Telegram untuk approval owner."
        ],
        "tools_called": [
            "get_inventory_status",
            "get_sales_history",
            "forecast_demand",
            "get_supplier_offers",
            "create_draft_po",
            "send_telegram_approval"
        ],
        "keputusan": "Membuat PO ke S01 (Pasar Induk Kramat Jati) untuk 3 item kritis: Bawang Merah, Ayam Potong, Minyak Goreng.",
        "hasil": "PO terkirim ke Telegram. Menunggu approval owner."
    }


def main():
    parser = argparse.ArgumentParser(description="PASTI Seed Data Generator")
    parser.add_argument("--output-dir", default="./output",
                        help="Directory to save JSON files (default: ./output)")
    parser.add_argument("--days", type=int, default=DEFAULT_DAYS,
                        help=f"Number of days to generate sales data (default: {DEFAULT_DAYS})")
    args = parser.parse_args()

    os.makedirs(args.output_dir, exist_ok=True)

    # Build products
    products = [Product(**p) for p in PRODUCTS_DEF]
    products_json = [asdict(p) for p in products]

    # Generate sales
    sales = generate_sales(products, args.days, START_DATE)
    sales_json = [asdict(s) for s in sales]

    # Build suppliers
    suppliers_json = build_suppliers()

    # Generate sample orders
    orders_json = generate_sample_orders(suppliers_json, products, sales)

    # Generate sample agent log
    agent_log_json = generate_sample_agent_log()

    # Save all
    files = {
        "products.json": products_json,
        "sales.json": sales_json,
        "suppliers.json": suppliers_json,
        "orders.json": orders_json,
        "agent_logs.json": [agent_log_json],
    }

    for filename, data in files.items():
        filepath = os.path.join(args.output_dir, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"  Created: {filepath} ({len(data) if isinstance(data, list) else 'N/A'} records)")

    # Summary stats
    print(f"\n=== Seed Data Summary ===")
    print(f"  Products:    {len(products)}")
    print(f"  Sales:       {len(sales)} records over {args.days} days")
    print(f"  Suppliers:   {len(suppliers_json)}")
    print(f"  Orders:      {len(orders_json)}")
    print(f"  Agent Logs:  1 sample trace")
    print(f"  Period:      {START_DATE.strftime('%Y-%m-%d')} to {(START_DATE + timedelta(days=args.days-1)).strftime('%Y-%m-%d')}")
    print(f"  Output:      {os.path.abspath(args.output_dir)}")

    # DynamoDB seed script (commented, for production use)
    dynamo_hint = f"""
\n=== DynamoDB Seed Command (if AWS CLI configured) ===
# First, create tables:
aws dynamodb create-table --table-name products --attribute-definitions AttributeName=product_id,AttributeType=S --key-schema AttributeName=product_id,KeyType=HASH --billing-mode PAY_PER_REQUEST --region ap-southeast-3

# Then seed (example for products):
# python -c "
# import boto3, json
# db = boto3.resource('dynamodb', region_name='ap-southeast-3')
# table = db.Table('products')
# with open('{args.output_dir}/products.json') as f:
#     for item in json.load(f):
#         table.put_item(Item=item)
# print('Seeded products table')
# "
"""
    print(dynamo_hint)


if __name__ == "__main__":
    main()
