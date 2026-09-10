// /api/api-keys — CRUD for user's custom LLM API keys
// GET: list current user's keys (masked)
// POST: add new key

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

function maskKey(key: string): string {
  if (key.length <= 12) return '****'
  return key.slice(0, 6) + '****' + key.slice(-4)
}

function encryptKey(plain: string): string {
  // Simple base64 obfuscation (NOT cryptographic — for production use AES-GCM)
  // For true encryption at rest, integrate KMS or libsodium
  return Buffer.from(plain).toString('base64')
}

function decryptKey(stored: string): string {
  try {
    return Buffer.from(stored, 'base64').toString('utf-8')
  } catch {
    return ''
  }
}

// Helper: get decrypted key for a user (used by agent-runner)
export async function getActiveApiKeyForUser(userId: string, preferredProvider?: string) {
  const where: { userId: string; isActive: boolean; provider?: string } = {
    userId,
    isActive: true,
  }
  if (preferredProvider) where.provider = preferredProvider
  const key = await db.apiKey.findFirst({
    where,
    orderBy: { updatedAt: 'desc' },
  })
  if (!key) return null
  return {
    ...key,
    decryptedKey: decryptKey(key.key),
  }
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const keys = await db.apiKey.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      provider: true,
      key: true,
      baseUrl: true,
      model: true,
      isActive: true,
      lastUsedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  })
  const masked = keys.map((k) => ({
    ...k,
    key: maskKey(decryptKey(k.key)),
  }))
  return NextResponse.json(masked)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { name, provider, key, baseUrl, model } = await req.json()
    if (!name || !provider || !key) {
      return NextResponse.json(
        { error: 'name, provider, dan key wajib diisi' },
        { status: 400 }
      )
    }
    const validProviders = ['openrouter', 'openai', 'anthropic', 'xyphosrouter', 'custom']
    if (!validProviders.includes(provider)) {
      return NextResponse.json({ error: 'Provider tidak valid' }, { status: 400 })
    }

    const created = await db.apiKey.create({
      data: {
        userId: session.user.id,
        name: name.trim(),
        provider,
        key: encryptKey(key),
        baseUrl: baseUrl || null,
        model: model || null,
        isActive: true,
      },
    })
    return NextResponse.json({
      success: true,
      id: created.id,
      message: 'API key berhasil ditambahkan',
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Server error: ' + String(err) },
      { status: 500 }
    )
  }
}
