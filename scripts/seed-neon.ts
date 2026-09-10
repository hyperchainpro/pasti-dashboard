/**
 * Seed Neon DB directly from JSON files.
 *
 * Usage:
 *   bunx tsx scripts/seed-neon.ts
 *
 * Prereqs:
 *   - .env contains DATABASE_URL pointing to Neon
 *   - `bunx prisma db push` has been run
 */
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('DATABASE_URL not set in .env')
    process.exit(1)
  }

  if (!databaseUrl.startsWith('postgres')) {
    console.error(`Expected Neon postgres URL, got: ${databaseUrl}`)
    process.exit(1)
  }

  const db = new PrismaClient()
  const dataDir = path.join(process.cwd(), 'public', 'data')

  console.log('🌱 Seeding Neon DB from', dataDir)

  // ── Products ──
  const productsRaw = JSON.parse(fs.readFileSync(path.join(dataDir, 'products.json'), 'utf-8'))
  for (const p of productsRaw) {
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
  console.log(`  ✓ Products: ${productsRaw.length}`)

  const dbProducts = await db.product.findMany()
  const productIdMap = new Map(dbProducts.map((p) => [p.kode, p.productId]))

  // ── Suppliers ──
  const suppliersRaw = JSON.parse(fs.readFileSync(path.join(dataDir, 'suppliers.json'), 'utf-8'))
  for (const s of suppliersRaw) {
    const prices = s.items.map((i) => i.harga)
    const productIds = s.items.map((i) => i.product_id).join(', ')
    await db.supplier.upsert({
      where: { supplierId: s.supplier_id },
      update: {
        nama: s.nama,
        kontak: '-',
        produk: productIds,
        hargaMin: Math.min(...prices),
        hargaMax: Math.max(...prices),
        leadTime: `${s.lead_time_hari} hari`,
        rating: 4.5,
      },
      create: {
        supplierId: s.supplier_id,
        nama: s.nama,
        kontak: '-',
        produk: productIds,
        hargaMin: Math.min(...prices),
        hargaMax: Math.max(...prices),
        leadTime: `${s.lead_time_hari} hari`,
        rating: 4.5,
      },
    })
  }
  console.log(`  ✓ Suppliers: ${suppliersRaw.length}`)

  // ── Sales ──
  const salesRaw = JSON.parse(fs.readFileSync(path.join(dataDir, 'sales.json'), 'utf-8'))
  let salesCount = 0
  for (const s of salesRaw) {
    const productId = productIdMap.get(s.product_id)
    if (!productId) continue
    const product = dbProducts.find((p) => p.kode === s.product_id)
    const hargaSatuan = product?.hargaJual || 0
    await db.sale.upsert({
      where: { saleId: s.sale_id },
      update: {},
      create: {
        saleId: s.sale_id,
        productId,
        tanggal: s.tanggal,
        jumlah: s.qty,
        hargaSatuan,
        total: Math.round(s.qty * hargaSatuan),
      },
    })
    salesCount++
  }
  console.log(`  ✓ Sales: ${salesCount}`)

  // ── Orders ──
  const ordersRaw = JSON.parse(fs.readFileSync(path.join(dataDir, 'orders.json'), 'utf-8'))
  for (const o of ordersRaw) {
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
  console.log(`  ✓ Orders: ${ordersRaw.length}`)

  // ── Agent Logs ──
  const logsRaw = JSON.parse(fs.readFileSync(path.join(dataDir, 'agent_logs.json'), 'utf-8'))
  for (const l of logsRaw) {
    await db.agentLog.upsert({
      where: { traceId: l.trace_id },
      update: {
        timestamp: l.waktu,
        step: l.keputusan,
        detail: JSON.stringify({
          thoughts: l.thoughts,
          tools_called: l.tools_called,
          keputusan: l.keputusan,
          hasil: l.hasil,
        }),
      },
      create: {
        traceId: l.trace_id,
        timestamp: l.waktu,
        step: l.keputusan,
        detail: JSON.stringify({
          thoughts: l.thoughts,
          tools_called: l.tools_called,
          keputusan: l.keputusan,
          hasil: l.hasil,
        }),
      },
    })
  }
  console.log(`  ✓ Agent Logs: ${logsRaw.length}`)

  console.log('\n✅ Seed completed!')
  await db.$disconnect()
}

main().catch((err) => {
  console.error('Seed error:', err)
  process.exit(1)
})
