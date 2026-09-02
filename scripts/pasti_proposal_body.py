# -*- coding: utf-8 -*-
"""
PASTI Proposal Body — 2-page ReportLab PDF (pages 2-3 of 3-page proposal)
Sections 1-7 from PRD, Indonesian language, no emoji.
"""
import os, sys

PDF_SKILL_DIR = '/home/z/my-project/skills/pdf'
_scripts = os.path.join(PDF_SKILL_DIR, 'scripts')
if _scripts not in sys.path:
    sys.path.insert(0, _scripts)

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, inch
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_JUSTIFY, TA_CENTER
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    KeepTogether, HRFlowable
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from pdf import install_font_fallback

# ── Font Registration ──
FONT_DIR = '/usr/share/fonts'
pdfmetrics.registerFont(TTFont('FreeSerif', f'{FONT_DIR}/truetype/freefont/FreeSerif.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Bold', f'{FONT_DIR}/truetype/freefont/FreeSerifBold.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Italic', f'{FONT_DIR}/truetype/freefont/FreeSerifItalic.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-BoldItalic', f'{FONT_DIR}/truetype/freefont/FreeSerifBoldItalic.ttf'))
registerFontFamily('FreeSerif', normal='FreeSerif', bold='FreeSerif-Bold',
                    italic='FreeSerif-Italic', boldItalic='FreeSerif-BoldItalic')
install_font_fallback()

# ── Cascade Palette ──
PAGE_BG      = colors.HexColor('#f2f3f3')
SECTION_BG   = colors.HexColor('#eaeced')
CARD_BG      = colors.HexColor('#e8ebed')
TABLE_STRIPE = colors.HexColor('#f1f3f3')
HEADER_FILL  = colors.HexColor('#3b525e')
COVER_BLOCK  = colors.HexColor('#52646d')
BORDER       = colors.HexColor('#b7c7cf')
ICON         = colors.HexColor('#4989a9')
ACCENT       = colors.HexColor('#378ab3')
ACCENT_2     = colors.HexColor('#b66a50')
TEXT_PRIMARY  = colors.HexColor('#1f2122')
TEXT_MUTED   = colors.HexColor('#787f82')
SEM_SUCCESS  = colors.HexColor('#4b805d')
SEM_WARNING  = colors.HexColor('#af8d4b')
SEM_ERROR    = colors.HexColor('#a1534c')
SEM_INFO     = colors.HexColor('#406a94')

# ── Page Setup ──
PAGE_W, PAGE_H = A4
LEFT_M = 60
RIGHT_M = 60
TOP_M = 50
BOT_M = 50
AW = PAGE_W - LEFT_M - RIGHT_M  # available width ≈ 475pt

# ── Styles ──
sH1 = ParagraphStyle(
    'H1', fontName='FreeSerif-Bold', fontSize=13, leading=17,
    spaceAfter=6, spaceBefore=10, textColor=TEXT_PRIMARY)

sH2 = ParagraphStyle(
    'H2', fontName='FreeSerif-Bold', fontSize=10.5, leading=14,
    spaceAfter=4, spaceBefore=8, textColor=HEADER_FILL)

sBody = ParagraphStyle(
    'Body', fontName='FreeSerif', fontSize=9, leading=13.5,
    spaceAfter=4, alignment=TA_JUSTIFY, textColor=TEXT_PRIMARY)

sBodySmall = ParagraphStyle(
    'BodySmall', fontName='FreeSerif', fontSize=8, leading=11.5,
    spaceAfter=3, alignment=TA_JUSTIFY, textColor=TEXT_PRIMARY)

sCell = ParagraphStyle(
    'Cell', fontName='FreeSerif', fontSize=8, leading=11,
    spaceAfter=0, textColor=TEXT_PRIMARY)

sCellBold = ParagraphStyle(
    'CellBold', fontName='FreeSerif-Bold', fontSize=8, leading=11,
    spaceAfter=0, textColor=TEXT_PRIMARY)

sCellHead = ParagraphStyle(
    'CellHead', fontName='FreeSerif-Bold', fontSize=8, leading=11,
    spaceAfter=0, textColor=colors.white)

sCallout = ParagraphStyle(
    'Callout', fontName='FreeSerif-Italic', fontSize=9.5, leading=14,
    spaceAfter=6, spaceBefore=4, leftIndent=18,
    borderColor=ACCENT, borderWidth=0, borderPadding=0,
    textColor=ACCENT, alignment=TA_LEFT)

sBullet = ParagraphStyle(
    'Bullet', fontName='FreeSerif', fontSize=8.5, leading=12,
    spaceAfter=2, leftIndent=14, bulletIndent=4,
    textColor=TEXT_PRIMARY)

# ── Helpers ──
def P(text, style=sBody):
    return Paragraph(text, style)

def H1(text):
    return Paragraph(f'<b>{text}</b>', sH1)

def H2(text):
    return Paragraph(f'<b>{text}</b>', sH2)

def make_table(headers, rows, col_ratios=None):
    if col_ratios is None:
        n = len(headers)
        col_ratios = [1.0 / n] * n
    cw = [r * AW for r in col_ratios]
    data = [[Paragraph(h, sCellHead) for h in headers]]
    for row in rows:
        data.append([Paragraph(str(c), sCell) for c in row])
    t = Table(data, colWidths=cw, hAlign='CENTER')
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('GRID', (0, 0), (-1, -1), 0.4, BORDER),
    ]
    for i in range(1, len(data)):
        bg = colors.white if i % 2 == 1 else TABLE_STRIPE
        style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    t.setStyle(TableStyle(style_cmds))
    return t

# ── Build Story ──
story = []

# ─── SECTION 1: Executive Summary ───
story.append(H1('1. Executive Summary'))
story.append(P(
    'PASTI adalah <b>AI agent otonom</b> yang menjadi juru pembelian harian untuk UMKM F&amp;B Indonesia. '
    'Agent berjalan secara otomatis setiap malam melalui EventBridge Scheduler: membaca data stok dan '
    'penjualan, memprediksi kebutuhan menggunakan algoritma deterministik, membandingkan penawaran supplier, '
    'menyusun draf Purchase Order (PO), lalu mengirimkannya kepada owner melalui <b>Telegram</b> untuk '
    'persetujuan satu klik. Owner cukup menekan tombol Approve, Edit, atau Tolak tanpa perlu membuka '
    'aplikasi atau memahami teknologi.'
))
story.append(P(
    '<i>"PASTI = staf pembelian yang bekerja 24/7, gratis, tanpa perlu owner paham teknologi."</i>',
    sCallout
))

# ─── SECTION 2: Problem Statement ───
story.append(H1('2. Problem Statement'))
story.append(P(
    'UMKM F&amp;B Indonesia, khususnya warung makan, kedai kopi, dan usaha katering, masih mengandalkan '
    'pencatatan stok secara manual melalui buku tulis atau ingatan pemilik. Akibatnya, ketika terjadi '
    'kehabisan bahan baku segar seperti ayam, sayuran, atau minyak goreng, penjualan hari itu langsung '
    'hilang karena bahan segar tidak dapat ditunda pengembaliannya. Sebaliknya, pembelian berlebihan '
    'menyebabkan bahan segar membusuk dan terbuang, yang secara langsung menggerus margin keuntungan '
    'yang tipis. Solusi ERP dan SCM yang tersedia di pasar saat ini terlalu mahal dan kompleks untuk '
    'dipakai oleh pemilik warung yang tidak memiliki latar belakang teknis.'
))

# ─── SECTION 3: Goals & Non-Goals ───
story.append(H1('3. Goals &amp; Non-Goals'))
story.append(P(
    'MVP PASTI dirancang dengan lima goal utama yang terukur, disertai batasan non-goals yang '
    'memastikan tim tetap fokus pada nilai inti produk selama periode kompetisi.'
))

goals_data = [
    ['G1', 'Agent berjalan otonom harian tanpa trigger manusia', 'Run otomatis 1x/hari via scheduler'],
    ['G2', 'Prediksi kebutuhan reorder yang akurat', 'Error prediksi &lt; 20% pada data 60 hari'],
    ['G3', 'Draf PO otomatis + notifikasi Telegram', 'PO sampai ke owner &lt; 30 detik'],
    ['G4', 'Human-in-the-loop approval', 'Approve/Edit/Tolak dari Telegram'],
    ['G5', 'Proses berpikir agent transparan', 'Trace reasoning terlihat di dashboard'],
]
story.append(make_table(
    ['#', 'Goal', 'Ukuran Sukses'],
    goals_data,
    col_ratios=[0.06, 0.52, 0.42]
))
story.append(Spacer(1, 4))
story.append(P(
    '<b>Non-Goals:</b> Integrasi payment gateway, integrasi POS fisik (scanner barcode), '
    'multi-toko/cabang, dan aplikasi mobile native (cukup web + Telegram).',
    sBodySmall
))

# ─── SECTION 4: Persona & User Stories ───
story.append(H1('4. Persona &amp; User Stories'))
story.append(P(
    '<b>Persona utama: "Bu Sari", 42 tahun, pemilik warung makan.</b> '
    'Tidak paham teknologi, hanya menggunakan WhatsApp dan membaca Telegram. '
    'Mengunjungi pasar satu kali seminggu dan sering salah memperkirakan kebutuhan bahan baku.'
))

us_data = [
    ['US1', 'Sistem memantau stok sehingga tidak kehabisan bahan', 'Must'],
    ['US2', 'Notifikasi Telegram tiap malam berisi usulan belanjaan', 'Must'],
    ['US3', 'Menyetujui atau mengubah usulan dengan satu klik', 'Must'],
    ['US4', 'Dashboard sederhana stok dan pengeluaran', 'Should'],
    ['US5', 'Agent mengingat konteks (misal: "Jumat libur")', 'Could'],
]
story.append(make_table(
    ['#', 'User Story', 'Prioritas'],
    us_data,
    col_ratios=[0.06, 0.74, 0.20]
))

# ─── SECTION 5: Fitur MVP ───
story.append(H1('5. Fitur MVP (Prioritas MoSCoW)'))
story.append(P(
    'Enam fitur prioritas Must mencakup keseluruhan alur agent loop otonom, dari monitoring stok '
    'hingga approval PO via Telegram. Fitur Should dan Could meningkatkan pengalaman pengguna '
    'dengan dashboard web, memory kontekstual, dan laporan harian ringkas.'
))

fitur_data = [
    ['F1', 'Monitoring stok', 'Must', 'Input stok via webform; data di DynamoDB'],
    ['F2', 'Agent loop otonom', 'Must', 'Scheduler - agent berpikir - keputusan reorder'],
    ['F3', 'Prediksi demand', 'Must', 'Moving average 7/30 hari + safety stock'],
    ['F4', 'Perbandingan supplier', 'Must', 'Pilih supplier termurah, lead time cukup'],
    ['F5', 'Draf PO otomatis', 'Must', 'PDF dengan rincian item, harga, total'],
    ['F6', 'Approval via Telegram', 'Must', 'Inline button: Approve / Edit / Tolak'],
    ['F7', 'Dashboard web', 'Should', 'Streamlit: stok, log agent, riwayat PO'],
    ['F8', 'Memory kontekstual', 'Should', 'Agent ingat instruksi owner'],
    ['F9', 'Laporan harian ringkas', 'Could', 'Ringkasan omzet dan stok kritis di Telegram'],
]
story.append(make_table(
    ['Fitur', 'Nama', 'MoSCoW', 'Detail'],
    fitur_data,
    col_ratios=[0.07, 0.23, 0.12, 0.58]
))

# ─── SECTION 6: Arsitektur Teknis ───
story.append(H1('6. Arsitektur Teknis (AWS)'))
story.append(P(
    'Sistem dibangun di atas AWS dengan arsitektur serverless. <b>EventBridge Scheduler</b> '
    'memicu agent setiap pukul 20:00 WIB. <b>Amazon Bedrock Agent</b> (Nova Pro / Claude Haiku) '
    'bertindak sebagai orchestrator yang memanggil enam Lambda functions sebagai Action Groups: '
    'get_inventory_status, get_sales_history, forecast_demand, get_supplier_offers, '
    'create_draft_po, dan send_telegram_approval. Data disimpan di <b>DynamoDB</b> (products, '
    'sales, suppliers, orders, agent_logs) dan file PDF PO disimpan di <b>S3</b>. Owner berinteraksi '
    'melalui <b>Telegram Bot</b> untuk approval, sementara <b>Streamlit Dashboard</b> (via API Gateway) '
    'menyediakan visibilitas stok, log reasoning agent, dan riwayat PO.'
))
story.append(P(
    '<b>Prinsip desain kunci: "LLM mengatur, kode menghitung."</b> '
    'Seluruh perhitungan numerik (forecast, jumlah order, total harga) dilakukan oleh kode '
    'deterministik di Lambda, bukan oleh LLM. LLM bertugas mengorkestrasi, mengevaluasi konteks, '
    'dan mengambil keputusan. Angka tidak mungkin salah karena dihitung kode; LLM hanya memutuskan '
    'item mana, kapan, dan supplier mana.',
    sCallout
))

# ─── SECTION 7: Desain Agent ───
story.append(H1('7. Desain Agent (Agentic AI)'))
story.append(P(
    'Agent PASTI mengikuti pola <b>Perceive - Reason - Act - Learn</b> dengan tujuh langkah '
    'dalam setiap run otomatis. Langkah-langkah ini dirancang agar seluruh proses berpikir agent '
    'tercatat dan dapat ditelusuri (traceable) melalui dashboard.'
))

steps = [
    '<b>1. PERCEIVE</b> - Memanggil get_inventory_status dan get_sales_history untuk membaca kondisi terkini.',
    '<b>2. REASON</b> - Menganalisis apakah stok kritis berdasarkan pola penjualan, misalnya: '
    '"Minyak goreng sisa 3L, rata-rata jual 2L/hari, weekend naik 40% - HABIS BESOK."',
    '<b>3. FORECAST</b> - Memanggil forecast_demand (moving average + safety stock) untuk menghitung kebutuhan.',
    '<b>4. COMPARE</b> - Memanggil get_supplier_offers, membandingkan harga, lead time, dan minimum order.',
    '<b>5. SELF-CHECK</b> - Validasi draf: apakah total masuk budget? Apakah ada item yang owner larang? (memory)',
    '<b>6. ACT</b> - Membuat draf PO dan mengirim notifikasi approval ke Telegram.',
    '<b>7. LEARN</b> - Mencatat keputusan dan hasil approval untuk evaluasi mingguan.',
]
for s in steps:
    story.append(P(s, sBullet))
story.append(Spacer(1, 4))

story.append(H2('Fitur Agentic yang Diekspose ke Juri'))
agent_data = [
    ['Autonomy', 'Berjalan terjadwal tanpa perintah manusia (EventBridge)'],
    ['Multi-step Reasoning', '7 langkah per run, terlihat di trace'],
    ['Tool Use', '6 action groups (Lambda functions)'],
    ['Memory', 'Bedrock Agent session + preferensi owner di DynamoDB'],
    ['Self-reflection', 'Langkah 5: agent memvalidasi draf sebelum kirim'],
    ['Human-in-the-loop', 'Gate approval Telegram, agent tidak pernah order tanpa izin'],
    ['Guardrails', 'Bedrock Guardrails: blokir order &gt; budget, item terlarang'],
]
story.append(make_table(
    ['Kemampuan', 'Implementasi'],
    agent_data,
    col_ratios=[0.25, 0.75]
))

# ── Build PDF ──
output_path = '/home/z/my-project/scripts/pasti_proposal_body.pdf'
doc = SimpleDocTemplate(
    output_path,
    pagesize=A4,
    leftMargin=LEFT_M, rightMargin=RIGHT_M,
    topMargin=TOP_M, bottomMargin=BOT_M,
    title='PASTI - Proposal Kompetisi',
    author='Z.ai',
    creator='Z.ai',
    subject='Proactive Agentic Supply-chain Tracking & Inventory'
)
doc.build(story)
print(f'Body PDF created: {output_path}')
