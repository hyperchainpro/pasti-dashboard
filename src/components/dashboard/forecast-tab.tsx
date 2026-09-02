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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Brain, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { formatNumber } from '@/lib/format'

interface Forecast {
  kode: string
  nama: string
  unit: string
  stokSaIni: number
  stokMin: number
  safetyStock: number
  ma7: number
  ma30: number
  baseForecast: number
  multiplier: number
  adjustedForecast: number
  reorderQty: number
  perluOrder: boolean
  totalSalesDays: number
  avgDaily: number
}

export function ForecastTab() {
  const [forecasts, setForecasts] = useState<Forecast[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/forecasts')
      .then((r) => r.json())
      .then(setForecasts)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const needReorder = forecasts.filter((f) => f.perluOrder)
  const sufficient = forecasts.filter((f) => !f.perluOrder)

  if (loading) {
    return <ForecastSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Methodology Card */}
      <Card className="border-emerald-500/20 bg-emerald-500/5 backdrop-blur">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <Brain className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-400">Metodologi Prediksi AI</p>
              <p className="text-xs text-muted-foreground mt-1">
                Prediksi menggunakan weighted moving average (MA7×60% + MA30×40%) dengan penyesuaian faktor weekend (+40%)
                dan periode gajian tanggal 25-5 (+25%). Reorder point = Safety Stock + Prediksi − Stok Saat Ini.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <p className="text-xs text-muted-foreground">Perlu Reorder</p>
            </div>
            <p className="text-3xl font-bold text-amber-400">{needReorder.length}</p>
            <p className="text-xs text-muted-foreground mt-1">produk perlu dipesan</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <p className="text-xs text-muted-foreground">Stok Cukup</p>
            </div>
            <p className="text-3xl font-bold text-emerald-400">{sufficient.length}</p>
            <p className="text-xs text-muted-foreground mt-1">produk stok aman</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <p className="text-xs text-muted-foreground">Total Reorder</p>
            </div>
            <p className="text-3xl font-bold">
              {needReorder.reduce((s, f) => s + f.reorderQty, 0).toLocaleString('id-ID')}
            </p>
            <p className="text-xs text-muted-foreground mt-1">unit total perlu dipesan</p>
          </CardContent>
        </Card>
      </div>

      {/* Forecast Table */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Tabel Prediksi</CardTitle>
          <CardDescription>
            Estimasi kebutuhan besok berdasarkan analisis tren penjualan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/30 hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Produk</TableHead>
                  <TableHead className="text-muted-foreground text-right">Stok</TableHead>
                  <TableHead className="text-muted-foreground text-right">MA7</TableHead>
                  <TableHead className="text-muted-foreground text-right">MA30</TableHead>
                  <TableHead className="text-muted-foreground text-right">Prediksi</TableHead>
                  <TableHead className="text-muted-foreground text-center">Multiplier</TableHead>
                  <TableHead className="text-muted-foreground text-right">Reorder Qty</TableHead>
                  <TableHead className="text-muted-foreground text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forecasts
                  .sort((a, b) => (b.perluOrder ? 1 : 0) - (a.perluOrder ? 1 : 0))
                  .map((f) => (
                    <TableRow
                      key={f.kode}
                      className={`border-border/20 hover:bg-muted/30 ${f.perluOrder ? 'bg-amber-500/5' : ''}`}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{f.nama}</p>
                          <p className="text-xs text-muted-foreground">{f.kode} • {f.unit}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        <span
                          className={
                            f.stokSaIni <= f.safetyStock
                              ? 'text-red-400'
                              : f.stokSaIni <= f.stokMin
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                          }
                        >
                          {formatNumber(f.stokSaIni)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">
                        {formatNumber(f.ma7)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">
                        {formatNumber(f.ma30)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">
                        {f.adjustedForecast}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            f.multiplier > 1
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-muted text-muted-foreground border-border'
                          }`}
                        >
                          ×{f.multiplier}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        <span
                          className={
                            f.reorderQty > 0
                              ? 'text-amber-400 font-semibold'
                              : 'text-muted-foreground'
                          }
                        >
                          {f.reorderQty > 0 ? `+${f.reorderQty}` : '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {f.perluOrder ? (
                          <Badge
                            variant="outline"
                            className="text-xs bg-amber-500/20 text-amber-400 border-amber-500/30"
                          >
                            Reorder
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          >
                            Aman
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ForecastSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="border-border/50">
        <CardContent className="p-4">
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="border-border/50">
        <CardContent className="p-6">
          <Skeleton className="h-[300px] w-full rounded-lg" />
        </CardContent>
      </Card>
    </div>
  )
}
