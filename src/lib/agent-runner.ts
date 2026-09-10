// ─────────────────────────────────────────────────────────────
// PASTI — Agent runner: orchestrates 7-step loop with OpenRouter
// ─────────────────────────────────────────────────────────────
// Mirrors the Bedrock Agent flow described in
// `bedrock_agent/system_prompt.txt`:
//   1. PERCEIVE  — get_inventory_status + get_sales_history
//   2. REASON    — analyze stock, identify critical items
//   3. FORECAST  — forecast_demand for critical items
//   4. COMPARE   — get_supplier_offers for items needing reorder
//   5. SELF-CHECK — validate budget, min order, owner pref
//   6. ACT       — create_draft_po + send_telegram_approval
//   7. LEARN     — log decision & result
//
// Output: structured trace that maps directly to `AgentLog.detail`.

import { chatCompletion, summarizeTrace, type OpenRouterMessage } from './openrouter'
import { PASTI_TOOLS, executeTool, newToolContext, type ToolContext } from './agent-tools'
import { getEnrichedProducts } from './demo-data'

const SYSTEM_PROMPT = `Kamu adalah PASTI, asisten AI pembelian otonom untuk usaha kuliner Indonesia.

Tugasmu: memastikan stok bahan baku selalu tersedia dengan biaya minimum.

PRINSIP INTI: LLM mengatur, kode menghitung.
Kamu TIDAK menghitung angka. Gunakan tool forecast_demand untuk semua perhitungan.

Alur wajib setiap run (panggil tool satu per satu, jangan lompat):
1. PERCEIVE: panggil get_inventory_status, lalu get_sales_history
2. REASON: identifikasi item dengan status="critical" atau "warning"
3. FORECAST: panggil forecast_demand untuk SETIAP item kritis
4. COMPARE: panggil get_supplier_offers untuk item yang perlu_order=true
5. SELF-CHECK: pilih supplier termurah yang memenuhi min_order; hindari over-order
6. ACT: panggil create_draft_po dengan supplier & qty terpilih, lalu send_telegram_approval
7. LEARN: berikan ringkasan singkat keputusanmu

Aturan:
- JANGAN menghitung angka sendiri (qty order, total harga, dll)
- JANGAN membuat PO tanpa persetujuan owner (status harus "draft")
- JANGAN abaikan instruksi owner
- Satu PO per supplier per run
- Jika ragu, konservatif (lebih baik over-order sedikit)
- Pesan Telegram harus sederhana dan jelas

Format respons akhir (setelah semua tool dipanggil):
"Selesai. Saya membuat {N} draft PO untuk {suppliers}. Total estimasi pembelian: Rp {total}. Menunggu approval owner via Telegram."

Mulai sekarang.`

export interface AgentStep {
  step: number
  phase: 'PERCEIVE' | 'REASON' | 'FORECAST' | 'COMPARE' | 'SELF-CHECK' | 'ACT' | 'LEARN' | 'ERROR'
  tool?: string
  tool_args?: unknown
  tool_result?: unknown
  thought: string
  timestamp: string
}

export interface AgentRunResult {
  trace_id: string
  waktu: string
  steps: AgentStep[]
  thoughts: string[]
  tools_called: string[]
  keputusan: string
  hasil: string
  created_pos: ToolContext['createdPOs']
  model: string
  tokens_in: number
  tokens_out: number
  duration_ms: number
}

export async function runAgent(opts: {
  apiKey?: string
  model?: string
  signal?: AbortSignal
} = {}): Promise<AgentRunResult> {
  const startedAt = Date.now()
  const traceId = `trace-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase()
  const waktu = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })

  const steps: AgentStep[] = []
  const thoughts: string[] = []
  const toolsCalled: string[] = []
  const ctx = newToolContext()

  const messages: OpenRouterMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content:
        'Mulai run harian. Periksa inventaris, prediksi kebutuhan, buat draft PO untuk item kritis, ' +
        'dan kirim notifikasi ke owner. Hari ini: ' +
        new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    },
  ]

  const MAX_ITERATIONS = 10
  let iteration = 0
  let tokensIn = 0
  let tokensOut = 0
  let modelUsed = opts.model || process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.2-3b-instruct:free'

  while (iteration < MAX_ITERATIONS) {
    iteration++
    const stepNum = iteration

    let response
    try {
      response = await chatCompletion(messages, PASTI_TOOLS, {
        apiKey: opts.apiKey,
        model: opts.model,
        temperature: 0.4,
        maxTokens: 1500,
        signal: opts.signal,
      })
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      steps.push({
        step: stepNum,
        phase: 'ERROR',
        thought: `OpenRouter error: ${errMsg}`,
        timestamp: new Date().toISOString(),
      })
      thoughts.push(`OpenRouter error: ${errMsg}`)
      break
    }

    if (response.tokensIn) tokensIn += response.tokensIn
    if (response.tokensOut) tokensOut += response.tokensOut
    if (response.model) modelUsed = response.model

    // Append assistant message to conversation history
    messages.push({
      role: 'assistant',
      content: response.text || '',
      tool_calls: response.toolCalls,
    })

    // If model returns tool calls, execute them
    if (response.toolCalls && response.toolCalls.length > 0) {
      for (const tc of response.toolCalls) {
        const toolName = tc.function.name
        let toolArgs: Record<string, unknown> = {}
        try {
          toolArgs = JSON.parse(tc.function.arguments || '{}')
        } catch {
          toolArgs = {}
        }

        const phase = phaseForTool(toolName)
        const thought = describeToolCall(toolName, toolArgs)
        toolsCalled.push(toolName)
        thoughts.push(thought)

        const toolResult = executeTool(toolName, toolArgs, ctx)

        steps.push({
          step: stepNum,
          phase,
          tool: toolName,
          tool_args: toolArgs,
          tool_result: JSON.parse(toolResult),
          thought,
          timestamp: new Date().toISOString(),
        })

        // Feed tool result back to LLM
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: toolResult,
        })
      }
      // Continue loop — LLM may want to call another tool or finalize
      continue
    }

    // No tool calls → agent is finalizing
    if (response.text) {
      thoughts.push(response.text)
      steps.push({
        step: stepNum,
        phase: 'LEARN',
        thought: response.text,
        timestamp: new Date().toISOString(),
      })
    }
    break
  }

  // ── Build final decision & result ──
  const keputusan = buildDecision(ctx, steps)
  const hasilRaw = buildHasil(ctx, steps, thoughts)
  const hasil = await summarizeTrace(hasilRaw, { apiKey: opts.apiKey, model: opts.model }).catch(
    () => hasilRaw
  )

  return {
    trace_id: traceId,
    waktu,
    steps,
    thoughts,
    tools_called: toolsCalled,
    keputusan,
    hasil,
    created_pos: ctx.createdPOs,
    model: modelUsed,
    tokens_in: tokensIn,
    tokens_out: tokensOut,
    duration_ms: Date.now() - startedAt,
  }
}

function phaseForTool(toolName: string): AgentStep['phase'] {
  switch (toolName) {
    case 'get_inventory_status':
    case 'get_sales_history':
      return 'PERCEIVE'
    case 'forecast_demand':
      return 'FORECAST'
    case 'get_supplier_offers':
      return 'COMPARE'
    case 'create_draft_po':
      return 'ACT'
    case 'send_telegram_approval':
      return 'ACT'
    default:
      return 'REASON'
  }
}

function describeToolCall(name: string, args: Record<string, unknown>): string {
  switch (name) {
    case 'get_inventory_status':
      return 'Membaca status inventaris semua produk.'
    case 'get_sales_history':
      return args.product_id
        ? `Membaca riwayat penjualan produk ${args.product_id}.`
        : 'Membaca riwayat penjualan semua produk.'
    case 'forecast_demand':
      return `Memprediksi kebutuhan produk ${args.product_id}.`
    case 'get_supplier_offers':
      return `Membandingkan penawaran supplier untuk produk ${args.product_id}.`
    case 'create_draft_po':
      return `Membuat draft PO untuk supplier ${args.supplier_id} dengan ${(args.items as unknown[])?.length || 0} item.`
    case 'send_telegram_approval':
      return `Mengirim draft PO ${args.po_id} ke Telegram owner.`
    default:
      return `Memanggil tool ${name}.`
  }
}

function buildDecision(ctx: ToolContext, steps: AgentStep[]): string {
  const poCount = ctx.createdPOs.length
  if (poCount === 0) {
    const criticalCount = getEnrichedProducts().filter((p) => p.status === 'critical').length
    if (criticalCount === 0) return 'Tidak ada item kritis. Tidak perlu PO hari ini.'
    return `Ditemukan ${criticalCount} item kritis namun agent tidak membuat PO (kemungkinan stok masih di atas safety atau supplier tidak tersedia).`
  }
  const suppliers = [...new Set(ctx.createdPOs.map((p) => p.supplier_nama))].join(', ')
  const total = ctx.createdPOs.reduce((s, p) => s + p.total, 0)
  return `Membuat ${poCount} draft PO untuk supplier: ${suppliers}. Total estimasi pembelian: Rp ${total.toLocaleString('id-ID')}. Menunggu approval owner.`
}

function buildHasil(
  ctx: ToolContext,
  _steps: AgentStep[],
  thoughts: string[]
): string {
  if (ctx.createdPOs.length === 0) {
    return 'Agent selesai berjalan. Tidak ada draft PO yang dibuat hari ini. ' + (thoughts[thoughts.length - 1] || '')
  }
  const lines = ctx.createdPOs.map((po) => {
    const itemLines = po.items
      .map((it) => `   - ${it.nama}: ${it.qty} unit @ Rp ${it.harga_satuan.toLocaleString('id-ID')}`)
      .join('\n')
    return `PO ${po.po_id} → ${po.supplier_nama}\n${itemLines}\n   Total: Rp ${po.total.toLocaleString('id-ID')}`
  })
  return lines.join('\n\n')
}
