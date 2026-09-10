// ─────────────────────────────────────────────────────────────
// PASTI — OpenRouter client (LLM agent simulation)
// ─────────────────────────────────────────────────────────────
// OpenRouter is a unified LLM gateway (https://openrouter.ai) that supports
// Anthropic, OpenAI, Meta Llama, Google Gemini, Qwen, etc. via a single API.
//
// This client wraps chat completions with tool-calling and streams reasoning
// steps back so the dashboard can render a live agent trace.

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_call_id?: string
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: { name: string; arguments: string }
  }>
}

export interface OpenRouterTool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown> // JSON Schema
  }
}

export interface OpenRouterResponse {
  text: string
  toolCalls?: OpenRouterMessage['tool_calls']
  raw: unknown
  tokensIn?: number
  tokensOut?: number
  model: string
  usedFallback?: boolean
}

export interface OpenRouterOptions {
  apiKey?: string
  model?: string
  baseUrl?: string
  temperature?: number
  maxTokens?: number
  siteUrl?: string
  siteName?: string
  signal?: AbortSignal
  _retried?: boolean  // internal: prevent infinite retry loop
}

/**
 * Send a chat completion request to OpenRouter.
 * Returns assistant text + optional tool_calls.
 */
export async function chatCompletion(
  messages: OpenRouterMessage[],
  tools: OpenRouterTool[] = [],
  opts: OpenRouterOptions = {}
): Promise<OpenRouterResponse> {
  let apiKey = opts.apiKey || process.env.OPENROUTER_API_KEY
  let model = opts.model || process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.2-3b-instruct:free'

  if (!apiKey) {
    throw new Error(
      'OPENROUTER_API_KEY is not set. Get one at https://openrouter.ai/keys and put it in .env'
    )
  }

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.maxTokens ?? 800,
  }
  if (tools.length > 0) {
    body.tools = tools
    body.tool_choice = 'auto'
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }
  if (opts.siteUrl || process.env.OPENROUTER_SITE_URL) {
    headers['HTTP-Referer'] = opts.siteUrl || process.env.OPENROUTER_SITE_URL || ''
  }
  if (opts.siteName || process.env.OPENROUTER_SITE_NAME) {
    headers['X-Title'] = opts.siteName || process.env.OPENROUTER_SITE_NAME || 'PASTI'
  }

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: opts.signal,
  })

  if (!res.ok) {
    const errText = await res.text()
    // ── Retry for 429 rate limit (1 retry with 1.5s backoff) ──
    if (res.status === 429 && !opts._retried) {
      console.warn('[openrouter] Rate limited (429), retrying after 1.5s backoff')
      await new Promise((r) => setTimeout(r, 1500))
      return chatCompletion(messages, tools, { ...opts, _retried: true })
    }

    // ── Fallback for 401/403: if user's custom API key fails authentication,
    // retry once with server's default OPENROUTER_API_KEY + default model
    if (
      (res.status === 401 || res.status === 403) &&
      opts.apiKey &&  // was using custom key
      opts.apiKey !== process.env.OPENROUTER_API_KEY &&  // different from server
      process.env.OPENROUTER_API_KEY  // server key available
    ) {
      console.warn(
        `[openrouter] Custom API key failed (${res.status}), falling back to server key`
      )
      const fallbackBody = {
        ...body,
        model: process.env.OPENROUTER_MODEL || model,
      }
      const fallbackRes = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          ...(process.env.OPENROUTER_SITE_URL
            ? { 'HTTP-Referer': process.env.OPENROUTER_SITE_URL }
            : {}),
          ...(process.env.OPENROUTER_SITE_NAME
            ? { 'X-Title': process.env.OPENROUTER_SITE_NAME }
            : {}),
        },
        body: JSON.stringify(fallbackBody),
        signal: opts.signal,
      })
      if (!fallbackRes.ok) {
        const fallbackErr = await fallbackRes.text()
        throw new Error(
          `OpenRouter fallback also failed (${fallbackRes.status}): ${fallbackErr}`
        )
      }
      const fallbackData = await fallbackRes.json()
      const fallbackChoice = fallbackData.choices?.[0]?.message ?? {}
      return {
        text: fallbackChoice.content ?? '',
        toolCalls: fallbackChoice.tool_calls,
        raw: fallbackData,
        tokensIn: fallbackData.usage?.prompt_tokens,
        tokensOut: fallbackData.usage?.completion_tokens,
        model: fallbackData.model || process.env.OPENROUTER_MODEL || model,
        usedFallback: true,
      }
    }
    throw new Error(`OpenRouter ${res.status}: ${errText}`)
  }

  const data = await res.json()
  const choice = data.choices?.[0]?.message ?? {}
  const text: string = choice.content ?? ''
  const toolCalls = choice.tool_calls

  return {
    text,
    toolCalls,
    raw: data,
    tokensIn: data.usage?.prompt_tokens,
    tokensOut: data.usage?.completion_tokens,
    model: data.model || model,
  }
}

/**
 * Generate a concise Indonesian-language narration from a structured trace.
 * Used to build the agent's final "hasil" message for Telegram / dashboard.
 */
export async function summarizeTrace(
  traceSummary: string,
  opts: OpenRouterOptions = {}
): Promise<string> {
  const messages: OpenRouterMessage[] = [
    {
      role: 'system',
      content:
        'Kamu adalah asisten yang merangkum jejak eksekusi agent procurement. ' +
        'Buat ringkasan singkat (maks 2 kalimat) dalam Bahasa Indonesia yang ' +
        'bisa dikirim ke owner warung. Jangan gunakan istilah teknis.',
    },
    { role: 'user', content: traceSummary },
  ]
  const r = await chatCompletion(messages, [], { ...opts, maxTokens: 200, temperature: 0.3 })
  return r.text.trim()
}
