'use client'

import { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, Calendar, Receipt } from 'lucide-react'
import { formatRupiah } from '@/lib/format'

interface ChartData {
  date: string
  total: number
  count: number
}

interface SaleRecord {
  id: string
  saleId: string
  tanggal: string
  jumlah: number
  hargaSatuan: number
  total: number
  product: {
    nama: string
    kode: string
    unit: string
  }
}

export function SalesTab() {
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [recentSales, setRecentSales] = useState<SaleRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily')

  useEffect(() => {
    fetch('/api/sales?days=30')
      .then((r) => r.json())
      .then((data) => {
        setChartData(data.chartData || [])
        setRecentSales(data.sales || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const weeklyData = (() => {
    const weeks: Record<string, { total: number; count: number; label: string }> = {}
    for (const d of chartData) {
      const date = new Date(d.date)
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      const weekKey = weekStart.toISOString().split('T')[0]
      const label = `${weekStart.getDate()}/${weekStart.getMonth() + 1}`
      if (!weeks[weekKey]) weeks[weekKey] = { total: 0, count: 0, label }
      weeks[weekKey].total += d.total
      weeks[weekKey].count += d.count
    }
    return Object.entries(weeks).map(([key, val]) => ({
      date: val.label,
      total: val.total,
      count: val.count,
    }))
  })()

  const displayData = viewMode === 'daily' ? chartData : weeklyData

  const totalRevenue = chartData.reduce((s, d) => s + d.total, 0)
  const totalTransactions = chartData.reduce((s, d) => s + d.count, 0)
  const avgTicket = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0
  const peakDay = chartData.reduce(
    (max, d) => (d.total > (max?.total || 0) ? d : max),
    chartData[0]
  )

  if (loading) {
    return <SalesSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MiniStat
          icon={TrendingUp}
          label="Total Omzet"
          value={formatRupiah(totalRevenue)}
        />
        <MiniStat
          icon={Receipt}
          label="Total Transaksi"
          value={totalTransactions.toLocaleString('id-ID')}
        />
        <MiniStat
          icon={Calendar}
          label="Rata-rata/Tx"
          value={formatRupiah(avgTicket)}
        />
        <MiniStat
          icon={TrendingUp}
          label="Hari Tertinggi"
          value={peakDay ? formatRupiah(peakDay.total) : '-'}
        />
      </div>

      {/* Chart */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-semibold">Grafik Penjualan</CardTitle>
              <CardDescription>30 hari terakhir</CardDescription>
            </div>
            <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('daily')}
                className={`px-3 py-1.5 text-xs rounded-md transition-all ${
                  viewMode === 'daily'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Harian
              </button>
              <button
                onClick={() => setViewMode('weekly')}
                className={`px-3 py-1.5 text-xs rounded-md transition-all ${
                  viewMode === 'weekly'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Mingguan
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {viewMode === 'daily' ? (
                <AreaChart data={displayData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.696 0.17 162.48)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="oklch(0.696 0.17 162.48)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.015 160)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'oklch(0.6 0.02 160)', fontSize: 11 }}
                    tickFormatter={(v) => {
                      const d = new Date(v)
                      return `${d.getDate()}/${d.getMonth() + 1}`
                    }}
                  />
                  <YAxis
                    tick={{ fill: 'oklch(0.6 0.02 160)', fontSize: 11 }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'oklch(0.14 0.008 160)',
                      border: '1px solid oklch(0.3 0.015 160)',
                      borderRadius: '8px',
                      color: 'oklch(0.96 0.005 160)',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [formatRupiah(value), 'Omzet']}
                    labelFormatter={(label) => {
                      const d = new Date(label as string)
                      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="oklch(0.696 0.17 162.48)"
                    strokeWidth={2}
                    fill="url(#salesAreaGrad)"
                  />
                </AreaChart>
              ) : (
                <BarChart data={displayData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.015 160)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'oklch(0.6 0.02 160)', fontSize: 11 }}
                  />
                  <YAxis
                    tick={{ fill: 'oklch(0.6 0.02 160)', fontSize: 11 }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'oklch(0.14 0.008 160)',
                      border: '1px solid oklch(0.3 0.015 160)',
                      borderRadius: '8px',
                      color: 'oklch(0.96 0.005 160)',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [formatRupiah(value), 'Omzet']}
                  />
                  <Bar
                    dataKey="total"
                    fill="oklch(0.696 0.17 162.48)"
                    radius={[4, 4, 0, 0]}
                    opacity={0.8}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Transaksi Terbaru</CardTitle>
          <CardDescription>Daftar penjualan terakhir</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-72 overflow-y-auto">
            <div className="space-y-2">
              {recentSales.slice(0, 20).map((s) => (
                <div
                  key={s.saleId}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-md bg-emerald-500/10 flex items-center justify-center">
                      <Receipt className="h-3.5 w-3.5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{s.product?.nama || 'Produk'}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.tanggal} • {s.jumlah} {s.product?.unit || ''}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-mono font-medium text-emerald-400">
                    {formatRupiah(s.total)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="h-3.5 w-3.5 text-emerald-400" />
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
        <p className="text-lg font-bold">{value}</p>
      </CardContent>
    </Card>
  )
}

function SalesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="border-border/50">
        <CardContent className="p-6">
          <Skeleton className="h-[320px] w-full rounded-lg" />
        </CardContent>
      </Card>
    </div>
  )
}
