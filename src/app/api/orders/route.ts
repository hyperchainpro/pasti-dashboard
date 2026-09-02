import { NextResponse } from 'next/server'
import { getOrders } from '@/lib/demo-data'

interface OrderView {
  poId: string
  supplierId: string
  supplierNama: string
  items: Array<{
    product_id: string
    nama: string
    qty: number
    harga_satuan: number
    subtotal: number
  }>
  totalHarga: number
  status: string
  createdAt: string
}

function toView(o: ReturnType<typeof getOrders>[0]): OrderView {
  return {
    poId: o.po_id,
    supplierId: o.supplier_id,
    supplierNama: o.supplier_nama,
    items: o.items,
    totalHarga: o.total,
    status: o.status,
    createdAt: o.approved_at || o.dibuat_oleh || '',
  }
}

let localOrders = getOrders().map(toView)

export async function GET() {
  return NextResponse.json(localOrders)
}

export async function PATCH(request: Request) {
  const { poId, status } = await request.json()
  if (!poId || !status) {
    return NextResponse.json({ error: 'poId and status required' }, { status: 400 })
  }
  const idx = localOrders.findIndex(o => o.poId === poId)
  if (idx === -1) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }
  localOrders[idx] = { ...localOrders[idx], status }
  return NextResponse.json(localOrders[idx])
}