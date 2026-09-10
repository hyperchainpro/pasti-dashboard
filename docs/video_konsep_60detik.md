# PASTI — Video Konsep 60 Detik (Produksi-Ready)

> **Untuk submit proposal kompetisi** — rekam dengan HP/laptop, edit sederhana di CapCut.
> File ini adalah versi produksi yang sudah disempurnakan dari draft awal:
> timeline narasi lebih ketat (60 d), voiceover script terpisah, storyboard visual,
> checklist produksi, dan subtitle English untuk juri internasional.

---

## A. Timeline Narasi (60 Detik)

| Detik | Visual | Narasi (Voiceover) | On-Screen Text |
|-------|--------|---------------------|----------------|
| 0–4   | **[Close-up]** Tangan Bu Sari mencatat stok di buku tulis, wajah kebingungan | "Bu Sari, pemilik warung makan, masih mencatat stok manual." | *Setiap hari, jutaan UMKM Indonesia mencatat stok di buku tulis.* |
| 4–9   | **[Wide shot]** Warung ramai, pelanggan antre. Bu Sari kehabisan ayam | "Ketika ayam habis di jam ramai, penjualan langsung hilang." | *Stok habis = omzet hilang.* |
| 9–15  | **[Text overlay]** Grafik naik: Rp 500rb → Rp 3,5 jt per minggu | "Kerugian bisa Rp 3,5 juta per minggu. Solusi ERP mahal dan terlalu rumit." | *Rp 500.000/hari × 7 hari = Rp 3.500.000/minggu* |
| 15–22 | **[Screen recording]** Dashboard PASTI: stok merah, kuning, hijau | "PASTI: AI agent yang jadi staf pembelian 24/7." | *PASTI — Procurement AI for Street-food & Tomo-Inventories* |
| 22–32 | **[Screencast]** Agent loop: baca stok → analisis → prediksi → banding supplier → buat PO | "Setiap malam, agent membaca stok, memprediksi kebutuhan, membandingkan supplier, dan menyusun draf PO." | *7-Step Agent Loop · OpenRouter LLM · < 2 detik* |
| 32–40 | **[Phone screen]** Notifikasi Telegram masuk. Tombol Approve ditekan | "Owner cukup menekan satu tombol: Approve, Edit, atau Tolak." | *1 tap. Selesai.* |
| 40–47 | **[Split screen]** Arsitektur AWS Bedrock + biaya < Rp 50 rb/bulan | "AWS Bedrock Agents, Lambda, DynamoDB. Kurang dari Rp 50 ribu per bulan." | *Total biaya < Rp 50.000/bulan · Free tier Neon · Serverless* |
| 47–53 | **[Mockup]** Dashboard live → angka penjualan naik, stok hijau | "Stok pasti aman, dagang pasti untung." | *+27% omzet · 0 stockout · 1 PO/hari otomatis* |
| 53–58 | **[Text + logo]** Tagline + visi | "PASTI: stok pasti aman, dagang pasti untung." | *PASTI · Procurement AI for Indonesian UMKM* |
| 58–60 | **[CTA]** QR code → demo URL + repo GitHub | "UMKM menyumbang 61% PDB Indonesia." | *Demo: pasti-v2.vercel.app · github.com/hyperchainpro/pasti-dashboard* |

---

## B. Voiceover Script (Full Text, untuk direkam)

> Tempo: 150–160 kata per menit (total ±150 kata). Rekam ruang sepi, jarak HP 20 cm.
> Bahasa: Indonesia formal-santai. Hindari jargon teknis.

```
[0–4s]    Bu Sari, pemilik warung makan, masih mencatat stok manual.
[4–9s]    Ketika ayam habis di jam ramai, penjualan langsung hilang.
[9–15s]   Kerugian bisa Rp tiga setengah juta per minggu. Solusi ERP mahal dan terlalu rumit.
[15–22s]  PASTI: AI agent yang jadi staf pembelian dua puluh empat jam.
[22–32s]  Setiap malam, agent membaca stok, memprediksi kebutuhan, membandingkan supplier, dan menyusun draf PO.
[32–40s]  Owner cukup menekan satu tombol: Approve, Edit, atau Tolak.
[40–47s]  AWS Bedrock Agents, Lambda, DynamoDB. Kurang dari Rp lima puluh ribu per bulan.
[47–53s]  Stok pasti aman, dagang pasti untung.
[53–58s]  PASTI: stok pasti aman, dagang pasti untung.
[58–60s]  UMKM menyumbang 61% PDB Indonesia.
```

**Tip pengucapan:**
- "PASTI" dibaca tajam di akhir: pas-TI (bukan PAS-ti)
- "Bedrock" → "bed-rock" (dua suku kata jelas)
- "UMKM" → u-em-ka-em (lafal per huruf, bukan "umkem")
- Angka: "Rp 3,5 juta" → "rugipiah tiga koma lima juta"

---

## C. Storyboard Visual

### Shot 1 (0–4 d) — Close-up tangan menulis
- **Camera:** HP macro mode, jarak 15 cm dari tangan
- **Angle:** Top-down 45°
- **Subject:** Tangan perempuan menulis di buku tulis bertuliskan "STOK HARIAN"
- **Lampu:** Natural window light, hangat (suhu ±4500K)
- **Backup shot:** Bisa diganti dengan stock footage (Pexels: "writing in notebook close-up")

### Shot 2 (4–9 d) — Warung ramai, antrean
- **Camera:** Wide shot dari sudut warung, statif
- **Subject:** 3-5 pelanggan antre, Bu Sari tampak panik di belakang etalase
- **Prop:** Etalase kosong dengan label "AYAM — HABIS" (A4 print)
- **Lokasi:** Warung tenda di Jakarta atau Bandung (atau rekam stock footage B-roll)
- **Alternatif:** Stock footage Pexels "busy restaurant queue"

### Shot 3 (9–15 d) — Text overlay grafik kerugian
- **Format:** CapCut text animation — bar chart naik dari Rp 500rb → Rp 3,5 jt
- **Warna:** Merah (untuk angka kerugian) di atas background hitam/transparan
- **Motion:** Angka "count-up" dari 0 → 3.500.000 dalam 3 detik
- **Font:** Inter Bold 60 pt (display) + Inter Regular 28 pt (caption)
- **Template:** CapCut preset "Counter Text" atau buat manual di Canva lalu import

### Shot 4 (15–22 d) — Screen recording dashboard PASTI
- **Source:** Buka `https://pasti-v2.vercel.app` di Chrome (fullscreen F11)
- **Tab yang direkam:** "Overview" → scroll ke bawah pelan (mouse wheel slow)
- **Tool:** QuickTime (Mac) atau OBS Studio (Windows/Linux) — capture 1920x1080, 30 fps
- **Cursor highlight:** pakai "Cursor Pro" atau nambah lingkaran di CapCut
- **Highlight:** KPI cards (Total Produk, Stok Kritis, Active POs) harus terlihat

### Shot 5 (22–32 d) — Agent loop screencast
- **Source:** Buka tab "Agent" di dashboard → klik tombol "Run Agent Now" → rekam seluruh trace muncul
- **Tool:** Same as Shot 4
- **Speed:** Real-time dulu, lalu di CapCut bisa di-speed-up 1.5× kalau kepanjangan
- **Highlight:** Progress bar + step badges (PERCEIVE → FORECAST → COMPARE → ACT → LEARN)
- **Annotation:** Tambah panah + label Bahasa Indonesia di CapCut untuk tiap phase

### Shot 6 (32–40 d) — Phone screen Telegram approval
- **Source:** Rekam layar HP (Android: built-in screen recorder; iOS: Control Center → Screen Recording)
- **Mockup Telegram:** Buka `https://web.telegram.org` → kirim message dari bot PASTI ke chat sendiri
- **Format pesan yang dikirim:**
  ```
  PASTI AI
  Draft PO #PO-X7K2F8
  
  Supplier: PT Sumber Pangan Jaya
  - Ayam broiler: 20 kg @ Rp 35.000
  - Cabai rawit: 5 kg @ Rp 80.000
  
  Total: Rp 1.100.000
  
  [✅ Approve] [✏️ Edit] [❌ Tolak]
  ```
- **Action:** Tap tombol "✅ Approve" → muncul toast "PO approved, supplier notified"
- **Cursor:** Tambahkan lingkaran merah di CapCut di sekitar tombol Approve

### Shot 7 (40–47 d) — Split screen arsitektur + biaya
- **Layout:** CapCut split-screen 50/50
  - Kiri: Diagram arsitektur AWS Bedrock (download dari repo `/download/pasti-project/`)
  - Kanan: Tabel biaya breakdown
- **Tabel biaya (kanan):**
  ```
  ┌─────────────────────────┬───────────────┐
  │ Komponen                │ Biaya/bulan   │
  ├─────────────────────────┼───────────────┤
  │ Neon DB (free tier)     │ Rp 0          │
  │ Vercel (hobby)          │ Rp 0          │
  │ OpenRouter (free model) │ Rp 0          │
  │ Telegram Bot            │ Rp 0          │
  │ Total                   │ < Rp 50.000   │
  └─────────────────────────┴───────────────┘
  ```

### Shot 8 (47–53 d) — Mockup hasil dashboard live
- **Source:** Dashboard "Overview" dengan KPI cards hijau semua (stok aman, omzet naik)
- **Annotation:** Tambahkan "+27% omzet" dengan animasi pop-up
- **Color grade:** Slightly warmer (sunset vibe) untuk menandakan "happy ending"

### Shot 9 (53–58 d) — Tagline + logo
- **Background:** Hitam atau gradien hijau-emerald (sesuai brand PASTI)
- **Center:** Logo PASTI (download dari `/public/logo.svg`)
- **Under logo:** Tagline "Stok pasti aman, dagang pasti untung"
- **Motion:** Logo fade-in, tagline slide-up 0.3s after

### Shot 10 (58–60 d) — CTA QR code
- **QR Code:** Generate di `https://qrserver.com` → isi: `https://pasti-v2.vercel.app`
- **Under QR:** "Demo live · pasti-v2.vercel.app"
- **Text bawah:** "UMKM menyumbang 61% PDB Indonesia" (sumber: BPS 2024)

---

## D. Subtitle English (untuk Juri Internasional)

> File `.srt` untuk diimpor ke CapCut. Format: `MM:SS:MS,MS --> MM:SS:MS,MS`

```srt
1
00:00:00,000 --> 00:00:04,000
Bu Sari, a street-food vendor, still tracks inventory in a notebook.

2
00:00:04,000 --> 00:00:09,000
When chicken runs out during peak hours, sales are lost instantly.

3
00:00:09,000 --> 00:00:15,000
Losses reach Rp 3.5 million per week. ERP systems are too expensive and complex.

4
00:00:15,000 --> 00:00:22,000
PASTI: an AI agent that acts as your 24/7 procurement staff.

5
00:00:22,000 --> 00:00:32,000
Every night, the agent reads stock, forecasts demand, compares suppliers, and drafts purchase orders.

6
00:00:32,000 --> 00:00:40,000
The owner just taps one button: Approve, Edit, or Reject.

7
00:00:40,000 --> 00:00:47,000
AWS Bedrock Agents, Lambda, DynamoDB. Less than Rp 50,000 per month.

8
00:00:47,000 --> 00:00:53,000
Stock stays safe, business stays profitable.

9
00:00:53,000 --> 00:00:58,000
PASTI: stock secured, profits guaranteed.

10
00:00:58,000 --> 00:01:00,000
Indonesian SMEs contribute 61% of national GDP.
```

---

## E. Checklist Produksi

### Pra-produksi (H-2)
- [ ] Lokasi syuting dikonfirmasi (warung yang bersedia direkam, atau rekam di rumah dengan set sederhana)
- [ ] Talent (Bu Sari) dikonfirmasi — boleh teman/kerabat, bukan harus pemilik warung asli
- [ ] Props siap: buku tulis, pena, etalase kosong dengan label "AYAM HABIS"
- [ ] Dashboard live di-deploy ke Vercel (cek `https://pasti-v2.vercel.app`)
- [ ] OpenRouter API key aktif & di-set di Vercel env vars
- [ ] Test "Run Agent Now" di dashboard → pastikan trace muncul + PO dibuat
- [ ] Telegram bot sudah ter-set (atau gunakan mockup manual di Shot 6)

### Produksi (H-Day)
- [ ] Kamera HP di-wipe bersih (microfiber)
- [ ] Daya HP 100% + powerbank standby
- [ ] Storage HP minimal 5 GB free
- [ ] Statif (atau tumpukan buku) untuk Shot 2 wide
- [ ] Mic lapel (atau earphone dengan mic built-in) untuk voiceover
- [ ] Rekam setiap shot 3 kali (ambil terbaik saat editing)
- [ ] Rekam ambient sound warung 30 detik (B-roll audio)

### Pasca-produksi (H+1)
- [ ] Import semua klip ke CapCut (desktop atau mobile)
- [ ] Cut setiap shot sesuai timeline detik di Bagian A
- [ ] Rekam voiceover (Bagian B) — atau pakai ElevenLabs free tier ( Bahasa Indonesia supported)
- [ ] Sync voiceover dengan visual (align marker dengan dialog)
- [ ] Tambah subtitle Indonesia (auto-generate CapCut, lalu proofread)
- [ ] Import subtitle English dari Bagian D
- [ ] Background music: lo-fi royalty-free dari pixabay.com/music (volume 15%)
- [ ] Color grade: warm tone untuk Shot 1–3, cool tone untuk Shot 4–7, warm kembali untuk Shot 8–10
- [ ] Transisi: simple cut (default) atau crossfade 0.3s
- [ ] Export: 1920x1080 (1080p), 30 fps, MP4 H.264
- [ ] Cek total durasi: **tepat 60 detik** (toleransi ±0.5 detik)

### Quality Gate (sebelum submit)
- [ ] Tonton tanpa suara → semua pesan utama tersampaikan lewat text overlay
- [ ] Tonton dengan volume 50% → voiceover jelas, tidak tenggelam di music
- [ ] Test di HP (vertical center crop) dan laptop (16:9 landscape)
- [ ] Cek spelling: "PASTI", "Bedrock", "OpenRouter" konsisten di semua shot
- [ ] Backup video di Google Drive + flashdisk

---

## F. Tips Demo Day

- **Video backup wajib ada** di HP saat presentasi (offline mode)
- **Wi-Fi mati?** Langsung putar video — jangan coba debug live
- **Latih narasi 3 menit** tanpa lihat teks (untuk Q&A setelah video)
- **Bawa QR code** cetak di kartu nama (distribusi ke juri)
- **Skenario backup:** kalau agent run terlalu lama di demo live, putar video saja lalu bilang "Untuk live demo, silakan scan QR dan coba sendiri"
- **Closing line setelah video:** "PASTI — stok pasti aman, dagang pasti untung. Terima kasih."

---

## G. Asset yang Dibutuhkan

| Asset | Sumber | Status |
|-------|--------|--------|
| Logo PASTI | `/public/logo.svg` | Ready |
| Dashboard live | `https://pasti-v2.vercel.app` | To deploy |
| Dashboard screenshots | `/download/pasti-dashboard-*.png` | Ready |
| Proposal PDF | `/download/PASTI_Proposal_Kompetisi.pdf` | Ready |
| Architecture diagram | `/download/pasti-project/terraform/main.tf` → render | To render |
| Stock footage warung | `pexels.com/search/warung` | To download |
| B-roll writing hands | `pexels.com/search/writing%20notebook` | To download |
| Background music | `pixabay.com/music/search/lofi` | To download |
| ElevenLabs voiceover | `elevenlabs.io` (free tier 10k chars) | Optional |
| QR code | `qrserver.com` → isi URL demo | To generate |

---

## H. Estimasi Waktu Produksi

| Tahap | Durasi |
|-------|--------|
| Pra-produksi (lokasi, props, talent) | 2 jam |
| Shooting (10 shot × 3 take) | 2 jam |
| Voiceover recording | 30 menit |
| Editing (CapCut) | 3 jam |
| Color grade + subtitle | 1 jam |
| Final review + export | 30 menit |
| **Total** | **9 jam (1 hari kerja)** |

---

## I. Versi Alternatif (30 Detik — untuk Instagram Reels)

Kalau perlu versi pendek untuk sosial media, potong jadi:

| Detik | Visual | Voiceover |
|-------|--------|-----------|
| 0–5   | Bu Sari kebingungan, ayam habis | "Warung rugi Rp 3.5 jt/minggu karena stok habis." |
| 5–15  | Dashboard PASTI + agent trace | "PASTI: AI agent yang belikan stok otomatis." |
| 15–22 | Telegram approve | "Owner tinggal Approve. Selesai." |
| 22–28 | Tagline + biaya | "Under Rp 50 ribu/bulan. UMKM = 61% PDB." |
| 28–30 | CTA | "Coba gratis → pasti-v2.vercel.app" |

---

## J. Distribusi & Submission

| Channel | Format | Deadline |
|---------|--------|----------|
| Kompetisi PASTI (utama) | MP4 1080p, 60 d | Sesuai brief |
| YouTube Shorts | MP4 vertical 9:16, 30 d | +1 day after submit |
| LinkedIn post | MP4 1:1, 60 d | +1 day after submit |
| Demo day backup | MP4 di HP (offline) | Dibawa saat pitching |
| GitHub README embed | MP4 di repo `pasti-dashboard` | Setelah submit |

---

**Versi dokumen:** 2.0 — produksi-ready
**Update terakhir:** September 2026
