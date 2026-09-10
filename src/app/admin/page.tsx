'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { redirect } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'

interface AdminData {
  stats: {
    totalUsers: number
    totalApiKeys: number
    totalAgentLogs: number
    totalProducts: number
    totalSales: number
    totalPurchaseOrders: number
    activeUsersToday: number
    lockedAccountsCount: number
  }
  recentUsers: Array<{
    id: string
    name: string | null
    email: string
    role: string
    createdAt: string
    _count: { apiKeys: number; agentLogs: number }
  }>
  recentAgentLogs: Array<{
    id: string
    traceId: string
    userId: string | null
    timestamp: string
    step: string
    createdAt: string
  }>
  apiKeysByProvider: Array<{ provider: string; count: number }>
  lockedAccounts: Array<{
    email: string
    failedAttempts: number
    lockedUntil: string | null
    updatedAt: string
  }>
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const [data, setData] = useState<AdminData | null>(null)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (status === 'unauthenticated') redirect('/login')
    if (status !== 'authenticated') return
    if (session.user.role !== 'admin') {
      setError('Akses ditolak. Halaman ini hanya untuk admin.')
      return
    }
    fetch('/admin/data')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then(setData)
      .catch((e) => setError(String(e)))
  }, [status, session, reloadKey])

  if (status === 'loading' || (!error && !data)) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        </div>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Statistik penggunaan PASTI Dashboard
          </p>
        </div>
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
          Admin Mode
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <StatCard label="Total Users" value={data.stats.totalUsers} color="emerald" />
        <StatCard label="Active Today" value={data.stats.activeUsersToday} color="sky" />
        <StatCard label="API Keys" value={data.stats.totalApiKeys} color="amber" />
        <StatCard label="Agent Runs" value={data.stats.totalAgentLogs} color="violet" />
        <StatCard label="Products" value={data.stats.totalProducts} color="cyan" />
        <StatCard label="Sales Records" value={data.stats.totalSales} color="rose" />
        <StatCard label="Purchase Orders" value={data.stats.totalPurchaseOrders} color="orange" />
        <StatCard label="Locked Accounts" value={data.stats.lockedAccountsCount} color="red" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Users */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pengguna Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Belum ada pengguna</p>
            ) : (
              <div className="space-y-2">
                {data.recentUsers.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-emerald-500/20 text-emerald-400 text-xs">
                        {(u.name || u.email)[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.name || '(tanpa nama)'}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      {u.role === 'admin' && (
                        <Badge variant="outline" className="text-xs bg-emerald-500/20 text-emerald-400">
                          Admin
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {u._count.apiKeys} keys · {u._count.agentLogs} runs
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Agent Runs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Agent Runs Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentAgentLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Belum ada agent run</p>
            ) : (
              <div className="space-y-2">
                {data.recentAgentLogs.map((log) => (
                  <div key={log.id} className="p-2 rounded-md hover:bg-muted/50">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono text-emerald-400 truncate">{log.traceId}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {new Date(log.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{log.step}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* API Keys by Provider */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Custom API Keys per Provider</CardTitle>
          </CardHeader>
          <CardContent>
            {data.apiKeysByProvider.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Belum ada custom API key yang ditambahkan user
              </p>
            ) : (
              <div className="space-y-2">
                {data.apiKeysByProvider.map((p) => (
                  <div key={p.provider} className="flex items-center justify-between">
                    <span className="text-sm font-mono">{p.provider}</span>
                    <Badge variant="outline" className="text-xs">{p.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Locked Accounts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              Akun Terkunci (Lockout)
              {data.stats.lockedAccountsCount > 0 && (
                <Badge variant="outline" className="bg-red-500/20 text-red-400">
                  {data.stats.lockedAccountsCount} aktif
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.lockedAccounts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Tidak ada akun terkunci</p>
            ) : (
              <div className="space-y-2">
                {data.lockedAccounts.map((a) => {
                  const isLocked = a.lockedUntil && new Date(a.lockedUntil) > new Date()
                  return (
                    <div key={a.email} className="p-2 rounded-md border border-border/50">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-mono truncate">{a.email}</span>
                        <Badge
                          variant="outline"
                          className={
                            isLocked
                              ? 'text-xs bg-red-500/20 text-red-400'
                              : 'text-xs bg-amber-500/20 text-amber-400'
                          }
                        >
                          {isLocked ? 'Terkunci' : `${a.failedAttempts} gagal`}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {a.lockedUntil
                          ? `Unlock: ${new Date(a.lockedUntil).toLocaleString('id-ID')}`
                          : `Update: ${new Date(a.updatedAt).toLocaleString('id-ID')}`}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
          Refresh
        </Button>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: 'emerald' | 'sky' | 'amber' | 'violet' | 'cyan' | 'rose' | 'orange' | 'red'
}) {
  const colorClasses: Record<typeof color, string> = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    sky: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    orange: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
  }
  return (
    <Card className={`border ${colorClasses[color]}`}>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-2xl font-bold">{value.toLocaleString('id-ID')}</p>
      </CardContent>
    </Card>
  )
}
