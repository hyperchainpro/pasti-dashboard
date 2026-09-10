import { NextResponse } from 'next/server'
import { getAgentLogs } from '@/lib/demo-data'
import { db } from '@/lib/db'

// ── In-memory store for agent logs when DB is not configured ──
// Persisted in module scope across requests in dev (HMR-safe via global).
const globalForLogs = globalThis as unknown as {
  pastiInMemoryLogs?: Array<{
    traceId: string
    timestamp: string
    step: string
    detail: string
  }>
}
if (!globalForLogs.pastiInMemoryLogs) globalForLogs.pastiInMemoryLogs = []

export async function GET() {
  // 1) Try Neon DB first
  if (process.env.DATABASE_URL?.startsWith('postgres')) {
    try {
      const dbLogs = await db.agentLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
      })
      if (dbLogs.length > 0) {
        return NextResponse.json(
          dbLogs.map((l) => ({
            traceId: l.traceId,
            timestamp: l.timestamp,
            step: l.step,
            detail: l.detail,
          }))
        )
      }
    } catch (err) {
      console.warn('DB read failed, falling back to static + in-memory:', err)
    }
  }

  // 2) In-memory logs from current session (live agent runs)
  const inMemory = globalForLogs.pastiInMemoryLogs || []

  // 3) Static fallback from JSON seed file
  const staticLogs = getAgentLogs().map((log) => ({
    traceId: log.trace_id,
    timestamp: log.waktu,
    step: log.keputusan,
    detail: JSON.stringify({
      thoughts: log.thoughts,
      tools_called: log.tools_called,
      keputusan: log.keputusan,
      hasil: log.hasil,
    }),
  }))

  return NextResponse.json([...inMemory, ...staticLogs])
}

export async function POST(req: Request) {
  // Allow caller to push a new agent log without DB (used by /api/agent/run
  // when DATABASE_URL is not configured).
  try {
    const body = await req.json()
    const entry = {
      traceId: body.traceId || `trace-${Date.now()}`,
      timestamp: body.timestamp || new Date().toISOString(),
      step: body.step || 'Agent run completed',
      detail: body.detail || JSON.stringify(body),
    }
    globalForLogs.pastiInMemoryLogs!.unshift(entry)
    if (globalForLogs.pastiInMemoryLogs!.length > 50) {
      globalForLogs.pastiInMemoryLogs!.pop()
    }
    return NextResponse.json({ success: true, log: entry })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    )
  }
}
