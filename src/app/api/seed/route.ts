import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function POST() {
  try {
    const dataDir = path.join(process.cwd(), 'download', 'pasti_seed_data')

    // Seed products
    const productsRaw = fs.readFileSync(path.join(dataDir, 'products.json'), 'utf-8')
    const products = JSON.parse(productsRaw) as Array<{
      product_id: string
      nama: string
      unit: string
      stok_saat_ini: number
      stok_min: number
      safety_stock: number
      harga_jual: number
    }>

    for (const p of products) {
      await db.product.upsert({
        where: { kode: p.product_id },
        update: {
          nama: p.nama,
          unit: p.unit,
          stokSaIni: p.stok_saat_ini,
          stokMin: p.stok_min,
          safetyStock: p.safety_stock,
          hargaJual: p.harga_jual,
        },
        create: {
          kode: p.product_id,
          nama: p.nama,
          unit: p.unit,
          stokSaIni: p.stok_saat_ini,
          stokMin: p.stok_min,
          safetyStock: p.safety_stock,
          hargaJual: p.harga_jual,
        },
      })
    }

    // Get product ID mapping
    const dbProducts = await db.product.findMany()
    const productIdMap = new Map(dbProducts.map((p) => [p.kode, p.productId]))

    // Seed suppliers - transform from actual JSON format
    const suppliersRaw = fs.readFileSync(path.join(dataDir, 'suppliers.json'), 'utf-8')
    const suppliers = JSON.parse(suppliersRaw) as Array<{
      supplier_id: string
      nama: string
      lead_time_hari: number
      items: Array<{ product_id: string; harga: number; min_order: number }>
    }>

    for (const s of suppliers) {
      const prices = s.items.map((i) => i.harga)
      const minPrice = Math.min(...prices)
      const maxPrice = Math.max(...prices)
      const productIds = s.items.map((i) => i.product_id).join(', ')

      await db.supplier.upsert({
        where: { supplierId: s.supplier_id },
        update: {
          nama: s.nama,
          kontak: '-',
          produk: productIds,
          hargaMin: minPrice,
          hargaMax: maxPrice,
          leadTime: `${s.lead_time_hari} hari`,
          rating: 4.5,
        },
        create: {
          supplierId: s.supplier_id,
          nama: s.nama,
          kontak: '-',
          produk: productIds,
          hargaMin: minPrice,
          hargaMax: maxPrice,
          leadTime: `${s.lead_time_hari} hari`,
          rating: 4.5,
        },
      })
    }

    // Seed sales
    const salesRaw = fs.readFileSync(path.join(dataDir, 'sales.json'), 'utf-8')
    const sales = JSON.parse(salesRaw) as Array<{
      sale_id: string
      product_id: string
      qty: number
      tanggal: string
    }>

    for (const s of sales) {
      const productId = productIdMap.get(s.product_id)
      if (!productId) continue
      // Get product price for total calculation
      const product = dbProducts.find((p) => p.kode === s.product_id)
      const hargaSatuan = product?.hargaJual || 0
      const total = Math.round(s.qty * hargaSatuan)

      await db.sale.upsert({
        where: { saleId: s.sale_id },
        update: {},
        create: {
          saleId: s.sale_id,
          productId,
          tanggal: s.tanggal,
          jumlah: s.qty,
          hargaSatuan,
          total,
        },
      })
    }

    // Seed orders - transform from actual JSON format
    const ordersRaw = fs.readFileSync(path.join(dataDir, 'orders.json'), 'utf-8')
    const orders = JSON.parse(ordersRaw) as Array<{
      po_id: string
      supplier_id: string
      supplier_nama: string
      items: Array<{
        product_id: string
        nama: string
        qty: number
        harga_satuan: number
        subtotal: number
      }>
      total: number
      status: string
      dibuat_oleh: string
      approved_at: string | null
    }>

    for (const o of orders) {
      await db.purchaseOrder.upsert({
        where: { poId: o.po_id },
        update: { status: o.status },
        create: {
          poId: o.po_id,
          items: JSON.stringify(o.items),
          supplierId: o.supplier_id,
          totalHarga: o.total,
          status: o.status,
          createdAt: o.approved_at || '2026-08-01',
        },
      })
    }

    // Seed agent logs - transform from actual JSON format
    const logsRaw = fs.readFileSync(path.join(dataDir, 'agent_logs.json'), 'utf-8')
    const logs = JSON.parse(logsRaw) as Array<{
      trace_id: string
      waktu: string
      thoughts: string[]
      tools_called: string[]
      keputusan: string
      hasil: string
    }>

    for (const l of logs) {
      const fullLog = JSON.stringify({
        thoughts: l.thoughts,
        tools_called: l.tools_called,
        keputusan: l.keputusan,
        hasil: l.hasil,
      })

      await db.agentLog.upsert({
        where: { traceId: l.trace_id },
        update: {
          timestamp: l.waktu,
          step: l.keputusan,
          detail: fullLog,
        },
        create: {
          traceId: l.trace_id,
          timestamp: l.waktu,
          step: l.keputusan,
          detail: fullLog,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Data seeded successfully',
      counts: {
        products: products.length,
        suppliers: suppliers.length,
        sales: sales.length,
        orders: orders.length,
        agentLogs: logs.length,
      },
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
