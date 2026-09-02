import { NextResponse } from 'next/server'
import { getSalesByDate, getSalesWithDetails } from '@/lib/demo-data'

export async function GET() {
  const chartData = getSalesByDate(30)
  const recentSales = getSalesWithDetails()
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
    .slice(0, 100)
    .map(s => ({
      id: s.sale_id,
      saleId: s.sale_id,
      tanggal: s.tanggal,
      jumlah: s.qty,
      hargaSatuan: s.harga_satuan,
      total: s.total,
      product: {
        nama: s.product_nama || '',
        kode: s.product_id,
        unit: '',
      },
    }))

  return NextResponse.json({ sales: recentSales, chartData })
}