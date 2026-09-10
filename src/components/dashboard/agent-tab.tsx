'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Bot,
  Brain,
  Wrench,
  CheckCircle2,
  MessageSquare,
  Play,
  Loader2,
  AlertCircle,
  Sparkles,
  Clock,
} from 'lucide-react'
import { formatDateTime } from '@/lib/format'
import { toast } from 'sonner'

interface AgentLog {
  traceId: string
  timestamp: string
  step: string
  detail: string
}

interface ParsedLog {
  thoughts: string[]
  tools_called: string[]
  keputusan: string
  hasil: string
  steps?: Array<{
    step: number
    phase: 'PERCEIVE' | 'REASON' | 'FORECAST' | 'COMPARE' | 'SELF-CHECK' | 'ACT' | 'LEARN' | 'ERROR'
    tool?: string
    thought: string
    timestamp: string
  }>
  created_pos?: Array<{
    po_id: string
    supplier_nama: string
    total: number
    status: string
  }>
  model?: string
  tokens?: { in: number; out: number }
  duration_ms?: number
}

interface RunResult {
  success: boolean
  error?: string
  trace_id?: string
  waktu?: string
  thoughts?: string[]
  tools_called?: string[]
  keputusan?: string
  hasil?: string
  steps?: ParsedLog['steps']
  created_pos?: ParsedLog['created_pos']
  model?: string
  tokens_in?: number
  tokens_out?: number
  duration_ms?: number
}

const PHASE_META: Record<string, { color: string; label: string }> = {
  PERCEIVE: { color: 'text-sky-400 bg-sky-500/10 border-sky-500/20', label: 'Persepsi' },
  REASON: { color: 'text-violet-400 bg-violet-500/10 border-violet-500/20', label: 'Reasoning' },
  FORECAST: { color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', label: 'Prediksi' },
  COMPARE: { color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20', label: 'Banding Supplier' },
  'SELF-CHECK': { color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', label: 'Validasi' },
  ACT: { color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', label: 'Aksi' },
  LEARN: { color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', label: 'Catat' },
  ERROR: { color: 'text-red-400 bg-red-500/10 border-red-500/20', label: 'Error' },
}

export function AgentTab() {
  const [logs, setLogs] = useState<AgentLog[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [lastRun, setLastRun] = useState<RunResult | null>(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/agent-logs')
      const data = await r.json()
      setLogs(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const runAgent = async () => {
    setRunning(true)
    setProgress(0)
    setLastRun(null)

    // Simulated progress while agent runs
    const progressTimer = setInterval(() => {
      setProgress((p) => Math.min(p + 8, 90))
    }, 600)

    try {
      const r = await fetch('/api/agent/run', { method: 'POST' })
      const data: RunResult = await r.json()

      clearInterval(progressTimer)
      setProgress(100)

      if (data.success) {
        setLastRun(data)
        toast.success('Agent run selesai', {
          description: `Trace: ${data.trace_id?.slice(0, 16)}… • ${data.duration_ms}ms • ${data.tokens_in || 0}+${data.tokens_out || 0} tokens`,
        })
        // Refresh logs to include the new run
        setTimeout(() => {
          fetchLogs()
          setProgress(0)
        }, 800)
      } else {
        toast.error('Agent run gagal', { description: data.error })
        setProgress(0)
      }
    } catch (err) {
      clearInterval(progressTimer)
      setProgress(0)
      toast.error('Network error', { description: String(err) })
    } finally {
      setRunning(false)
    }
  }

  if (loading) {
    return <AgentSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Agent Info + Run Button */}
      <Card className="border-emerald-500/20 bg-emerald-500/5 backdrop-blur">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-3 flex-1 min-w-[280px]">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                <Bot className="h-5 w-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-emerald-400">PASTI AI Procurement Agent</p>
                  <Badge variant="outline" className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {process.env.NEXT_PUBLIC_AGENT_STATUS || 'Aktif (Simulasi)'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Agent menjalankan 7-step loop: persepsi inventaris → reasoning → prediksi →
                  banding supplier → validasi → buat draft PO → kirim notifikasi. Powered by
                  OpenRouter {lastRun?.model ? `(${lastRun.model})` : '(multi-model LLM)'}.
                </p>
              </div>
            </div>
            <Button
              onClick={runAgent}
              disabled={running}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {running ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Menjalankan...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Agent Now
                </>
              )}
            </Button>
          </div>

          {/* Progress bar */}
          {running && (
            <div className="mt-4 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-400">Sedang menjalankan 7-step agent loop…</span>
                <span className="text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5 bg-emerald-500/10" />
            </div>
          )}

          {/* Last run summary */}
          {lastRun && !running && (
            <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                <span className="font-semibold text-emerald-400">Run Terbaru Berhasil</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{lastRun.trace_id}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Duration</p>
                  <p className="font-mono">{(lastRun.duration_ms || 0).toLocaleString('id-ID')} ms</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tokens</p>
                  <p className="font-mono">{(lastRun.tokens_in || 0) + (lastRun.tokens_out || 0)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tools Called</p>
                  <p className="font-mono">{lastRun.tools_called?.length || 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">POs Created</p>
                  <p className="font-mono">{lastRun.created_pos?.length || 0}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Trace (most recent run) */}
      {lastRun?.steps && lastRun.steps.length > 0 && (
        <Card className="border-emerald-500/30 bg-card/80 backdrop-blur">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <CardTitle className="text-sm font-semibold">Live Trace — {lastRun.trace_id}</CardTitle>
            </div>
            <CardDescription className="text-xs">
              {lastRun.waktu} · {lastRun.model} · {(lastRun.duration_ms || 0).toLocaleString('id-ID')}ms
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {lastRun.steps.map((step, i) => {
              const meta = PHASE_META[step.phase] || PHASE_META.REASON
              return (
                <div key={i} className="flex gap-3 group">
                  <div className="flex flex-col items-center">
                    <div className={`h-7 w-7 rounded-full border flex items-center justify-center text-xs font-mono shrink-0 ${meta.color}`}>
                      {step.step}
                    </div>
                    {i < (lastRun.steps!.length - 1) && (
                      <div className="w-px flex-1 bg-border/50 mt-1" />
                    )}
                  </div>
                  <div className="pb-3 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant="outline" className={`text-xs font-mono ${meta.color}`}>
                        {meta.label}
                      </Badge>
                      {step.tool && (
                        <Badge variant="outline" className="text-xs font-mono bg-amber-500/10 text-amber-400 border-amber-500/20">
                          <Wrench className="h-3 w-3 mr-1" />
                          {step.tool}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {new Date(step.timestamp).toLocaleTimeString('id-ID')}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors">
                      {step.thought}
                    </p>
                  </div>
                </div>
              )
            })}

            {lastRun.keputusan && (
              <div className="mt-4 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <p className="text-xs font-semibold text-emerald-400">Keputusan Akhir</p>
                </div>
                <p className="text-sm text-foreground">{lastRun.keputusan}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error banner if missing API key */}
      {logs.length === 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-400 mb-1">OPENROUTER_API_KEY belum di-set</p>
              <p className="text-muted-foreground">
                Untuk menjalankan agent live, tambahkan API key dari{' '}
                <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="underline text-amber-400 hover:text-amber-300">
                  openrouter.ai/keys
                </a>{' '}
                ke file <code className="text-xs px-1 py-0.5 rounded bg-amber-500/10">.env</code> dan restart server.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historical Agent Logs */}
      {logs.map((log, logIdx) => {
        let parsed: ParsedLog | null = null
        try {
          parsed = JSON.parse(log.detail)
        } catch {
          parsed = null
        }

        return (
          <Card key={logIdx} className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">Trace: {log.traceId}</CardTitle>
                    <CardDescription className="text-xs">{formatDateTime(log.timestamp)}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {parsed?.model && (
                    <Badge variant="outline" className="text-xs font-mono bg-muted/50 text-muted-foreground">
                      {parsed.model}
                    </Badge>
                  )}
                  {parsed?.duration_ms && (
                    <Badge variant="outline" className="text-xs font-mono bg-muted/50 text-muted-foreground">
                      {parsed.duration_ms.toLocaleString('id-ID')}ms
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30 w-fit">
                    Selesai
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Tools Called */}
              {parsed?.tools_called && parsed.tools_called.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Wrench className="h-3.5 w-3.5 text-amber-400" />
                    <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Tools Dipanggil</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {parsed.tools_called.map((tool, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/20 font-mono"
                      >
                        {tool}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Steps timeline (if available) */}
              {parsed?.steps && parsed.steps.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                    <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Timeline Eksekusi</p>
                  </div>
                  <div className="space-y-1">
                    {parsed.steps.map((s, i) => {
                      const meta = PHASE_META[s.phase] || PHASE_META.REASON
                      return (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground font-mono w-6">#{s.step}</span>
                          <Badge variant="outline" className={`text-xs font-mono ${meta.color}`}>
                            {meta.label}
                          </Badge>
                          {s.tool && (
                            <span className="text-amber-400 font-mono">→ {s.tool}</span>
                          )}
                          <span className="text-muted-foreground truncate flex-1">{s.thought}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Thoughts / Reasoning */}
              {parsed?.thoughts && parsed.thoughts.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="h-3.5 w-3.5 text-emerald-400" />
                    <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Pemikiran Agent</p>
                  </div>
                  <div className="space-y-0">
                    {parsed.thoughts.map((thought, i) => (
                      <div key={i} className="flex gap-3 group">
                        <div className="flex flex-col items-center">
                          <div className="h-6 w-6 rounded-full bg-muted/50 flex items-center justify-center text-xs font-mono text-muted-foreground shrink-0">
                            {i + 1}
                          </div>
                          {i < parsed!.thoughts!.length - 1 && (
                            <div className="w-px flex-1 bg-border/50 mt-1" />
                          )}
                        </div>
                        <div className="pb-3">
                          <p className="text-sm text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors">
                            {thought}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Created POs */}
              {parsed?.created_pos && parsed.created_pos.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Draft PO Dibuat</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {parsed.created_pos.map((po, i) => (
                      <div key={i} className="p-2 rounded-md bg-muted/30 border border-border/30">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-emerald-400">{po.po_id}</span>
                          <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/20">
                            {po.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{po.supplier_nama}</p>
                        <p className="text-sm font-mono mt-1">Rp {po.total.toLocaleString('id-ID')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Decision */}
              {parsed?.keputusan && (
                <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <p className="text-xs font-semibold text-emerald-400">Keputusan</p>
                  </div>
                  <p className="text-sm text-foreground">{parsed.keputusan}</p>
                </div>
              )}

              {/* Result */}
              {parsed?.hasil && (
                <div className="p-3 rounded-lg bg-sky-500/5 border border-sky-500/15">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="h-3.5 w-3.5 text-sky-400" />
                    <p className="text-xs font-semibold text-sky-400">Hasil</p>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{parsed.hasil}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      {logs.length === 0 && !running && (
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-12 text-center">
            <Bot className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Belum ada log agent. Klik "Run Agent Now" untuk memulai.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function AgentSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="border-border/50">
        <CardContent className="p-4">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-full" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
