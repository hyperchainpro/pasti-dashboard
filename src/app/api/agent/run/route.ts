import { NextResponse } from 'next/server'
import { runAgent } from '@/lib/agent-runner'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const maxDuration = 60 // Vercel Pro: 60s, Hobby: 10s (auto-clamped)

export async function POST(req: Request) {
  const hasOpenRouter = !!process.env.OPENROUTER_API_KEY
  if (!hasOpenRouter) {
    return NextResponse.json(
      {
        success: false,
        error:
          'OPENROUTER_API_KEY is not set. Get one at https://openrouter.ai/keys and add to .env',
      },
      { status: 503 }
    )
  }

  try {
    const result = await runAgent()

    // Try to persist to DB (best-effort — dashboard should still work
    // even if Neon is not configured, falling back to in-memory).
    let saved = false
    try {
      if (process.env.DATABASE_URL?.startsWith('postgres')) {
        await db.agentLog.upsert({
          where: { traceId: result.trace_id },
          update: {
            timestamp: result.waktu,
            step: result.keputusan,
            detail: JSON.stringify({
              thoughts: result.thoughts,
              tools_called: result.tools_called,
              keputusan: result.keputusan,
              hasil: result.hasil,
              steps: result.steps,
              created_pos: result.created_pos,
              model: result.model,
              tokens: { in: result.tokens_in, out: result.tokens_out },
              duration_ms: result.duration_ms,
            }),
          },
          create: {
            traceId: result.trace_id,
            timestamp: result.waktu,
            step: result.keputusan,
            detail: JSON.stringify({
              thoughts: result.thoughts,
              tools_called: result.tools_called,
              keputusan: result.keputusan,
              hasil: result.hasil,
              steps: result.steps,
              created_pos: result.created_pos,
              model: result.model,
              tokens: { in: result.tokens_in, out: result.tokens_out },
              duration_ms: result.duration_ms,
            }),
          },
        })

        // Also persist created POs so they show up in the Orders tab
        for (const po of result.created_pos) {
          await db.purchaseOrder.upsert({
            where: { poId: po.po_id },
            update: { status: po.status },
            create: {
              poId: po.po_id,
              items: JSON.stringify(po.items),
              supplierId: po.supplier_id,
              totalHarga: po.total,
              status: po.status,
              createdAt: new Date().toISOString(),
            },
          })
        }
        saved = true
      }
    } catch (dbErr) {
      console.warn('DB save failed (continuing in-memory only):', dbErr)
    }

    // Always mirror to in-memory store so the dashboard reflects the latest
    // run even without DB connectivity (fallback for demo day).
    if (!saved) {
      try {
        await fetch(`${req.headers.get('origin') || 'http://localhost:3000'}/api/agent-logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            traceId: result.trace_id,
            timestamp: result.waktu,
            step: result.keputusan,
            detail: JSON.stringify({
              thoughts: result.thoughts,
              tools_called: result.tools_called,
              keputusan: result.keputusan,
              hasil: result.hasil,
              steps: result.steps,
              created_pos: result.created_pos,
              model: result.model,
              tokens: { in: result.tokens_in, out: result.tokens_out },
              duration_ms: result.duration_ms,
            }),
          }),
        })
      } catch {
        // Best-effort only
      }
    }

    return NextResponse.json({
      success: true,
      saved_to_db: saved,
      ...result,
    })
  } catch (err) {
    console.error('Agent run error:', err)
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    name: 'PASTI Agent Run API',
    description:
      'Trigger the 7-step PASTI procurement agent via OpenRouter. ' +
      'Perceives inventory, forecasts demand, compares suppliers, ' +
      'creates draft POs, and (in production) sends Telegram approval.',
    method: 'POST',
    auth: 'Requires OPENROUTER_API_KEY in env',
    docs: '/docs/NEON_DB_SETUP.md',
  })
}
