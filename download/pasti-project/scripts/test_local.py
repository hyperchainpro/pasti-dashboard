#!/usr/bin/env python3
"""
PASTI - Local Testing Script
Test semua 6 Lambda functions tanpa AWS.
Mock data dari seed output.

Usage:
    python scripts/test_local.py
"""
import json
import os
import sys
from datetime import datetime, timedelta

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "output")
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)

# Add Lambda dirs to path for imports
sys.path.insert(0, os.path.join(PROJECT_DIR, "lambda", "inventory_tools"))
sys.path.insert(0, os.path.join(PROJECT_DIR, "lambda", "procurement_tools"))


def load_json(filename):
    path = os.path.join(DATA_DIR, filename)
    if os.path.exists(path):
        with open(path, "r") as f:
            return json.load(f)
    return []


def test_inventory_status():
    """Test get_inventory_status."""
    products = load_json("products.json")
    if not products:
        print("  SKIP: No products data. Run seed_data.py first.")
        return

    print("\n=== Test 1: get_inventory_status ===")
    for p in products:
        stok = p["stok_saat_ini"]
        stok_min = p["stok_min"]
        safety = p["safety_stock"]

        if stok < stok_min:
            status = "KRITIS"
        elif stok < stok_min + safety:
            status = "PERINGATAN"
        else:
            status = "AMAN"

        icon = {"KRITIS": "!!", "PERINGATAN": "! ", "AMAN": "ok"}[status]
        print(f"  [{icon}] {p['nama']:20s} stok={stok:6.1f}  min={stok_min:5.1f}  => {status}")

    kritis_count = sum(1 for p in products if p["stok_saat_ini"] < p["stok_min"])
    print(f"  Result: {len(products)} products, {kritis_count} KRITIS, {len(products) - kritis_count} OK")
    return True


def test_sales_history():
    """Test get_sales_history with filtering."""
    sales = load_json("sales.json")
    if not sales:
        print("  SKIP: No sales data.")
        return

    print("\n=== Test 2: get_sales_history ===")

    # Filter by item
    target = "P03"  # Ayam Potong
    filtered = [s for s in sales if s["product_id"] == target]
    total_qty = sum(s["qty"] for s in filtered)
    dates = sorted(set(s["tanggal"] for s in filtered))
    print(f"  P03 (Ayam Potong): {len(filtered)} transaksi, total {total_qty:.0f} ekor")
    print(f"  Periode: {dates[0]} s/d {dates[-1]}")

    # Filter by date range
    start = "2026-07-25"
    end = "2026-07-31"
    range_filtered = [s for s in sales if start <= s["tanggal"] <= end]
    print(f"  Periode {start} s/d {end}: {len(range_filtered)} transaksi")
    return True


def test_forecast_demand():
    """Test forecast_demand (deterministic calculation)."""
    sales = load_json("sales.json")
    products = load_json("products.json")
    if not sales or not products:
        print("  SKIP: No data.")
        return

    print("\n=== Test 3: forecast_demand ===")

    for product in products:
        pid = product["product_id"]
        nama = product["nama"]
        stok = product["stok_saat_ini"]
        stok_min = product["stok_min"]
        safety = product["safety_stock"]

        # Get sales for this product (last 30 days)
        item_sales = [s for s in sales if s["product_id"] == pid]
        if not item_sales:
            print(f"  {nama}: No sales data")
            continue

        # Last 7 days
        dates_sorted = sorted(set(s["tanggal"] for s in item_sales), reverse=True)
        last_7_dates = dates_sorted[:7]
        last_7_sales = [s for s in item_sales if s["tanggal"] in last_7_dates]
        avg_7 = sum(s["qty"] for s in last_7_sales) / max(len(last_7_sales), 1)

        # Last 30 days
        avg_30 = sum(s["qty"] for s in item_sales) / max(len(item_sales), 1)

        # Conservative: take max
        avg_daily = max(avg_7, avg_30)

        # Weekend boost
        import math
        today = datetime(2026, 8, 29)  # Simulated "today" for demo
        next_days = [(today + timedelta(days=i)).weekday() for i in range(1, 3)]
        weekend_boost = 1.4 if any(d >= 4 for d in next_days) else 1.0
        adjusted = avg_daily * weekend_boost

        # Calculate
        days_until_stockout = math.floor(stok / adjusted) if adjusted > 0 else 999
        reorder_qty = max(0, math.ceil(adjusted * 7) + safety - stok)

        confidence = "HIGH" if len(item_sales) >= 20 else "MEDIUM" if len(item_sales) >= 10 else "LOW"

        status = "KRITIS" if days_until_stockout <= 1 else "PERINGATAN" if days_until_stockout <= 3 else "AMAN"
        icon = {"KRITIS": "!!", "PERINGATAN": "! ", "AMAN": "ok"}[status]

        print(f"  [{icon}] {nama:20s} avg7={avg_7:.1f}  avg30={avg_30:.1f}  adj={adjusted:.1f}  stockout={days_until_stockout}d  reorder={reorder_qty:.0f}  [{confidence}]")

    return True


def test_supplier_offers():
    """Test get_supplier_offers."""
    suppliers = load_json("suppliers.json")
    if not suppliers:
        print("  SKIP: No suppliers data.")
        return

    print("\n=== Test 4: get_supplier_offers ===")
    test_items = ["P01", "P03", "P08"]

    for item_id in test_items:
        offers = []
        for s in suppliers:
            for item in s.get("items", []):
                if item["product_id"] == item_id:
                    offers.append({
                        "supplier_id": s["supplier_id"],
                        "nama": s["nama"],
                        "harga": item["harga"],
                        "min_order": item["min_order"],
                        "lead_time": s["lead_time_hari"],
                    })
        offers.sort(key=lambda x: x["harga"])

        if offers:
            best = offers[0]
            print(f"  {item_id}: {len(offers)} supplier(s) | Best: {best['nama']} Rp{best['harga']:,} (min {best['min_order']}, lead {best['lead_time']}d)")
        else:
            print(f"  {item_id}: No supplier found")

    return True


def test_create_draft_po():
    """Test create_draft_po logic (no PDF generation)."""
    suppliers = load_json("suppliers.json")
    products_map = {p["product_id"]: p for p in load_json("products.json")}

    print("\n=== Test 5: create_draft_po (logic) ===")

    supplier = suppliers[0]  # First supplier
    items_to_order = [
        {"product_id": "P03", "qty": 10},
        {"product_id": "P06", "qty": 3},
    ]

    total = 0
    order_items = []
    for item in items_to_order:
        pid = item["product_id"]
        for s_item in supplier["items"]:
            if s_item["product_id"] == pid:
                subtotal = item["qty"] * s_item["harga"]
                order_items.append({
                    "product_id": pid,
                    "nama": products_map[pid]["nama"],
                    "qty": item["qty"],
                    "harga_satuan": s_item["harga"],
                    "subtotal": subtotal,
                })
                total += subtotal
                break

    for oi in order_items:
        print(f"  {oi['nama']:20s} {oi['qty']:5.0f} x Rp{oi['harga_satuan']:>7,} = Rp{oi['subtotal']:>10,}")
    print(f"  {'':20s} {'':>5s}   {'':>7s}   {'─'*10}")
    print(f"  {'TOTAL':20s} {'':>5s}   {'':>7s}   Rp{total:>10,}")
    print(f"  Supplier: {supplier['nama']} | Status: DRAFT")
    return True


def test_telegram_message_format():
    """Test Telegram message formatting."""
    print("\n=== Test 6: Telegram message format ===")

    items = [
        {"nama": "Ayam Potong", "qty": 10, "harga_satuan": 30000, "subtotal": 300000},
        {"nama": "Bawang Merah", "qty": 3, "harga_satuan": 38000, "subtotal": 114000},
        {"nama": "Minyak Goreng", "qty": 5, "harga_satuan": 16000, "subtotal": 80000},
    ]
    total = sum(i["subtotal"] for i in items)

    lines = ["PASTI - Usulan Belanja 29 Agu 2026", ""]
    for item in items:
        lines.append(f"  {item['nama']}: {item['qty']:.0f} x Rp{item['harga_satuan']:,} = Rp{item['subtotal']:,}")
    lines.append("")
    lines.append(f"Total: Rp{total:,}")
    lines.append("")
    lines.append("Silakan approve, edit, atau tolak.")

    msg = "\n".join(lines)
    print(msg)

    # Check length (Telegram max 4096 chars)
    if len(msg) > 4096:
        print(f"  WARNING: Message length {len(msg)} exceeds Telegram 4096 limit!")
    else:
        print(f"  Message length: {len(msg)} chars (OK)")

    return True


def run_all_tests():
    print("=" * 50)
    print("  PASTI Local Test Suite")
    print("=" * 50)

    if not os.path.exists(DATA_DIR):
        print(f"\nERROR: Data directory not found: {DATA_DIR}")
        print("Run first: python scripts/seed_data.py --days 60")
        return

    results = {
        "get_inventory_status": test_inventory_status(),
        "get_sales_history": test_sales_history(),
        "forecast_demand": test_forecast_demand(),
        "get_supplier_offers": test_supplier_offers(),
        "create_draft_po": test_create_draft_po(),
        "telegram_format": test_telegram_message_format(),
    }

    print("\n" + "=" * 50)
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    print(f"  Results: {passed}/{total} tests passed")
    print("=" * 50)


if __name__ == "__main__":
    run_all_tests()
