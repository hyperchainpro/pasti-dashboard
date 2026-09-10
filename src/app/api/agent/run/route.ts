import { NextResponse } from 'next/server'
import { runAgent } from '@/lib/agent-runner'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const maxDuration = 60 // Vercel Pro: 60s, Hobby: 10s (auto-clamped)

function decryptKey(stored: string): string {
  try {
    return Buffer.from(stored, 'base64').toString('utf-8')
  } catch {
    return ''
  }
}

export async function POST(req: Request) {
  // ── Resolve API key + model ──
  // Priority: user's active custom API key > server-wide OPENROUTER_API_KEY
  let apiKey: string | undefined
  let model: string | undefined
  let baseUrl: string | undefined
  let userId: string | undefined
  let userDisplayName: string | undefined

  const session = await auth()
  if (session?.user?.id) {
    userId = session.user.id
    userDisplayName = session.user.name || session.user.email
    // Look up user's active API key
    const userKey = await db.apiKey.findFirst({
      where: { userId, isActive: true },
      orderBy: { updatedAt: 'desc' },
    })
    if (userKey) {
      apiKey = decryptKey(userKey.key)
      if (userKey.model) model = userKey.model
      if (userKey.baseUrl) baseUrl = userKey.baseUrl

      // Update lastUsedAt (fire and forget)
      db.apiKey.update({
        where: { id: userKey.id },
        data: { lastUsedAt: new Date() },
      }).catch(() => {})
    }
  }

  // Fallback to server env if no user key
  if (!apiKey) {
    apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            'OPENROUTER_API_KEY is not set. Get one at https://openrouter.ai/keys and add to .env, or set a custom API key in Settings.',
        },
        { status: 503 }
      )
    }
  }

  try {
    const result = await runAgent({ apiKey, model, baseUrl, userId })

    // ── Persist to Neon DB ──
    let saved = false
    try {
      if (process.env.DATABASE_URL?.startsWith('postgres')) {
        await db.agentLog.upsert({
          where: { traceId: result.trace_id },
          update: {
            userId: userId || null,
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
              run_by: userDisplayName || 'system',
            }),
          },
          create: {
            traceId: result.trace_id,
            userId: userId || null,
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
              run_by: userDisplayName || 'system',
            }),
          },
        })

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

    // Always mirror to in-memory store as fallback
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
              run_by: userDisplayName || 'system',
            }),
          }),
        })
      } catch {
        // best-effort only
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
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    name: 'PASTI Agent Run API',
    description:
      'Trigger the 7-step PASTI procurement agent via OpenRouter (or user custom API key). ' +
      'Perceives inventory, forecasts demand, compares suppliers, ' +
      'creates draft POs, and (in production) sends Telegram approval.',
    method: 'POST',
    auth: 'Optional — logged-in users can use custom API keys from /settings',
    docs: '/docs/NEON_DB_SETUP.md',
  })
}
