# Panduan Setup Neon DB — PASTI Dashboard

> Sandbox tidak bisa akses API Neon secara langsung, jadi setup akun & project Neon
> dilakukan **manual** lewat dashboard web neon.tech. Panduan ini menjelaskan
> langkah demi langkah sampai dashboard PASTI bisa terhubung & seeded.

---

## 1. Buat Akun Neon (Gratis)

1. Buka **https://neon.tech** → klik **Sign Up**
2. Pilih login dengan GitHub / Google / Email (paling cepat: GitHub)
3. Setelah masuk, klik **New Project**

## 2. Konfigurasi Project Baru

| Field            | Value                              |
| ---------------- | ---------------------------------- |
| Project name     | `pasti-dashboard`                  |
| Database name    | `pasti`                            |
| Postgres version | `17` (default — latest stable)     |
| Region           | `AWS Asia Pacific (Singapore)` — terdekat dengan pengguna Indonesia |
| Compute size     | `Free tier` (0.25 vCPU, 1 GB RAM) — cukup untuk demo |
| Autosuspend      | ON (default — pause setelah 5 menit idle, hemat free tier) |

3. Klik **Create Project**
4. Tunggu ±10 detik sampai project aktif

## 3. Ambil Connection String

Setelah project aktif, Neon akan menampilkan halaman **Connection Details**:

1. Pilih tab **Connection string** (bukan pooled, untuk dev awal)
2. Untuk produksi / Vercel — gunakan tab **Pooled connection** (lebih scalable)
3. Copy URL yang muncul, formatnya kira-kira:

```
postgresql://pasti_owner:npg_xxxxxxxxxxxxxxxx@ep-xxx-xxx-pooler.ap-southeast-1.aws.neon.tech/pasti?sslmode=require
```

⚠️ **Jangan pernah commit URL ini ke git.** Hanya simpan di `.env` lokal & Vercel env vars.

## 4. Konfigurasi Local .env

Edit file `.env` di root project (`/home/z/my-project/user_project/.env`):

```env
DATABASE_URL="postgresql://pasti_owner:npg_xxxxxxxx@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/pasti?sslmode=require"
OPENROUTER_API_KEY="sk-or-v1-xxxxx"
OPENROUTER_MODEL="meta-llama/llama-3.2-3b-instruct:free"
```

## 5. Install Dependencies Baru

```bash
cd /home/z/my-project/user_project

# Driver adapter Prisma untuk Neon (serverless-friendly)
bun add @prisma/adapter-neon @neondatabase/serverless ws
bun add -d @types/ws

# Generate Prisma Client baru
bunx prisma generate
```

## 6. Push Schema ke Neon

```bash
# Buat tabel di Neon (overwrite kalau ada)
bunx prisma db push --accept-data-loss
```

Expected output:
```
🚀 Your database is now in sync with your Prisma schema. Done in 1.2s
```

## 7. Seed Data ke Neon

Dashboard sudah punya endpoint `POST /api/seed` yang membaca file JSON di
`/public/data/` lalu insert ke Neon.

**Cara 1 — lewat curl setelah dev server jalan:**
```bash
bun run dev
# di terminal lain:
curl -X POST http://localhost:3000/api/seed
```

**Cara 2 — langsung pakai script Node (alternatif):**
```bash
bunx tsx scripts/seed-neon.ts
```

Expected response:
```json
{
  "success": true,
  "counts": {
    "products": 10,
    "suppliers": 3,
    "sales": 587,
    "orders": 4,
    "agentLogs": 1
  }
}
```

## 8. Verifikasi di Neon Console

1. Buka Neon Console → project `pasti-dashboard`
2. Tab **Tables** → harusnya muncul 6 tabel:
   - `Product` (10 rows)
   - `Sale` (587 rows)
   - `Supplier` (3 rows)
   - `PurchaseOrder` (4 rows)
   - `AgentLog` (1+ rows — akan bertambah setiap kali "Run Agent" dipanggil)
   - `OwnerPreference` (0 rows)
3. Tab **SQL Editor** → test query:
   ```sql
   SELECT nama, stok_saat_ini, stok_min, safety_stock
   FROM "Product"
   WHERE stok_saat_ini <= safety_stock;
   ```

## 9. Deploy ke Vercel — Environment Variables

Di **https://vercel.com** → project `pasti-v2` → Settings → Environment Variables:

| Key                    | Value                          | Environments       |
| ---------------------- | ------------------------------ | ------------------ |
| `DATABASE_URL`         | Neon pooled connection string  | Production + Preview |
| `OPENROUTER_API_KEY`   | `sk-or-v1-...`                  | Production + Preview |
| `OPENROUTER_MODEL`     | `meta-llama/llama-3.2-3b-instruct:free` | Production + Preview |
| `OPENROUTER_SITE_URL`  | `https://pasti-v2.vercel.app`   | Production         |
| `OPENROUTER_SITE_NAME` | `PASTI Dashboard`               | Production         |

Setelah save, **Redeploy** project Vercel untuk pick up env baru.

## 10. Cutover dari Static JSON → Neon

Project PASTI saat ini membaca dari file JSON statis di `/public/data/`. Untuk
switch ke live DB:

1. Buka `src/lib/demo-data.ts`
2. Ubah setiap fungsi `getXxx()` agar memanggil `db.xxx.findMany()` (lihat contoh
   di `src/app/api/products/route.ts` line 1-19 — pattern-nya sama)
3. Atau alternatif: pakai flag `USE_DB=true` di `.env` untuk toggle mode

**Rekomendasi demo day:** Pertahankan dual-mode — JSON untuk fallback aman,
Neon untuk demo live. Lihat implementasi di `src/lib/data-provider.ts` (akan
dibuat di Step 2).

---

## Troubleshooting

### `Error: prepared statement "s1" already exists`
Neon tidak support prepared statement caching di pooled mode. Solusi:
```bash
# Tambahkan ke connection string di .env:
?sslmode=require&pgbouncer=true&connect_timeout=15
```

### `Error: relation "Product" does not exist`
Schema belum di-push. Run:
```bash
bunx prisma db push --accept-data-loss
```

### `PrismaClientInitializationError: ws not found`
Missing dependency. Run:
```bash
bun add ws && bun add -d @types/ws
```

### `Connection refused / timeout`
Cek:
1. IP tidak di-block (Neon free tier: allow all by default, no IP allowlist)
2. Connection string pakai `?sslmode=require`
3. Coba tanpa `-pooler` dulu, lalu pindah ke pooler setelah berhasil

### Vercel deployment: `Function timeout`
Neon autosuspend butuh ±3 detik untuk cold start. Tambahkan:
```ts
// next.config.ts
exportStandalone: true,  // sudah ada
experimental: { serverActions: { bodySizeLimit: '5mb' } }
```

---

## Estimasi Biaya

| Komponen              | Free Tier           | Paid Plan (jika perlu) |
| --------------------- | ------------------- | ---------------------- |
| **Neon**              | 0.5 GB storage, 100 jam compute/bln | $19/bln → 10 GB, unlimited compute |
| **Vercel**            | Hobby: unlimited static + 100 GB bandwidth | Pro $20/bln → serverless functions |
| **OpenRouter**        | Free models = $0    | Paid models: ~$0.0001–0.01 per agent run |
| **Total demo day**    | **Rp 0**            | Rp 300–500 ribu/bulan untuk prod |

**Untuk kompetisi:** Free tier sudah cukup. 1 kali agent run ≈ 2.000 token ≈ Rp 0.

---

## Checklist Akhir

- [ ] Akun Neon terbuat
- [ ] Project `pasti-dashboard` aktif di region Singapore
- [ ] Connection string disalin
- [ ] `.env` lokal sudah berisi `DATABASE_URL` Neon
- [ ] Dependencies `@prisma/adapter-neon @neondatabase/serverless ws` ter-install
- [ ] `bunx prisma db push` berhasil
- [ ] `POST /api/seed` sukses (counts > 0 untuk semua tabel)
- [ ] Tabel terlihat di Neon Console → Tables
- [ ] Vercel env vars sudah di-set
- [ ] Vercel redeploy berhasil
- [ ] Dashboard di production bisa baca data dari Neon

Setelah checklist semua ✔, lanjut ke **Step 2 — OpenRouter Integration**.
