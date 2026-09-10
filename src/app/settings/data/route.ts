// GET /settings/data — Returns user's API keys + server config info

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userKeys = await db.apiKey.findMany({
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
    },
  })

  const maskedKeys = userKeys.map((k) => {
    let decrypted = k.key
    try {
      decrypted = Buffer.from(k.key, 'base64').toString('utf-8')
    } catch {}
    const masked = decrypted.length <= 12 ? '****' : decrypted.slice(0, 6) + '****' + decrypted.slice(-4)
    return {
      ...k,
      key: masked,
      lastUsedAt: k.lastUsedAt ? k.lastUsedAt.toISOString() : null,
      createdAt: k.createdAt.toISOString(),
    }
  })

  return NextResponse.json({
    keys: maskedKeys,
    hasServerKey: !!process.env.OPENROUTER_API_KEY,
    serverModel: process.env.OPENROUTER_MODEL || '(not set)',
  })
}
