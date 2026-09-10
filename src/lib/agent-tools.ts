// ─────────────────────────────────────────────────────────────
// PASTI — Local tool implementations for OpenRouter agent loop
// ─────────────────────────────────────────────────────────────
// These are the deterministic TypeScript equivalents of the Lambda
// functions described in `bedrock_agent/create_agent.py`. The LLM
// decides what to call; this module computes the result.

import { getEnrichedProducts, getSalesWithDetails, getSuppliers, getForecasts } from './demo-data'
import type { OpenRouterTool } from './openrouter'

// ── Tool schemas (OpenAI-style function-calling) ──
export const PASTI_TOOLS: OpenRouterTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_inventory_status',
      description: 'Ambil status inventaris semua produk beserta level stok (safe/warning/critical).',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_sales_history',
      description: 'Ambil riwayat penjualan 30 hari terakhir untuk satu produk atau semua produk.',
      parameters: {
        type: 'object',
        properties: {
          product_id: { type: 'string', description: 'ID produk (opsional; jika kosong = semua)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'forecast_demand',
      description:
        'Prediksi kebutuhan besok untuk sebuah produk. Hasil dihitung deterministik ' +
        '(MA7/MA30 + adjustment weekend/payday). LLM TIDAK boleh menghitung angka sendiri.',
      parameters: {
        type: 'object',
        required: ['product_id'],
        properties: {
          product_id: { type: 'string', description: 'ID produk yang diprediksi' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_supplier_offers',
      description: 'Ambil penawaran supplier (harga, lead time, min order) untuk sebuah produk.',
      parameters: {
        type: 'object',
        required: ['product_id'],
        properties: {
          product_id: { type: 'string', description: 'ID produk' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_draft_po',
      description:
        'Buat draft Purchase Order. Status default: draft (perlu approval owner). ' +
        'Mengembalikan po_id untuk referensi notifikasi Telegram.',
      parameters: {
        type: 'object',
        required: ['supplier_id', 'items'],
        properties: {
          supplier_id: { type: 'string', description: 'ID supplier' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              required: ['product_id', 'qty'],
              properties: {
                product_id: { type: 'string' },
                qty: { type: 'number' },
              },
            },
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_telegram_approval',
      description: 'Kirim draft PO ke owner via Telegram dengan tombol Approve/Edit/Tolak.',
      parameters: {
        type: 'object',
        required: ['po_id'],
        properties: {
          po_id: { type: 'string', description: 'ID Purchase Order' },
        },
      },
    },
  },
]

// ── Tool executor ──
export interface ToolContext {
  createdPOs: Array<{
    po_id: string
    supplier_id: string
    supplier_nama: string
    items: Array<{ product_id: string; nama: string; qty: number; harga_satuan: number; subtotal: number }>
    total: number
    status: 'draft'
    dibuat_oleh: 'PASTI-AI'
    approved_at: null
  }>
  telegramSent: boolean
}

export function newToolContext(): ToolContext {
  return { createdPOs: [], telegramSent: false }
}

export function executeTool(name: string, args: Record<string, unknown>, ctx: ToolContext): string {
  try {
    switch (name) {
      case 'get_inventory_status': {
        const products = getEnrichedProducts()
        return JSON.stringify(
          products.map((p) => ({
            product_id: p.product_id,
            nama: p.nama,
            unit: p.unit,
            stok_saat_ini: p.stok_saat_ini,
            stok_min: p.stok_min,
            safety_stock: p.safety_stock,
            status: p.status,
          }))
        )
      }
      case 'get_sales_history': {
        const productId = args.product_id as string | undefined
        const sales = getSalesWithDetails().filter((s) => !productId || s.product_id === productId)
        const last30 = sales.slice(-30)
        return JSON.stringify(
          last30.map((s) => ({
            sale_id: s.sale_id,
            product_id: s.product_id,
            nama: s.product_nama,
            tanggal: s.tanggal,
            qty: s.qty,
            harga_satuan: s.harga_satuan,
            total: s.total,
          }))
        )
      }
      case 'forecast_demand': {
        const productId = args.product_id as string
        const forecasts = getForecasts()
        const f = forecasts.find((x) => x.kode === productId)
        if (!f) return JSON.stringify({ error: `Product ${productId} not found` })
        return JSON.stringify({
          product_id: f.kode,
          nama: f.nama,
          ma7: f.ma7,
          ma30: f.ma30,
          base_forecast: f.baseForecast,
          multiplier: f.multiplier,
          adjusted_forecast: f.adjustedForecast,
          stok_saat_ini: f.stokSaIni,
          reorder_qty: f.reorderQty,
          perlu_order: f.perluOrder,
        })
      }
      case 'get_supplier_offers': {
        const productId = args.product_id as string
        const suppliers = getSuppliers()
        const offers: Array<{
          supplier_id: string
          supplier_nama: string
          harga: number
          min_order: number
          lead_time_hari: number
          produk_lain: string[]
        }> = []
        for (const s of suppliers) {
          const match = s.items.find((i) => i.product_id === productId)
          if (match) {
            offers.push({
              supplier_id: s.supplier_id,
              supplier_nama: s.nama,
              harga: match.harga,
              min_order: match.min_order,
              lead_time_hari: s.lead_time_hari,
              produk_lain: s.items.filter((i) => i.product_id !== productId).map((i) => i.product_id),
            })
          }
        }
        return JSON.stringify({ product_id: productId, offers })
      }
      case 'create_draft_po': {
        const supplierId = args.supplier_id as string
        const items = (args.items as Array<{ product_id: string; qty: number }>) || []
        const suppliers = getSuppliers()
        const supplier = suppliers.find((s) => s.supplier_id === supplierId)
        if (!supplier) return JSON.stringify({ error: `Supplier ${supplierId} not found` })

        const poItems = items.map((it) => {
          const offer = supplier.items.find((o) => o.product_id === it.product_id)
          const harga = offer?.harga || 0
          return {
            product_id: it.product_id,
            nama: it.product_id, // LLM should pass nama; fallback to id
            qty: it.qty,
            harga_satuan: harga,
            subtotal: Math.round(harga * it.qty),
          }
        })
        const total = poItems.reduce((sum, it) => sum + it.subtotal, 0)
        const poId = `PO-${Date.now().toString(36).toUpperCase()}`
        const po = {
          po_id: poId,
          supplier_id: supplier.supplier_id,
          supplier_nama: supplier.nama,
          items: poItems,
          total,
          status: 'draft' as const,
          dibuat_oleh: 'PASTI-AI' as const,
          approved_at: null,
        }
        ctx.createdPOs.push(po)
        return JSON.stringify({
          success: true,
          po_id: poId,
          supplier_nama: supplier.nama,
          total_items: poItems.length,
          total_harga: total,
          status: 'draft',
          next_step: 'send_telegram_approval',
        })
      }
      case 'send_telegram_approval': {
        const poId = args.po_id as string
        const po = ctx.createdPOs.find((p) => p.po_id === poId)
        if (!po) return JSON.stringify({ error: `PO ${poId} not found` })
        ctx.telegramSent = true
        return JSON.stringify({
          success: true,
          message: `Draft PO ${poId} (${po.supplier_nama}, Rp ${po.total.toLocaleString('id-ID')}) telah dikirim ke Telegram owner.`,
          buttons: ['Approve', 'Edit', 'Tolak'],
          next_step: 'Menunggu approval owner',
        })
      }
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` })
    }
  } catch (err) {
    return JSON.stringify({ error: String(err) })
  }
}
