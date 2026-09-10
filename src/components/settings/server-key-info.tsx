'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Server, Info, CheckCircle2, Key } from 'lucide-react'

interface ServerKeyInfoProps {
  hasServerKey: boolean
  serverModel: string
  userKeyCount: number
}

export function ServerKeyInfo({ hasServerKey, serverModel, userKeyCount }: ServerKeyInfoProps) {
  return (
    <Card className={hasServerKey ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Server className="h-5 w-5 text-emerald-400" />
          Konfigurasi Server
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Default API Key (server):</span>
          {hasServerKey ? (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Aktif
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20">
              Tidak di-set
            </Badge>
          )}
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Default Model:</span>
          <span className="font-mono text-xs">{serverModel}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Custom API Keys Anda:</span>
          <span className="font-mono">{userKeyCount}</span>
        </div>
        <div className="pt-3 border-t border-border text-xs text-muted-foreground flex items-start gap-2">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <p>
            {userKeyCount > 0
              ? 'Saat Anda klik "Run Agent Now" di dashboard, agent akan otomatis menggunakan custom API key Anda yang aktif (paling baru di-update). Custom key meng-override default server key.'
              : 'Anda belum memiliki custom API key. Agent akan menggunakan default server key. Tambahkan custom key di bawah untuk memakai model lain (mis. GPT-4o, Claude, atau akun OpenRouter pribadi).'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
