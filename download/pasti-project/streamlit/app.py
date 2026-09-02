# -*- coding: utf-8 -*-
"""
PASTI - Streamlit Dashboard
Dashboard monitoring stok, log reasoning agent, dan riwayat PO.

Usage:
    streamlit run streamlit/app.py

Environment (opsional untuk deploy AWS):
    AWS_REGION, API_ENDPOINT
"""
import streamlit as st
import json
import os
from datetime import datetime, timedelta

# ── Page Config ──
st.set_page_config(
    page_title="PASTI Dashboard",
    page_icon="",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Custom CSS ──
st.markdown("""
<style>
    .status-kritis { background: #fde8e8; color: #991b1b; padding: 4px 12px; border-radius: 4px; font-weight: 600; }
    .status-peringatan { background: #fef3cd; color: #92400e; padding: 4px 12px; border-radius: 4px; font-weight: 600; }
    .status-aman { background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 4px; font-weight: 600; }
    .metric-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; text-align: center; }
    .metric-value { font-size: 28px; font-weight: 700; color: #1f2122; }
    .metric-label { font-size: 12px; color: #787f82; margin-top: 4px; }
    .trace-step { border-left: 3px solid #378ab3; padding-left: 12px; margin-bottom: 8px; }
</style>
""", unsafe_allow_html=True)


# ── Dummy Data Fallback ──
# Jika tidak ada koneksi AWS, gunakan data lokal
@st.cache_data
def load_local_data():
    """Load data dari file lokal (untuk demo tanpa AWS)."""
    data_dir = os.path.join(os.path.dirname(__file__), "..", "scripts", "output")

    def _load_json(filename, default=None):
        path = os.path.join(data_dir, filename)
        if os.path.exists(path):
            with open(path, "r") as f:
                return json.load(f)
        return default or []

    return {
        "products": _load_json("products.json"),
        "sales": _load_json("sales.json"),
        "suppliers": _load_json("suppliers.json"),
        "orders": _load_json("orders.json"),
        "agent_logs": _load_json("agent_logs.json"),
    }


def load_data():
    """Load data dari API atau fallback ke lokal."""
    # TODO: Ganti dengan API call ke backend Lambda
    # api_endpoint = os.environ.get("API_ENDPOINT", "http://localhost:8000")
    return load_local_data()


data = load_data()
products = data.get("products", [])
sales = data.get("sales", [])
suppliers = data.get("suppliers", [])
orders = data.get("orders", [])
agent_logs = data.get("agent_logs", [])


# ── Sidebar ──
st.sidebar.title("PASTI")
st.sidebar.caption("Proactive Agentic Supply-chain Tracking")

page = st.sidebar.radio("Navigasi", [
    "Dashboard Utama",
    "Stok & Produk",
    "Riwayat Penjualan",
    "Riwayat PO",
    "Agent Trace Log",
    "Pengaturan Owner",
])

st.sidebar.markdown("---")
st.sidebar.markdown("**Tim:** 3 orang")
st.sidebar.markdown("**Platform:** AWS Bedrock + Lambda")
st.sidebar.markdown(f"**Last Update:** {datetime.now().strftime('%d %b %Y, %H:%M')}")


# ── Helper ──
def status_badge(status):
    cls = f"status-{status.lower()}"
    return f'<span class="{cls}">{status}</span>'


def format_rupiah(amount):
    return f"Rp {amount:,.0f}".replace(",", ".")


# ══════════════════════════════════════════
# PAGE: Dashboard Utama
# ══════════════════════════════════════════
if page == "Dashboard Utama":
    st.header("Dashboard Utama")

    # Metrics row
    col1, col2, col3, col4 = st.columns(4)

    total_products = len(products)
    critical = sum(1 for p in products if p.get("stok_saat_ini", 0) < p.get("stok_min", 0))
    warning = sum(
        1 for p in products
        if p.get("stok_min", 0) <= p.get("stok_saat_ini", 0) < p.get("stok_min", 0) + p.get("safety_stock", 0)
    )
    pending_orders = sum(1 for o in orders if o.get("status") == "draft")

    with col1:
        st.markdown(f'<div class="metric-card"><div class="metric-value">{total_products}</div><div class="metric-label">Total Produk</div></div>', unsafe_allow_html=True)
    with col2:
        st.markdown(f'<div class="metric-card"><div class="metric-value" style="color:#991b1b">{critical}</div><div class="metric-label">Stok Kritis</div></div>', unsafe_allow_html=True)
    with col3:
        st.markdown(f'<div class="metric-card"><div class="metric-value" style="color:#92400e">{warning}</div><div class="metric-label">Peringatan</div></div>', unsafe_allow_html=True)
    with col4:
        st.markdown(f'<div class="metric-card"><div class="metric-value" style="color:#378ab3">{pending_orders}</div><div class="metric-label">PO Menunggu</div></div>', unsafe_allow_html=True)

    st.markdown("")

    # Two columns: Stok overview + Recent orders
    col_left, col_right = st.columns([1.2, 1])

    with col_left:
        st.subheader("Status Stok Saat Ini")
        if products:
            table_data = []
            for p in sorted(products, key=lambda x: x.get("stok_saat_ini", 0)):
                if p.get("stok_saat_ini", 0) < p.get("stok_min", 0):
                    s = "KRITIS"
                elif p.get("stok_saat_ini", 0) < p.get("stok_min", 0) + p.get("safety_stock", 0):
                    s = "PERINGATAN"
                else:
                    s = "AMAN"
                table_data.append({
                    "Produk": p["nama"],
                    "Stok": f"{p['stok_saat_ini']} {p['unit']}",
                    "Min": f"{p['stok_min']} {p['unit']}",
                    "Status": s,
                })
            st.dataframe(table_data, use_container_width=True, hide_index=True)
        else:
            st.info("Belum ada data produk.")

    with col_right:
        st.subheader("PO Terbaru")
        if orders:
            for o in reversed(orders[-5:]):
                with st.container():
                    st.markdown(f"**{o['po_id']}** - {o.get('supplier_nama', '')}")
                    st.caption(f"Total: {format_rupiah(o.get('total', 0))} | Status: {o.get('status', 'draft')}")
                    st.markdown("")
        else:
            st.info("Belum ada data PO.")


# ══════════════════════════════════════════
# PAGE: Stok & Produk
# ══════════════════════════════════════════
elif page == "Stok & Produk":
    st.header("Stok & Produk")

    if products:
        for p in products:
            stok = p.get("stok_saat_ini", 0)
            stok_min = p.get("stok_min", 0)
            safety = p.get("safety_stock", 0)

            if stok < stok_min:
                bar_color = "#ef4444"
            elif stok < stok_min + safety:
                bar_color = "#f59e0b"
            else:
                bar_color = "#22c55e"

            col1, col2 = st.columns([3, 1])
            with col1:
                st.markdown(f"**{p['nama']}** ({p['unit']})")
                st.progress(min(stok / (stok_min * 3), 1.0))
                st.caption(f"Stok: {stok} | Min: {stok_min} | Safety: {safety} | Harga Jual: {format_rupiah(p.get('harga_jual', 0))}/{p['unit']}")
            with col2:
                st.metric("Stok Saat Ini", f"{stok} {p['unit']}")
            st.markdown("")
    else:
        st.info("Belum ada data produk. Jalankan seed_data.py terlebih dahulu.")


# ══════════════════════════════════════════
# PAGE: Riwayat Penjualan
# ══════════════════════════════════════════
elif page == "Riwayat Penjualan":
    st.header("Riwayat Penjualan")

    if sales:
        # Date filter
        dates = sorted(set(s["tanggal"] for s in sales))
        col1, col2 = st.columns(2)
        with col1:
            date_start = st.date_input("Dari", value=datetime.strptime(dates[0], "%Y-%m-%d").date())
        with col2:
            date_end = st.date_input("Sampai", value=datetime.strptime(dates[-1], "%Y-%m-%d").date())

        filtered = [
            s for s in sales
            if date_start.strftime("%Y-%m-%d") <= s["tanggal"] <= date_end.strftime("%Y-%m-%d")
        ]

        st.markdown(f"**{len(filtered)} transaksi** dalam periode ini")

        # Simple summary
        from collections import defaultdict
        summary = defaultdict(float)
        for s in filtered:
            summary[s["product_id"]] += s["qty"]

        if summary:
            st.subheader("Total Penjualan per Produk")
            product_map = {p["product_id"]: p["nama"] for p in products}
            for pid, total_qty in sorted(summary.items(), key=lambda x: -x[1]):
                nama = product_map.get(pid, pid)
                st.write(f"{nama}: {total_qty:.1f} unit")
    else:
        st.info("Belum ada data penjualan.")


# ══════════════════════════════════════════
# PAGE: Riwayat PO
# ══════════════════════════════════════════
elif page == "Riwayat PO":
    st.header("Riwayat Purchase Order")

    if orders:
        for o in reversed(orders):
            with st.expander(f"{o['po_id']} - {o.get('supplier_nama', '')} [{o.get('status', 'draft').upper()}]"):
                col1, col2 = st.columns(2)
                with col1:
                    st.write(f"**Supplier:** {o.get('supplier_nama', '')}")
                    st.write(f"**Status:** {o.get('status', 'draft')}")
                    st.write(f"**Dibuat oleh:** {o.get('dibuat_oleh', 'agent')}")
                with col2:
                    st.write(f"**Total:** {format_rupiah(o.get('total', 0))}")
                    st.write(f"**Approved:** {o.get('approved_at', '-')}")

                if o.get("items"):
                    st.markdown("**Items:**")
                    for item in o["items"]:
                        st.write(f"  - {item['nama']}: {item['qty']} x {format_rupiah(item['harga_satuan'])} = {format_rupiah(item['subtotal'])}")
    else:
        st.info("Belum ada data PO.")


# ══════════════════════════════════════════
# PAGE: Agent Trace Log
# ══════════════════════════════════════════
elif page == "Agent Trace Log":
    st.header("Agent Trace Log")
    st.caption("Proses berpikir agent dari run terakhir")

    if agent_logs:
        log = agent_logs[-1]  # Latest
        st.markdown(f"**Trace ID:** {log.get('trace_id', '-')}")
        st.markdown(f"**Waktu:** {log.get('waktu', '-')}")
        st.markdown(f"**Keputusan:** {log.get('keputusan', '-')}")
        st.markdown(f"**Hasil:** {log.get('hasil', '-')}")

        st.markdown("")
        st.subheader("Tools yang Dipanggil")
        for tool in log.get("tools_called", []):
            st.code(tool, language=None)

        st.markdown("")
        st.subheader("Proses Berpikir (Thoughts)")
        for i, thought in enumerate(log.get("thoughts", []), 1):
            st.markdown(f'<div class="trace-step"><b>Step {i}:</b> {thought}</div>', unsafe_allow_html=True)
    else:
        st.info("Belum ada log agent. Jalankan agent loop terlebih dahulu.")


# ══════════════════════════════════════════
# PAGE: Pengaturan Owner
# ══════════════════════════════════════════
elif page == "Pengaturan Owner":
    st.header("Pengaturan Owner")
    st.caption("Instruksi yang akan diikuti agent saat berjalan")

    st.subheader("Instruksi Khusus")
    instructions = st.text_area(
        "Instruksi untuk agent",
        value="Jangan order ayam di hari Selasa.\nMax belanja per hari Rp 500.000.",
        height=150,
        help="Setiap baris = satu instruksi. Agent akan membaca ini sebelum membuat keputusan.",
    )

    st.subheader("Budget Harian")
    budget = st.number_input("Maksimal belanja per hari (Rp)", value=1000000, step=50000, format="%d")

    st.subheader("Item Terlarang")
    forbidden = st.multiselect(
        "Item yang tidak boleh diorder oleh agent",
        options=[p["nama"] for p in products],
        help="Agent tidak akan pernah menyertakan item ini dalam draf PO.",
    )

    if st.button("Simpan Pengaturan", type="primary"):
        # TODO: Save to DynamoDB owner_preferences table
        st.success("Pengaturan tersimpan! Agent akan mengikuti instruksi baru pada run berikutnya.")
