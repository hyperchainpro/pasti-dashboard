// POST /api/auth/forgot-password
// Body: { email, captchaToken }
// Generates a reset token, saves to PasswordReset table, emails link via SMTP (nodemailer)
// or returns the token in dev mode (no SMTP configured)

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import nodemailer from 'nodemailer'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { email, captchaToken } = await req.json()
    if (!email || !captchaToken) {
      return NextResponse.json({ error: 'Email dan captcha wajib diisi' }, { status: 400 })
    }
    const normalizedEmail = email.toLowerCase().trim()

    // Verify captcha
    const origin = req.headers.get('origin') || 'http://localhost:3000'
    const captchaRes = await fetch(`${origin}/api/auth/verify-captcha`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: captchaToken }),
    })
    const captchaData = await captchaRes.json()
    if (!captchaData.success) {
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

    // Generate secure token (32 bytes = 64 hex chars)
    const token = await crypto.getRandomValues(new Uint8Array(32)).then((bytes) =>
      Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
    )
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await db.passwordReset.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    })

    const appUrl = process.env.NEXTAUTH_URL || origin
    const resetUrl = `${appUrl}/reset-password?token=${token}`

    // ── Try to send email via SMTP if configured ──
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
      // Dev mode: log the reset URL
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
