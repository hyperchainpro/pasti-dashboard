'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  User as UserIcon,
  Settings,
  LogOut,
  ChevronDown,
  Loader2,
} from 'lucide-react'
import { OverviewTab } from '@/components/dashboard/overview-tab'
import { InventoryTab } from '@/components/dashboard/inventory-tab'
import { SalesTab } from '@/components/dashboard/sales-tab'
import { ForecastTab } from '@/components/dashboard/forecast-tab'
import { OrdersTab } from '@/components/dashboard/orders-tab'
import { AgentTab } from '@/components/dashboard/agent-tab'
import { toast } from 'sonner'

const tabs = [
  { value: 'overview', label: 'Ringkasan', icon: LayoutDashboard },
  { value: 'inventory', label: 'Inventaris', icon: Package },
  { value: 'sales', label: 'Penjualan', icon: TrendingUp },
  { value: 'forecast', label: 'Prediksi AI', icon: Brain },
  { value: 'orders', label: 'Pesanan', icon: ShoppingCart },
  { value: 'agent', label: 'Agent Log', icon: Bot },
]

export function DashboardClient() {
  const router = useRouter()
  const { data: session, status } = useSession()
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

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' })
    toast.success('Berhasil keluar')
  }

  // Loading state while session is being fetched
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
      </div>
    )
  }

  // If unauthenticated, redirect to login (middleware also handles this, but for safety)
  if (status === 'unauthenticated') {
    if (typeof window !== 'undefined') router.push('/login')
    return null
  }

  // session might still be loading
  const user = session?.user
  const displayName = user?.name || user?.email || 'User'
  const initials = displayName
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

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
                title="Re-seed database"
              >
                <RefreshCw className={seeding ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 p-1 pr-2 rounded-md hover:bg-muted/50 transition-colors">
                    <Avatar className="h-7 w-7 border border-emerald-500/30">
                      <AvatarImage src={user?.image || undefined} />
                      <AvatarFallback className="bg-emerald-500/20 text-emerald-400 text-xs font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline text-xs text-muted-foreground max-w-[120px] truncate">
                      {displayName}
                    </span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{displayName}</p>
                      {user?.email && (
                        <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer">
                      <UserIcon className="h-4 w-4 mr-2" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="cursor-pointer">
                      <Settings className="h-4 w-4 mr-2" />
                      Settings & API Keys
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-400 cursor-pointer">
                    <LogOut className="h-4 w-4 mr-2" />
                    Keluar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

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
