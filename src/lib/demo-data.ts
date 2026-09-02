import productsRaw from '../../public/data/products.json'
import salesRaw from '../../public/data/sales.json'
import suppliersRaw from '../../public/data/suppliers.json'
import ordersRaw from '../../public/data/orders.json'
import agentLogsRaw from '../../public/data/agent_logs.json'

// ── Raw Types (matching JSON files) ──
interface RawProduct {
  product_id: string
  nama: string
  unit: string
  stok_saat_ini: number
  stok_min: number
  safety_stock: number
  harga_jual: number
}

interface RawSale {
  sale_id: string
  product_id: string
  qty: number
  tanggal: string
}

interface RawSupplierItem {
  product_id: string
  harga: number
  min_order: number
}

interface RawSupplier {
  supplier_id: string
  nama: string
  lead_time_hari: number
  items: RawSupplierItem[]
}

interface RawOrderItem {
  product_id: string
  nama: string
  qty: number
  harga_satuan: number
  subtotal: number
}

interface RawOrder {
  po_id: string
  supplier_id: string
  supplier_nama: string
  items: RawOrderItem[]
  total: number
  status: string
  dibuat_oleh: string
  approved_at: string
}

interface RawAgentLog {
  trace_id: string
  waktu: string
  thoughts: string[]
  tools_called: string[]
  keputusan: string
  hasil: string
}

// ── Enriched Types (for frontend) ──
export interface Product {
  product_id: string
  nama: string
  unit: string
  stok_saat_ini: number
  stok_min: number
  safety_stock: number
  harga_jual: number
  status: 'safe' | 'warning' | 'critical'
}

export interface Sale {
  sale_id: string
  product_id: string
  qty: number
  tanggal: string
  harga_satuan: number
  total: number
  product_nama?: string
}

export interface Supplier {
  supplier_id: string
  nama: string
  lead_time_hari: number
  items: RawSupplierItem[]
  total_items: number
}

export interface Order {
  po_id: string
  supplier_id: string
  supplier_nama: string
  items: RawOrderItem[]
  total: number
  status: string
  dibuat_oleh: string
  approved_at: string
}

export interface AgentLogEntry {
  trace_id: string
  waktu: string
  thoughts: string[]
  tools_called: string[]
  keputusan: string
  hasil: string
}

// ── Data ──
const productsData = productsRaw as RawProduct[]
const salesData = salesRaw as RawSale[]
const suppliersData = suppliersRaw as RawSupplier[]
const ordersData = ordersRaw as RawOrder[]
const agentLogsData = agentLogsRaw as RawAgentLog[]

// ── Helpers ──
function getProductStatus(p: RawProduct): 'safe' | 'warning' | 'critical' {
  if (p.stok_saat_ini <= p.safety_stock) return 'critical'
  if (p.stok_saat_ini <= p.stok_min) return 'warning'
  return 'safe'
}

function getProductName(pid: string): string {
  return productsData.find(p => p.product_id === pid)?.nama || pid
}

function getProductHarga(pid: string): number {
  return productsData.find(p => p.product_id === pid)?.harga_jual || 0
}

// ── Exported Data Functions ──

export function getEnrichedProducts(): Product[] {
  return productsData.map(p => ({
    ...p,
    status: getProductStatus(p),
  }))
}

export function getSalesWithDetails(): Sale[] {
  return salesData.map(s => ({
    ...s,
    harga_satuan: getProductHarga(s.product_id),
    total: Math.round(s.qty * getProductHarga(s.product_id)),
    product_nama: getProductName(s.product_id),
  }))
}

export function getSalesByDate(days = 30): Array<{ date: string; total: number; count: number }> {
  const sorted = [...salesData].sort((a, b) => a.tanggal.localeCompare(b.tanggal))
  const cutoff = sorted.length > 0
    ? sorted[Math.max(0, sorted.length - days * 3)]?.tanggal || ''
    : ''
  const recent = sorted.filter(s => s.tanggal >= cutoff)

  const byDate = new Map<string, { total: number; count: number }>()
  for (const s of recent) {
    const harga = getProductHarga(s.product_id)
    const existing = byDate.get(s.tanggal) || { total: 0, count: 0 }
    existing.total += Math.round(s.qty * harga)
    existing.count += 1
    byDate.set(s.tanggal, existing)
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({ date, total: data.total, count: data.count }))
}

export function getSalesByProduct(days = 30): Array<{ name: string; total: number }> {
  const sorted = [...salesData].sort((a, b) => a.tanggal.localeCompare(b.tanggal))
  const cutoff = sorted.length > 0
    ? sorted[Math.max(0, sorted.length - days * 3)]?.tanggal || ''
    : ''
  const recent = sorted.filter(s => s.tanggal >= cutoff)

  const byProduct = new Map<string, number>()
  for (const s of recent) {
    const name = getProductName(s.product_id)
    const harga = getProductHarga(s.product_id)
    byProduct.set(name, (byProduct.get(name) || 0) + Math.round(s.qty * harga))
  }

  return Array.from(byProduct.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, total]) => ({ name, total }))
}

function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr)
  return d.getDay() === 0 || d.getDay() === 6
}

function isPayday(dateStr: string): boolean {
  const d = new Date(dateStr)
  return d.getDate() >= 25 || d.getDate() <= 5
}

export function getForecasts() {
  return productsData.map(product => {
    const productSales = salesData.filter(s => s.product_id === product.product_id)
    const dailyMap = new Map<string, number>()
    for (const s of productSales) {
      dailyMap.set(s.tanggal, (dailyMap.get(s.tanggal) || 0) + s.qty)
    }
    const dailyValues = Array.from(dailyMap.values())

    const ma7 = dailyValues.length >= 7
      ? dailyValues.slice(-7).reduce((a, b) => a + b, 0) / 7
      : dailyValues.reduce((a, b) => a + b, 0) / (dailyValues.length || 1)

    const ma30 = dailyValues.length >= 30
      ? dailyValues.slice(-30).reduce((a, b) => a + b, 0) / 30
      : ma7

    const baseForecast = Math.ceil(ma7 * 0.6 + ma30 * 0.4)

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    let multiplier = 1
    if (isWeekend(tomorrowStr)) multiplier *= 1.4
    if (isPayday(tomorrowStr)) multiplier *= 1.25

    const adjustedForecast = Math.ceil(baseForecast * multiplier)
    const reorderQty = Math.max(0, adjustedForecast - product.stok_saat_ini + product.safety_stock)

    return {
      kode: product.product_id,
      nama: product.nama,
      unit: product.unit,
      stokSaIni: product.stok_saat_ini,
      stokMin: product.stok_min,
      safetyStock: product.safety_stock,
      ma7: Math.round(ma7 * 100) / 100,
      ma30: Math.round(ma30 * 100) / 100,
      baseForecast,
      multiplier: Math.round(multiplier * 100) / 100,
      adjustedForecast,
      reorderQty,
      perluOrder: reorderQty > 0,
      totalSalesDays: dailyValues.length,
      avgDaily: Math.round(ma30 * 100) / 100,
    }
  })
}

export function getSuppliers(): Supplier[] {
  return suppliersData.map(s => ({
    ...s,
    total_items: s.items.length,
  }))
}

export function getOrders(): Order[] {
  return ordersData
}

export function getAgentLogs(): AgentLogEntry[] {
  return agentLogsData
}

export function getDashboardKPIs() {
  const enriched = getEnrichedProducts()
  const critical = enriched.filter(p => p.status === 'critical').length
  const warning = enriched.filter(p => p.status === 'warning').length
  const safe = enriched.filter(p => p.status === 'safe').length

  const chartData = getSalesByDate(30)
  const totalOmzet = chartData.reduce((sum, d) => sum + d.total, 0)
  const avgDaily = Math.round(totalOmzet / 30)
  const totalTransactions = chartData.reduce((sum, d) => sum + d.count, 0)

  const pendingOrders = ordersData.filter(o => o.status === 'pending' || o.status === 'draft').length
  const approvedOrders = ordersData.filter(o => o.status === 'approved' || o.status === 'disetujui').length

  return {
    totalProducts: productsData.length,
    criticalStock: critical,
    warningStock: warning,
    safeStock: safe,
    totalOmzet,
    avgDaily,
    totalTransactions,
    pendingOrders,
    approvedOrders,
  }
}
