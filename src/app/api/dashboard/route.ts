import { NextResponse } from 'next/server'
import {
  getEnrichedProducts,
  getSalesByDate,
  getSalesByProduct,
  getOrders,
  getAgentLogs,
  getSuppliers,
  getSalesWithDetails,
} from '@/lib/demo-data'

export async function GET() {
  const products = getEnrichedProducts()
  const orders = getOrders()
  const agentLogs = getAgentLogs()
  const chartData = getSalesByDate(30)
  const salesByProductRaw = getSalesByProduct(30)
  const allSales = getSalesWithDetails()

  // KPIs matching component interface
  const criticalStock = products.filter(p => p.status === 'critical').length
  const warningStock = products.filter(p => p.status === 'warning').length
  const activePOs = orders.filter(o => o.status === 'pending' || o.status === 'draft').length
  const approvedPOs = orders.filter(o => o.status === 'approved' || o.status === 'disetujui').length
  const totalRevenue30 = chartData.reduce((sum, d) => sum + d.total, 0)
  const avgDailyRevenue = Math.round(totalRevenue30 / 30)

  // Today's sales
  const today = new Date().toISOString().split('T')[0]
  const todaySales = allSales.filter(s => s.tanggal === today)
  const todayRevenue = todaySales.reduce((sum, s) => sum + s.total, 0)
  const todayTx = todaySales.length

  const kpis = {
    totalProducts: products.length,
    criticalStock,
    warningStock,
    activePOs,
    approvedPOs,
    todaySales: todayRevenue,
    todayTransactions: todayTx,
    totalRevenue30,
    avgDailyRevenue,
  }

  // Stock status as array of StockItem
  const stockStatus = products.map(p => ({
    kode: p.product_id,
    nama: p.nama,
    unit: p.unit,
    stokSaIni: p.stok_saat_ini,
    stokMin: p.stok_min,
    safetyStock: p.safety_stock,
    status: p.status,
    stockPercent: Math.min(100, Math.round((p.stok_saat_ini / (p.stok_min * 2)) * 100)),
  }))

  // Sales by product with kode, nama
  const salesByProduct = products.map(p => {
    const matched = salesByProductRaw.find(s => s.name === p.nama)
    return {
      kode: p.product_id,
      nama: p.nama,
      total: matched?.total || 0,
      count: allSales.filter(s => s.product_id === p.product_id).length,
    }
  }).sort((a, b) => b.total - a.total)

  // Latest agent log as single object with detail as JSON string
  const latestAgentLog = agentLogs.length > 0 ? {
    traceId: agentLogs[0].trace_id,
    timestamp: agentLogs[0].waktu,
    step: agentLogs[0].keputusan,
    detail: JSON.stringify({
      thoughts: agentLogs[0].thoughts,
      tools_called: agentLogs[0].tools_called,
      keputusan: agentLogs[0].keputusan,
      hasil: agentLogs[0].hasil,
    }),
    hasil: agentLogs[0].hasil,
  } : null

  return NextResponse.json({
    kpis,
    stockStatus,
    salesByProduct,
    latestAgentLog,
    suppliers: getSuppliers(),
  })
}
