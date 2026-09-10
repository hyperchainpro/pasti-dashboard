# Panduan Setup Cloudflare Turnstile (Captcha Gratis)

> PASTI Dashboard menggunakan [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/) — alternatif gratis reCAPTCHA yang lebih cepat, lebih private, dan tidak mengharuskan user menyelesaikan challenge (Cloudflare managed mode).

**Status saat ini**: Captcha sudah di-enforce **server-side** untuk SEMUA flow auth (register, login, forgot-password, reset-password). Tapi karena `TURNSTILE_SECRET_KEY` belum di-set, aplikasi jalan dalam **dev mode** (auto-accepts any non-empty token dengan log warning).

Untuk enable real Cloudflare Turnstile widget, ikuti 2 opsi berikut:

---

## Opsi A — Otomatis via Script (5 menit)

### Step 1: Buat Cloudflare API Token

1. Buka https://dash.cloudflare.com/profile/api-tokens
2. Klik **Create Token** → **Custom token** (Use template → "Edit Cloudflare Workers" lalu customize, atau buat dari awal)
3. Konfigurasi:
   - **Token name**: `PASTI Turnstile Setup`
   - **Permissions**:
     - Account → **Turnstile** → **Edit**
   - **Account Resources**: Include → Specific account → (pilih akun Anda)
   - **TTL**: optional, biarkan default
4. Klik **Continue to summary** → **Create Token**
5. Copy token yang muncul (panjang, alphanumeric, contoh: `a1b2c3d4e5...`)

### Step 2: Tambahkan token ke .env lokal

Edit `/home/z/my-project/user_project/.env`, tambahkan baris:

```bash
CF_API_TOKEN="your-cloudflare-api-token-here"
```

### Step 3: Run setup script

```bash
cd /home/z/my-project/user_project
python3 /home/z/my-project/scripts/setup_turnstile.py
```

Script akan otomatis:
1. Verify Cloudflare token
2. Create Turnstile widget untuk domain `pasti-v2-delta.vercel.app` + `localhost`
3. Fetch sitekey (public) + secret (server)
4. Set 2 env vars di Vercel: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`
5. Update local `.env`
6. Trigger Vercel redeploy

Setelah deploy selesai (~2-3 menit), buka:
- https://pasti-v2-delta.vercel.app/login → widget Turnstile asli akan muncul
- Dev mode warning akan hilang otomatis

---

## Opsi B — Manual via Cloudflare Dashboard (3 menit)

### Step 1: Buat Turnstile widget di Cloudflare

1. Login ke https://dash.cloudflare.com
2. Di sidebar kiri, cari **Turnstile** (di section "Cloudflare")
3. Klik **Add site**
4. Isi form:
   - **Site name**: `PASTI Dashboard`
   - **Domain**: `pasti-v2-delta.vercel.app` (klik + lalu tambah `localhost` untuk dev)
   - **Widget mode**: **Managed** (recommended — Cloudflare pilih challenge type otomatis)
   - **Pre-clearance**: No
   - **Region**: World
5. Klik **Create**
6. Di halaman detail widget, copy **Site Key** (mulai dengan `0x...`) + **Secret Key** (klik "Show")

### Step 2: Set env vars di Vercel

1. Buka https://vercel.com/hyperchainproject-2935/pasti-v2/settings/environment-variables
2. Tambah 2 env vars baru:

| Key | Value | Environments |
|-----|-------|--------------|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | `0x...` (Site Key, plain/sensitive) | Production + Preview + Development |
| `TURNSTILE_SECRET_KEY` | `0x...` (Secret Key, encrypted) | Production + Preview + Development |

3. Save

### Step 3: Redeploy

1. Di Vercel dashboard project `pasti-v2` → **Deployments**
2. Klik titik tiga (`...`) di deployment terakhir → **Redeploy**
3. Tunggu ~2-3 menit sampai status READY

### Step 4: Verifikasi

Buka https://pasti-v2-delta.vercel.app/login → widget Cloudflare Turnstile (bukan dev mode banner) akan muncul di bawah form password.

---

## Verifikasi Captcha Server-Side (sudah aktif)

Independen dari widget client-side, semua 4 auth API route sudah menolak request tanpa valid captcha token:

| Endpoint | Captcha Check | Without Captcha |
|----------|---------------|-----------------|
| `POST /api/auth/register` | ✅ inline `verifyCaptcha()` | 400 "Captcha wajib diisi" |
| `POST /api/auth/callback/credentials` (login) | ✅ di dalam `authorize()` NextAuth | 401 CredentialsSignin error |
| `POST /api/auth/forgot-password` | ✅ inline `verifyCaptcha()` | 400 "Captcha wajib diisi" |
| `POST /api/auth/reset-password` | ✅ inline `verifyCaptcha()` | 400 "Captcha wajib diisi" |

### Behavior:
- **Saat `TURNSTILE_SECRET_KEY` TIDAK di-set** (dev mode): Server accepts any non-empty token, log warning `[captcha] TURNSTILE_SECRET_KEY not set — accepting token in dev mode` ke server console. UI badge kecil "(server-side)" muncul, tidak mengganggu visual.
- **Saat `TURNSTILE_SECRET_KEY` di-set** (production): Server calls Cloudflare API untuk verify token secara real. UI menampilkan widget Turnstile asli.

---

## Troubleshooting

### "Invalid API Token" saat run script
- Cloudflare token harus punya permission "Account → Turnstile → Edit"
- Token harus include akun yang benar (Account Resources)
- Token tidak boleh expired

### Turnstile widget tidak muncul di production
1. Cek Vercel env vars sudah di-set dengan benar
2. Pastikan `NEXT_PUBLIC_TURNSTILE_SITE_KEY` ( dengan prefix `NEXT_PUBLIC_` agar bisa diakses client-side)
3. Redeploy project (env vars baru aktif setelah deploy baru)
4. Clear browser cache + hard refresh (Cmd/Ctrl + Shift + R)

### Widget muncul tapi verification gagal
- Cek domain di widget Cloudflare match dengan URL production
- Cek `TURNSTILE_SECRET_KEY` tidak ada typo
- Lihat server logs di Vercel untuk error detail

### Setup via Script
- File: `scripts/setup_turnstile.py`
- Membutuhkan: `CF_API_TOKEN` (Cloudflare API token dengan Turnstile edit permission) + `VERCEL_PAT` + `GITHUB_PAT_CLASSIC` (sudah ada di .env)
- Output: env vars set di Vercel + local .env updated + deployment otomatis triggered

### Setup Manual
- Buka https://dash.cloudflare.com → Turnstile → Add site
- Domain: `pasti-v2-delta.vercel.app`
- Mode: Managed (recommended)
- Copy Site Key + Secret Key → set sebagai 2 env vars di Vercel

---

## Biaya & Limits

Cloudflare Turnstile **100% gratis** untuk unlimited:
- Unlimited widgets per account
- Unlimited verifications per month
- No domain restrictions
- No signup fees

Vercel free tier (current setup) sudah cukup.
