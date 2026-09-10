// POST /api/auth/reset-password
// Body: { token, newPassword, captchaToken }

import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

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
    const { token, newPassword, captchaToken } = await req.json()
    if (!token || !newPassword || !captchaToken) {
      return NextResponse.json(
        { error: 'Token, password baru, dan captcha wajib diisi' },
        { status: 400 }
      )
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password minimal 8 karakter' }, { status: 400 })
    }

    // Verify captcha directly
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
    const captchaOk = await verifyCaptcha(captchaToken, ip)
    if (!captchaOk) {
      return NextResponse.json({ error: 'Verifikasi captcha gagal' }, { status: 400 })
    }

    // Find token
    const resetRecord = await db.passwordReset.findUnique({
      where: { token },
      include: { user: true },
    })
    if (!resetRecord) {
      return NextResponse.json({ error: 'Token tidak valid' }, { status: 400 })
    }
    if (resetRecord.usedAt) {
      return NextResponse.json(
        { error: 'Token sudah digunakan. Silakan ajukan reset password baru.' },
        { status: 400 }
      )
    }
    if (resetRecord.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Token sudah kedaluwarsa. Silakan ajukan reset password baru.' },
        { status: 400 }
      )
    }

    // Hash new password + update user
    const hashedPassword = await bcrypt.hash(newPassword, 12)
    await db.$transaction([
      db.user.update({
        where: { id: resetRecord.userId },
        data: { password: hashedPassword },
      }),
      db.passwordReset.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
    ])

    return NextResponse.json({
      success: true,
      message: 'Password berhasil direset. Silakan login dengan password baru.',
    })
  } catch (err) {
    console.error('Reset password error:', err)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server: ' + String(err) },
      { status: 500 }
    )
  }
}
