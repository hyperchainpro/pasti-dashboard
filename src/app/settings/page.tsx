'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { redirect } from 'next/navigation'
import { ApiKeyList } from '@/components/settings/api-key-list'
import { AddApiKeyForm } from '@/components/settings/add-api-key-form'
import { ServerKeyInfo } from '@/components/settings/server-key-info'
import { Loader2 } from 'lucide-react'

interface ApiKeyEntry {
  id: string
  name: string
  provider: string
  key: string
  baseUrl: string | null
  model: string | null
  isActive: boolean
  lastUsedAt: string | null
  createdAt: string
}

interface SettingsData {
  keys: ApiKeyEntry[]
  hasServerKey: boolean
  serverModel: string
}

export default function SettingsPage() {
  const { status } = useSession()
  const [data, setData] = useState<SettingsData | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/login')
      return
    }
    if (status !== 'authenticated') return
    fetch('/settings/data')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then(setData)
      .catch((e) => console.error(e))
  }, [status, reloadKey])

  if (status !== 'authenticated' || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Kelola custom LLM API keys untuk agent Anda
        </p>
      </div>

      <ServerKeyInfo
        hasServerKey={data.hasServerKey}
        serverModel={data.serverModel}
        userKeyCount={data.keys.length}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <AddApiKeyForm onAdded={() => setReloadKey((k) => k + 1)} />
        <ApiKeyList keys={data.keys} onChange={() => setReloadKey((k) => k + 1)} />
      </div>
    </div>
  )
}
