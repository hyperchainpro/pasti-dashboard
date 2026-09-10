// /api/api-keys/[id] — DELETE + PATCH (activate/deactivate) for specific key

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const body = await req.json().catch(() => ({}))

  // Verify ownership
  const key = await db.apiKey.findUnique({ where: { id } })
  if (!key || key.userId !== session.user.id) {
    return NextResponse.json({ error: 'API key tidak ditemukan' }, { status: 404 })
  }

  const updated = await db.apiKey.update({
    where: { id },
    data: {
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      ...(body.name ? { name: body.name } : {}),
      ...(body.model !== undefined ? { model: body.model } : {}),
      ...(body.baseUrl !== undefined ? { baseUrl: body.baseUrl } : {}),
    },
    select: { id: true, name: true, isActive: true, model: true, baseUrl: true },
  })
  return NextResponse.json({ success: true, key: updated })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  // Verify ownership
  const key = await db.apiKey.findUnique({ where: { id } })
  if (!key || key.userId !== session.user.id) {
    return NextResponse.json({ error: 'API key tidak ditemukan' }, { status: 404 })
  }

  await db.apiKey.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
