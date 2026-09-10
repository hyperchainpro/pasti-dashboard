'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Key, Trash2, Power, CheckCircle2, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

interface ApiKeyEntry {
  id: string
  name: string
  provider: string
  key: string
  baseUrl: string | null
  model: string | null
  isActive: boolean
  lastUsedAt: Date | null
  createdAt: Date
}

export function ApiKeyList({ keys: initialKeys }: { keys: ApiKeyEntry[] }) {
  const [keys, setKeys] = useState(initialKeys)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  async function handleToggle(id: string, current: boolean) {
    setLoadingId(id)
    try {
      const res = await fetch(`/api/api-keys/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !current }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || 'Gagal mengubah status')
        return
      }
      setKeys(keys.map((k) => (k.id === id ? { ...k, isActive: !current } : k)))
      toast.success(current ? 'API key dinonaktifkan' : 'API key diaktifkan')
    } catch (err) {
      toast.error('Network error: ' + String(err))
    } finally {
      setLoadingId(null)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Hapus API key "${name}"? Tindakan ini tidak bisa dibatalkan.`)) return
    setLoadingId(id)
    try {
      const res = await fetch(`/api/api-keys/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || 'Gagal menghapus')
        return
      }
      setKeys(keys.filter((k) => k.id !== id))
      toast.success('API key dihapus')
    } catch (err) {
      toast.error('Network error: ' + String(err))
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Key className="h-5 w-5 text-emerald-400" />
          API Keys Anda ({keys.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {keys.length === 0 ? (
          <div className="text-center py-8">
            <Key className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Belum ada custom API key.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Tambahkan di panel kiri untuk mulai.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {keys.map((k) => (
              <div
                key={k.id}
                className={`p-3 rounded-md border transition-colors ${
                  k.isActive
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-border bg-muted/30 opacity-70'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm truncate">{k.name}</p>
                      <Badge variant="outline" className="text-xs font-mono">
                        {k.provider}
                      </Badge>
                      {k.isActive && (
                        <Badge variant="outline" className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Aktif
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs font-mono text-muted-foreground mt-1.5">{k.key}</p>
                    <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-muted-foreground">
                      {k.model && (
                        <span className="font-mono">
                          <span className="opacity-70">model:</span> {k.model}
                        </span>
                      )}
                      {k.baseUrl && (
                        <span className="font-mono truncate max-w-[200px]">
                          <span className="opacity-70">base:</span> {k.baseUrl}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Dibuat {formatDistanceToNow(new Date(k.createdAt), { addSuffix: true, locale: idLocale })}
                      </span>
                      {k.lastUsedAt && (
                        <span>
                          · Dipakai {formatDistanceToNow(new Date(k.lastUsedAt), { addSuffix: true, locale: idLocale })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleToggle(k.id, k.isActive)}
                      disabled={loadingId === k.id}
                      title={k.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                    >
                      <Power className={`h-4 w-4 ${k.isActive ? 'text-emerald-400' : 'text-muted-foreground'}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-red-500/10 hover:text-red-400"
                      onClick={() => handleDelete(k.id, k.name)}
                      disabled={loadingId === k.id}
                      title="Hapus"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
