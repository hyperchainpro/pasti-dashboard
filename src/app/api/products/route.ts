import { NextResponse } from 'next/server'
import { getEnrichedProducts } from '@/lib/demo-data'

export async function GET() {
  const products = getEnrichedProducts().map(p => ({
    productId: p.product_id,
    kode: p.product_id,
    nama: p.nama,
    unit: p.unit,
    stokSaIni: p.stok_saat_ini,
    stokMin: p.stok_min,
    safetyStock: p.safety_stock,
    hargaJual: p.harga_jual,
    status: p.status,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }))
  return NextResponse.json(products)
}
