'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bot } from 'lucide-react'

interface LogEntry {
  traceId: string
  timestamp: string
  step: string
  createdAt: Date
}

export function RecentActivityCard({ logs }: { logs: LogEntry[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Bot className="h-5 w-5 text-emerald-400" />
          Aktivitas Agent Terbaru
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Belum ada aktivitas. Klik "Run Agent Now" di tab Agent Log untuk memulai.
          </p>
        ) : (
          logs.map((log) => (
            <div
              key={log.traceId}
              className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-mono text-emerald-400 truncate">{log.traceId}</p>
                <p className="text-xs text-muted-foreground truncate">{log.step}</p>
              </div>
              <Badge variant="outline" className="text-xs text-muted-foreground shrink-0">
                {new Date(log.createdAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
