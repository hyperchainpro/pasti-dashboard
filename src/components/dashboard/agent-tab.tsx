'use client'

import { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Bot,
  Brain,
  Wrench,
  CheckCircle2,
  MessageSquare,
} from 'lucide-react'
import { formatDateTime } from '@/lib/format'

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
}

export function AgentTab() {
  const [logs, setLogs] = useState<AgentLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/agent-logs')
      .then((r) => r.json())
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <AgentSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Agent Info */}
      <Card className="border-emerald-500/20 bg-emerald-500/5 backdrop-blur">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
              <Bot className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-emerald-400">PASTI AI Procurement Agent</p>
                <Badge variant="outline" className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Aktif
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Agent berjalan otomatis setiap malam jam 20:00 WIB. Menganalisis inventaris, memprediksi kebutuhan,
                membandingkan harga supplier, membuat draf PO, dan mengirim notifikasi ke Telegram untuk approval.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agent Logs */}
      {logs.map((log, logIdx) => {
        let parsed: ParsedLog | null = null
        try {
          parsed = JSON.parse(log.detail)
        } catch {
          parsed = null
        }

        return (
          <Card key={log.id} className="border-border/50 bg-card/50 backdrop-blur">
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
                <Badge variant="outline" className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30 w-fit">
                  Selesai
                </Badge>
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
                          {i < parsed!.thoughts.length - 1 && (
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
                  <p className="text-sm text-muted-foreground">{parsed.hasil}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      {logs.length === 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-12 text-center">
            <Bot className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Belum ada log agent</p>
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
