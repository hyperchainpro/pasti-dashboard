// GET /profile/data — Returns user profile + stats + recent activity

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      emailVerified: true,
      createdAt: true,
    },
  })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const [apiKeyCount, agentLogCount, lastAgentLog, recentLogs] = await Promise.all([
    db.apiKey.count({ where: { userId: user.id } }),
    db.agentLog.count({ where: { userId: user.id } }),
    db.agentLog.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
    db.agentLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { traceId: true, timestamp: true, step: true, createdAt: true },
    }),
  ])

  return NextResponse.json({
    user,
    stats: {
      apiKeyCount,
      agentLogCount,
      lastRun: lastAgentLog?.createdAt || null,
    },
    recentLogs,
  })
}
