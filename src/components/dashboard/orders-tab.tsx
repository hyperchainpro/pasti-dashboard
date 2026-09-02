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
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  ShoppingCart,
  Check,
  ChevronDown,
  Clock,
  Truck,
  X,
} from 'lucide-react'
import { formatRupiah, formatDateTime, getPoStatusLabel, getPoStatusColor } from '@/lib/format'
import { useToast } from '@/hooks/use-toast'

interface OrderItem {
  product_id: string
  nama: string
  qty: number
  harga_satuan: number
  subtotal: number
}

interface Order {
  id: string
  poId: string
  items: string
  supplierId: string
  totalHarga: number
  status: string
  createdAt: string
  updatedAt: string
}

export function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedPO, setExpandedPO] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchOrders = useCallback(async () => {
    try {
      const r = await fetch('/api/orders')
      const data = await r.json()
      setOrders(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  async function updateStatus(poId: string, newStatus: string) {
    try {
      const r = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poId, status: newStatus }),
      })
      if (r.ok) {
        toast({
          title: 'PO Diperbarui',
          description: `${poId} → ${getPoStatusLabel(newStatus)}`,
        })
        fetchOrders()
      }
    } catch (err) {
      toast({
        title: 'Gagal',
        description: 'Tidak dapat memperbarui status PO',
        variant: 'destructive',
      })
    }
  }

  const totalSpend = orders.reduce((s, o) => s + o.totalHarga, 0)

  if (loading) {
    return <OrdersSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total PO</p>
            <p className="text-2xl font-bold mt-1">{orders.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Menunggu</p>
            <p className="text-2xl font-bold mt-1 text-amber-400">
              {orders.filter((o) => o.status === 'draft').length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Disetujui</p>
            <p className="text-2xl font-bold mt-1 text-emerald-400">
              {orders.filter((o) => o.status === 'approved').length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Pengeluaran</p>
            <p className="text-lg font-bold mt-1">{formatRupiah(totalSpend)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {orders.map((order) => {
          let parsedItems: OrderItem[] = []
          try {
            parsedItems = JSON.parse(order.items)
          } catch {
            parsedItems = []
          }

          const isExpanded = expandedPO === order.poId

          return (
            <Card
              key={order.id}
              className="border-border/50 bg-card/50 backdrop-blur hover:border-emerald-500/20 transition-colors"
            >
              <Collapsible open={isExpanded} onOpenChange={(v) => setExpandedPO(v ? order.poId : null)}>
                <CollapsibleTrigger className="w-full">
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <ShoppingCart className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{order.poId}</p>
                          <Badge variant="outline" className={`text-xs ${getPoStatusColor(order.status)}`}>
                            {getPoStatusLabel(order.status)}
                          </Badge>
                          <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                            <Bot className="h-3 w-3 mr-1" />
                            Agent
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Supplier: {order.supplierId} • {formatDateTime(order.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-emerald-400">{formatRupiah(order.totalHarga)}</p>
                        <p className="text-xs text-muted-foreground">{parsedItems.length} item</p>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4">
                    <div className="border-t border-border/30 pt-3">
                      {/* Items table */}
                      <div className="rounded-lg overflow-hidden border border-border/30">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted/30">
                              <th className="text-left px-3 py-2 text-xs text-muted-foreground font-medium">Produk</th>
                              <th className="text-right px-3 py-2 text-xs text-muted-foreground font-medium">Qty</th>
                              <th className="text-right px-3 py-2 text-xs text-muted-foreground font-medium">Harga Satuan</th>
                              <th className="text-right px-3 py-2 text-xs text-muted-foreground font-medium">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {parsedItems.map((item, idx) => (
                              <tr key={idx} className="border-t border-border/20">
                                <td className="px-3 py-2 font-medium">{item.nama}</td>
                                <td className="px-3 py-2 text-right font-mono">{item.qty}</td>
                                <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                                  {formatRupiah(item.harga_satuan)}
                                </td>
                                <td className="px-3 py-2 text-right font-mono">{formatRupiah(item.subtotal)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-border/30 bg-muted/20">
                              <td colSpan={3} className="px-3 py-2 text-right font-semibold text-sm">Total</td>
                              <td className="px-3 py-2 text-right font-mono font-bold text-emerald-400">
                                {formatRupiah(order.totalHarga)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      {/* Actions */}
                      {order.status === 'draft' && (
                        <div className="flex gap-2 mt-3 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateStatus(order.poId, 'rejected')}
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-400"
                          >
                            <X className="h-3.5 w-3.5 mr-1" />
                            Tolak
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => updateStatus(order.poId, 'approved')}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white"
                          >
                            <Check className="h-3.5 w-3.5 mr-1" />
                            Setujui
                          </Button>
                        </div>
                      )}
                      {order.status === 'approved' && (
                        <div className="flex gap-2 mt-3 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateStatus(order.poId, 'delivered')}
                            className="border-sky-500/30 text-sky-400 hover:bg-sky-500/10"
                          >
                            <Truck className="h-3.5 w-3.5 mr-1" />
                            Tandai Diterima
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function Bot({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>
    </svg>
  )
}

function OrdersSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="border-border/50">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
