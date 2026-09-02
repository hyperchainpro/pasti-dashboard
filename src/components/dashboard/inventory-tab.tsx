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
import { Package, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { formatRupiah, getStockBgColor, getStatusLabel, getStockColor } from '@/lib/format'

interface Product {
  productId: string
  kode: string
  nama: string
  unit: string
  stokSaIni: number
  stokMin: number
  safetyStock: number
  hargaJual: number
  status: string
  createdAt: string
  updatedAt: string
}

export function InventoryTab() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then(setProducts)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = products.filter((p) => {
    const matchSearch = p.nama.toLowerCase().includes(search.toLowerCase()) || p.kode.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || p.status === filter
    return matchSearch && matchFilter
  })

  const statusCounts = {
    all: products.length,
    safe: products.filter((p) => p.status === 'safe').length,
    warning: products.filter((p) => p.status === 'warning').length,
    critical: products.filter((p) => p.status === 'critical').length,
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatusCard label="Total" count={statusCounts.all} active={filter === 'all'} onClick={() => setFilter('all')} color="text-emerald-400" />
        <StatusCard label="Aman" count={statusCounts.safe} active={filter === 'safe'} onClick={() => setFilter('safe')} color="text-emerald-400" />
        <StatusCard label="Peringatan" count={statusCounts.warning} active={filter === 'warning'} onClick={() => setFilter('warning')} color="text-amber-400" />
        <StatusCard label="Kritis" count={statusCounts.critical} active={filter === 'critical'} onClick={() => setFilter('critical')} color="text-red-400" />
      </div>

      {/* Table */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-semibold">Daftar Inventaris</CardTitle>
              <CardDescription>Level stok bahan baku saat ini</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari produk..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background/50 border-border/50"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <InventorySkeleton />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30 hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Kode</TableHead>
                    <TableHead className="text-muted-foreground">Produk</TableHead>
                    <TableHead className="text-muted-foreground text-right">Stok Saat Ini</TableHead>
                    <TableHead className="text-muted-foreground text-right">Stok Min</TableHead>
                    <TableHead className="text-muted-foreground text-right">Safety Stock</TableHead>
                    <TableHead className="text-muted-foreground text-center">Level</TableHead>
                    <TableHead className="text-muted-foreground text-center">Status</TableHead>
                    <TableHead className="text-muted-foreground text-right">Harga Jual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => {
                    const stockPercent = Math.min(100, Math.round((p.stokSaIni / (p.stokMin * 2)) * 100))
                    return (
                      <TableRow key={p.productId} className="border-border/20 hover:bg-muted/30">
                        <TableCell className="font-mono text-xs text-muted-foreground">{p.kode}</TableCell>
                        <TableCell className="font-medium">{p.nama}</TableCell>
                        <TableCell className="text-right font-mono">
                          <span className={getStockColor(p.status)}>
                            {p.stokSaIni} {p.unit}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {p.stokMin} {p.unit}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {p.safetyStock} {p.unit}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="w-full max-w-[100px] mx-auto">
                            <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  p.status === 'critical'
                                    ? 'bg-red-500'
                                    : p.status === 'warning'
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-500'
                                }`}
                                style={{ width: `${stockPercent}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={`text-xs ${getStockBgColor(p.status)}`}>
                            {getStatusLabel(p.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatRupiah(p.hargaJual)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatusCard({
  label,
  count,
  active,
  onClick,
  color,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
  color: string
}) {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-xl border transition-all text-left ${
        active
          ? 'border-emerald-500/50 bg-emerald-500/10'
          : 'border-border/50 bg-card/50 hover:border-border'
      }`}
    >
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-2xl font-bold ${active ? 'text-emerald-400' : color}`}>{count}</p>
    </button>
  )
}

function InventorySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-16 ml-auto" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-2 w-24" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  )
}
