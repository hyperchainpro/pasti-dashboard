// GET /admin/data — Returns admin dashboard stats
// Admin-only: requires session.user.role === "admin"

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin access required' }, { status: 403 })
  }

  const [
    totalUsers,
    totalApiKeys,
    totalAgentLogs,
    totalProducts,
    totalSales,
    totalPurchaseOrders,
    activeUsersToday,
    recentUsers,
    recentAgentLogs,
    apiKeysByProvider,
    lockedAccounts,
  ] = await Promise.all([
    db.user.count(),
    db.apiKey.count(),
    db.agentLog.count(),
    db.product.count(),
    db.sale.count(),
    db.purchaseOrder.count(),
    db.user.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
    db.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: { select: { apiKeys: true, agentLogs: true } },
      },
    }),
    db.agentLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        traceId: true,
        userId: true,
        timestamp: true,
        step: true,
        createdAt: true,
      },
    }),
    db.apiKey.groupBy({
      by: ['provider'],
      _count: { _all: true },
      orderBy: { _count: { id: 'desc' } },
    }),
    db.ownerPreference.findMany({
      where: { prefKey: { startsWith: 'lockout:' } },
      select: { prefKey: true, prefValue: true, updatedAt: true },
    }),
  ])

  // Parse locked accounts data
  const lockedAccountsParsed = lockedAccounts.map((l) => {
    try {
      const data = JSON.parse(l.prefValue)
      return {
        email: l.prefKey.replace('lockout:', ''),
        failedAttempts: data.failedAttempts,
        lockedUntil: data.lockedUntil ? new Date(data.lockedUntil) : null,
        updatedAt: l.updatedAt,
      }
    } catch {
      return null
    }
  }).filter((x): x is NonNullable<typeof x> => x !== null)

  return NextResponse.json({
    stats: {
      totalUsers,
      totalApiKeys,
      totalAgentLogs,
      totalProducts,
      totalSales,
      totalPurchaseOrders,
      activeUsersToday,
      lockedAccountsCount: lockedAccountsParsed.filter((a) => a.lockedUntil && a.lockedUntil > new Date()).length,
    },
    recentUsers,
    recentAgentLogs,
    apiKeysByProvider: apiKeysByProvider.map((p) => ({
      provider: p.provider,
      count: p._count._all,
    })),
    lockedAccounts: lockedAccountsParsed,
  })
}

// PATCH /admin/data — Promote user to admin (admin-only)
export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin access required' }, { status: 403 })
  }

  const { userId, role } = await req.json()
  if (!userId || !['user', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'Invalid userId or role' }, { status: 400 })
  }

  const updated = await db.user.update({
    where: { id: userId },
    data: { role },
    select: { id: true, name: true, email: true, role: true },
  })

  return NextResponse.json({ success: true, user: updated })
}
