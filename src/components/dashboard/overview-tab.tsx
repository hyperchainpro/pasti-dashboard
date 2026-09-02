'use client'

import { useEffect, useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Package,
  AlertTriangle,
  ShoppingCart,
  TrendingUp,
  Bot,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { formatRupiah, getStockBgColor, getStatusLabel } from '@/lib/format'

interface KPIData {
  totalProducts: number
  criticalStock: number
  warningStock: number
  activePOs: number
  approvedPOs: number
  todaySales: number
  todayTransactions: number
  totalRevenue30: number
  avgDailyRevenue: number
}

interface StockItem {
  kode: string
  nama: string
  unit: string
  stokSaIni: number
  stokMin: number
  safetyStock: number
  status: string
  stockPercent: number
}

interface SalesByProduct {
  kode: string
  nama: string
  total: number
  count: number
}

interface AgentLog {
  traceId: string
  timestamp: string
  step: string
  detail: string
}

interface ChartData {
  date: string
  total: number
  count: number
}

const PIE_COLORS = [
  'oklch(0.696 0.17 162.48)',
  'oklch(0.765 0.177 163.223)',
  'oklch(0.596 0.145 163.225)',
  'oklch(0.82 0.12 160)',
  'oklch(0.5 0.1 160)',
  'oklch(0.75 0.15 140)',
  'oklch(0.65 0.13 170)',
  'oklch(0.85 0.1 155)',
  'oklch(0.45 0.08 165)',
  'oklch(0.7 0.14 150)',
]

export function OverviewTab() {
  const [kpis, setKpis] = useState<KPIData | null>(null)
  const [stockStatus, setStockStatus] = useState<StockItem[]>([])
  const [salesByProduct, setSalesByProduct] = useState<SalesByProduct[]>([])
  const [salesChart, setSalesChart] = useState<ChartData[]>([])
  const [agentLog, setAgentLog] = useState<AgentLog | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [dashRes, salesRes] = await Promise.all([
          fetch('/api/dashboard'),
          fetch('/api/sales?days=30'),
        ])
        const dashData = await dashRes.json()
        const salesData = await salesRes.json()

        setKpis(dashData.kpis)
        setStockStatus(dashData.stockStatus)
        setSalesByProduct(dashData.salesByProduct)
        setSalesChart(salesData.chartData || [])
        setAgentLog(dashData.latestAgentLog)
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const criticalItems = stockStatus.filter((s) => s.status === 'critical')
  const warningItems = stockStatus.filter((s) => s.status === 'warning')

  if (loading) {
    return <OverviewSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Produk"
          value={kpis?.totalProducts || 0}
          subtitle="Bahan baku terdaftar"
          icon={Package}
          trend={null}
        />
        <KPICard
          title="Stok Kritis"
          value={kpis?.criticalStock || 0}
          subtitle={`${kpis?.warningStock || 0} peringatan`}
          icon={AlertTriangle}
          trend="danger"
        />
        <KPICard
          title="PO Menunggu"
          value={kpis?.activePOs || 0}
          subtitle={`${kpis?.approvedPOs || 0} disetujui`}
          icon={ShoppingCart}
          trend={kpis?.activePOs && kpis.activePOs > 0 ? 'warning' : null}
        />
        <KPICard
          title="Rata-rata Harian"
          value={formatRupiah(kpis?.avgDailyRevenue || 0)}
          subtitle="Pendapatan 30 hari"
          icon={TrendingUp}
          trend="success"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Chart */}
        <Card className="lg:col-span-2 border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              Tren Penjualan 30 Hari
            </CardTitle>
            <CardDescription>Omzet harian berdasarkan total transaksi</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesChart} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.696 0.17 162.48)" stopOpacity={0.4} />
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
                    fill="url(#salesGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Sales by Product Pie */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Distribusi Penjualan</CardTitle>
            <CardDescription>Top produk 30 hari terakhir</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={salesByProduct}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="total"
                    nameKey="nama"
                    stroke="none"
                  >
                    {salesByProduct.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'oklch(0.14 0.008 160)',
                      border: '1px solid oklch(0.3 0.015 160)',
                      borderRadius: '8px',
                      color: 'oklch(0.96 0.005 160)',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => formatRupiah(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-1.5 mt-2 max-h-28 overflow-y-auto">
              {salesByProduct.slice(0, 8).map((item, idx) => (
                <div key={item.kode} className="flex items-center gap-1.5 text-xs">
                  <div
                    className="h-2 w-2 rounded-sm shrink-0"
                    style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                  />
                  <span className="text-muted-foreground truncate">{item.nama}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stock Alerts & Agent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Alerts */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Peringatan Stok
            </CardTitle>
            <CardDescription>
              {criticalItems.length} kritis, {warningItems.length} peringatan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {criticalItems.map((item) => (
                <div
                  key={item.kode}
                  className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-md bg-red-500/20 flex items-center justify-center">
                      <Package className="h-4 w-4 text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.nama}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.stokSaIni} / {item.stokMin} {item.unit}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={getStockBgColor('critical')}>
                    {getStatusLabel('critical')}
                  </Badge>
                </div>
              ))}
              {warningItems.map((item) => (
                <div
                  key={item.kode}
                  className="flex items-center justify-between p-3 rounded-lg bg-amber-500/5 border border-amber-500/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-md bg-amber-500/20 flex items-center justify-center">
                      <Package className="h-4 w-4 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.nama}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.stokSaIni} / {item.stokMin} {item.unit}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={getStockBgColor('warning')}>
                    {getStatusLabel('warning')}
                  </Badge>
                </div>
              ))}
              {criticalItems.length === 0 && warningItems.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Semua stok dalam kondisi aman ✓
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Agent Activity */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Bot className="h-4 w-4 text-emerald-400" />
              Aktivitas Agent Terakhir
            </CardTitle>
            <CardDescription>Log pemikiran AI procurement agent</CardDescription>
          </CardHeader>
          <CardContent>
            {agentLog ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {(() => {
                  try {
                    const logData = JSON.parse(agentLog.detail)
                    const thoughts = logData.thoughts || []
                    return thoughts.slice(0, 5).map((t: string, i: number) => (
                      <div key={i} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="h-6 w-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-mono text-emerald-400">
                            {i + 1}
                          </div>
                          {i < Math.min(thoughts.length, 5) - 1 && (
                            <div className="w-px flex-1 bg-border mt-1" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground pb-2">{t}</p>
                      </div>
                    ))
                  } catch {
                    return <p className="text-sm text-muted-foreground">{agentLog.step}</p>
                  }
                })()}
                {agentLog.hasil && (
                  <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-sm font-medium text-emerald-400">Hasil:</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {(() => {
                        try {
                          return JSON.parse(agentLog.detail).hasil
                        } catch {
                          return ''
                        }
                      })()}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">
                Belum ada aktivitas agent
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
}: {
  title: string
  value: string | number
  subtitle: string
  icon: React.ComponentType<{ className?: string }>
  trend: 'success' | 'warning' | 'danger' | null
}) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur hover:border-emerald-500/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-emerald-400" />
          </div>
        </div>
        <div className="mt-2">
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <div className="flex items-center gap-1 mt-1">
            {trend === 'success' && <ArrowUpRight className="h-3 w-3 text-emerald-400" />}
            {trend === 'danger' && <ArrowDownRight className="h-3 w-3 text-red-400" />}
            {trend === 'warning' && <AlertTriangle className="h-3 w-3 text-amber-400" />}
            <p
              className={`text-xs ${
                trend === 'success'
                  ? 'text-emerald-400'
                  : trend === 'danger'
                    ? 'text-red-400'
                    : trend === 'warning'
                      ? 'text-amber-400'
                      : 'text-muted-foreground'
              }`}
            >
              {subtitle}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-4 space-y-3">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-8 w-20 bg-muted rounded" />
              <div className="h-3 w-32 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/50">
          <CardContent className="p-6">
            <div className="h-[280px] bg-muted/30 rounded-lg animate-pulse" />
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="h-[280px] bg-muted/30 rounded-lg animate-pulse" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
