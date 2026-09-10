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
}

export interface OpenRouterOptions {
  apiKey?: string
  model?: string
  temperature?: number
  maxTokens?: number
  siteUrl?: string
  siteName?: string
  signal?: AbortSignal
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
  const apiKey = opts.apiKey || process.env.OPENROUTER_API_KEY
  const model = opts.model || process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.2-3b-instruct:free'

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
