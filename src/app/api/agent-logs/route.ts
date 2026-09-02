import { NextResponse } from 'next/server'
import { getAgentLogs } from '@/lib/demo-data'

export async function GET() {
  const logs = getAgentLogs().map(log => ({
    traceId: log.trace_id,
    waktu: log.waktu,
    thoughts: log.thoughts,
    tools_called: log.tools_called,
    keputusan: log.keputusan,
    hasil: log.hasil,
  }))
  return NextResponse.json(logs)
}
