// POST /api/auth/forgot-password
// Body: { email, captchaToken }
// Generates a reset token, saves to PasswordReset table, emails link via SMTP (nodemailer)
// or returns the token in dev mode (no SMTP configured)

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import nodemailer from 'nodemailer'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const maxDuration = 30

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
    // ── Rate limit: 3 forgot-password requests per hour per IP ──
    const ip = getClientIp(req)
    const rl = checkRateLimit('auth:forgot-password', ip)
    if (!rl.success) {
      return NextResponse.json(
        {
          error: `Terlalu banyak permintaan reset password. Coba lagi dalam ${Math.ceil(
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

    const { email, captchaToken } = await req.json()
    if (!email || !captchaToken) {
      return NextResponse.json({ error: 'Email dan captcha wajib diisi' }, { status: 400 })
    }
    const normalizedEmail = email.toLowerCase().trim()

    // Verify captcha directly (re-use ip from rate limit check)
    const captchaOk = await verifyCaptcha(captchaToken, ip)
    if (!captchaOk) {
      return NextResponse.json({ error: 'Verifikasi captcha gagal' }, { status: 400 })
    }

    // Always return success even if email doesn't exist (security: prevent email enumeration)
    const genericResponse = {
      success: true,
      message:
        'Jika email terdaftar, link reset password telah dikirim. Cek folder spam jika tidak ada dalam 5 menit.',
    }

    const user = await db.user.findUnique({ where: { email: normalizedEmail } })
    if (!user) {
      return NextResponse.json(genericResponse)
    }

    // Generate secure token
    const randomBytes = new Uint8Array(32)
    crypto.getRandomValues(randomBytes)
    const token = Array.from(randomBytes).map((b) => b.toString(16).padStart(2, '0')).join('')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await db.passwordReset.create({
      data: { userId: user.id, token, expiresAt },
    })

    const appUrl = process.env.NEXTAUTH_URL || `https://${req.headers.get('host')}`
    const resetUrl = `${appUrl}/reset-password?token=${token}`

    const smtpHost = process.env.SMTP_HOST
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS
    const smtpFrom = process.env.SMTP_FROM || smtpUser

    if (smtpHost && smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: smtpUser, pass: smtpPass },
      })
      await transporter.sendMail({
        from: smtpFrom,
        to: user.email,
        subject: '[PASTI] Reset Password Anda',
        html: `
          <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #10b981;">PASTI Dashboard</h2>
            <p>Halo ${user.name || 'Pengguna'},</p>
            <p>Kami menerima permintaan reset password untuk akun Anda.</p>
            <p>Klik tombol di bawah untuk reset password (berlaku 1 jam):</p>
            <p>
              <a href="${resetUrl}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                Reset Password
              </a>
            </p>
            <p style="color: #6b7280; font-size: 12px; margin-top: 16px;">
              Atau salin link ini ke browser: ${resetUrl}
            </p>
            <p style="color: #6b7280; font-size: 12px;">
              Jika Anda tidak meminta reset password, abaikan email ini.
            </p>
          </div>
        `,
      })
    } else {
      console.log(`\n[DEV] Password reset link for ${user.email}:\n  ${resetUrl}\n`)
    }

    return NextResponse.json(genericResponse)
  } catch (err) {
    console.error('Forgot password error:', err)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server: ' + String(err) },
      { status: 500 }
    )
  }
}
