// POST /api/auth/register
// Body: { name, email, password, captchaToken }
// Verifies captcha → hashes password (bcrypt) → creates User in Neon → returns success

import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
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

    // ── Verify captcha ──
    const origin = req.headers.get('origin') || 'http://localhost:3000'
    const captchaRes = await fetch(`${origin}/api/auth/verify-captcha`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: captchaToken }),
    })
    const captchaData = await captchaRes.json()
    if (!captchaData.success) {
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
