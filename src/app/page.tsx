'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Package,
  TrendingUp,
  Brain,
  ShoppingCart,
  Bot,
  RefreshCw,
  Menu,
  X,
} from 'lucide-react'
import { OverviewTab } from '@/components/dashboard/overview-tab'
import { InventoryTab } from '@/components/dashboard/inventory-tab'
import { SalesTab } from '@/components/dashboard/sales-tab'
import { ForecastTab } from '@/components/dashboard/forecast-tab'
import { OrdersTab } from '@/components/dashboard/orders-tab'
import { AgentTab } from '@/components/dashboard/agent-tab'

const tabs = [
  { value: 'overview', label: 'Ringkasan', icon: LayoutDashboard },
  { value: 'inventory', label: 'Inventaris', icon: Package },
  { value: 'sales', label: 'Penjualan', icon: TrendingUp },
  { value: 'forecast', label: 'Prediksi AI', icon: Brain },
  { value: 'orders', label: 'Pesanan', icon: ShoppingCart },
  { value: 'agent', label: 'Agent Log', icon: Bot },
]

export default function Home() {
  const [activeTab, setActiveTab] = useState('overview')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [seeding, setSeeding] = useState(false)

  const handleReseed = async () => {
    setSeeding(true)
    try {
      const r = await fetch('/api/seed', { method: 'POST' })
      const data = await r.json()
      if (data.success) {
        window.location.reload()
      }
    } catch (_e) {
      // ignore
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <span className="text-white font-bold text-xs">P</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-sm font-bold tracking-tight">
                  <span className="text-emerald-400">PASTI</span>
                  <span className="text-muted-foreground ml-1.5 font-normal text-xs">
                    AI Procurement Agent
                  </span>
                </h1>
              </div>
            </div>

            <nav className="hidden lg:flex items-center gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value)}
                    className={[
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap',
                      activeTab === tab.value
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                    ].join(' ')}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReseed}
                disabled={seeding}
                className="text-muted-foreground hover:text-emerald-400 h-8 px-2"
              >
                <RefreshCw className={seeding ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
              </Button>
              <button
                className="lg:hidden p-2 rounded-md text-muted-foreground hover:text-foreground"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-border/50 pb-3 pt-2">
              <div className="grid grid-cols-3 gap-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.value}
                      onClick={() => {
                        setActiveTab(tab.value)
                        setMobileMenuOpen(false)
                      }}
                      className={[
                        'flex flex-col items-center gap-1 p-2.5 rounded-lg text-xs transition-all',
                        activeTab === tab.value
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'text-muted-foreground hover:text-foreground',
                      ].join(' ')}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'inventory' && <InventoryTab />}
          {activeTab === 'sales' && <SalesTab />}
          {activeTab === 'forecast' && <ForecastTab />}
          {activeTab === 'orders' && <OrdersTab />}
          {activeTab === 'agent' && <AgentTab />}
        </div>
      </main>

      <footer className="border-t border-border/30 mt-auto">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-emerald-400 font-semibold">PASTI</span>
              <span className="text-xs text-muted-foreground">
                Proactive Agentic Supply-chain Tracking & Inventory
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                Agent Aktif
              </Badge>
              <span className="text-xs text-muted-foreground">
                Demo UMKM F&B Indonesia
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
