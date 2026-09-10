// /settings — Manage custom LLM API keys
// User can add OpenRouter / OpenAI / Anthropic / XyphosRouter / custom API keys
// The agent will use the user's active key instead of the server default

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { ApiKeyList } from '@/components/settings/api-key-list'
import { AddApiKeyForm } from '@/components/settings/add-api-key-form'
import { ServerKeyInfo } from '@/components/settings/server-key-info'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  const [userKeys, userKeyCount] = await Promise.all([
    db.apiKey.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        provider: true,
        key: true,
        baseUrl: true,
        model: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
      },
    }),
    db.apiKey.count({ where: { userId: session.user.id } }),
  ])

  // Mask keys for client display
  const maskedKeys = userKeys.map((k) => {
    let decrypted = k.key
    try {
      decrypted = Buffer.from(k.key, 'base64').toString('utf-8')
    } catch {}
    const masked = decrypted.length <= 12 ? '****' : decrypted.slice(0, 6) + '****' + decrypted.slice(-4)
    return { ...k, key: masked }
  })

  const hasServerKey = !!process.env.OPENROUTER_API_KEY
  const serverModel = process.env.OPENROUTER_MODEL || '(not set)'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Kelola custom LLM API keys untuk agent Anda
        </p>
      </div>

      <ServerKeyInfo hasServerKey={hasServerKey} serverModel={serverModel} userKeyCount={userKeyCount} />

      <div className="grid gap-6 md:grid-cols-2">
        <AddApiKeyForm />
        <ApiKeyList keys={maskedKeys} />
      </div>
    </div>
  )
}
