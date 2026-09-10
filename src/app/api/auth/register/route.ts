// POST /api/auth/register
// Body: { name, email, password, captchaToken }
// Verifies captcha → hashes password (bcrypt) → creates User in Neon → returns success

import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/api/v3/siteverify'

async function verifyCaptcha(token: string, ip?: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    console.warn('[captcha] TURNSTILE_SECRET_KEY not set — accepting token in dev mode')
    return true
  }
  const formData = new FormData()
  formData.append('secret', secret)
  formData.append('response', token)
  if (ip) formData.append('remoteip', ip)
  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, { method: 'POST', body: formData })
    const data = await res.json()
    return !!data.success
  } catch {
    return false
  }
}

export async function POST(req: Request) {
  try {
    // ── Rate limit: 3 registrations per hour per IP ──
    const ip = getClientIp(req)
    const rl = checkRateLimit('auth:register', ip)
    if (!rl.success) {
      return NextResponse.json(
        {
          error: `Terlalu banyak percobaan registrasi. Coba lagi dalam ${Math.ceil(
            rl.retryAfterSec / 60
          )} menit.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rl.retryAfterSec),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rl.resetAt),
          },
        }
      )
    }

    const { name, email, password, captchaToken } = await req.json()

    // ── Validate inputs ──
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'Nama minimal 2 karakter' }, { status: 400 })
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Format email tidak valid' }, { status: 400 })
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password minimal 8 karakter' }, { status: 400 })
    }
    if (!captchaToken) {
      return NextResponse.json({ error: 'Captcha wajib diisi' }, { status: 400 })
    }

    // Verify captcha directly (re-use ip from rate limit check)
    const captchaOk = await verifyCaptcha(captchaToken, ip)
    if (!captchaOk) {
      return NextResponse.json(
        { error: 'Verifikasi captcha gagal. Silakan coba lagi.' },
        { status: 400 }
      )
    }

    // ── Check if email already exists ──
    const normalizedEmail = email.toLowerCase().trim()
    const existing = await db.user.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
      return NextResponse.json(
        { error: 'Email sudah terdaftar. Silakan login.' },
        { status: 409 }
      )
    }

    // ── Create user ──
    const hashedPassword = await bcrypt.hash(password, 12)
    const user = await db.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: 'user',
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })

    return NextResponse.json({
      success: true,
      message: 'Akun berhasil dibuat. Silakan login.',
      user,
    })
  } catch (err) {
    console.error('Register error:', err)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server: ' + String(err) },
      { status: 500 }
    )
  }
}
