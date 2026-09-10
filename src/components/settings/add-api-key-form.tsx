'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Loader2, Key } from 'lucide-react'
import { toast } from 'sonner'

const PROVIDERS = [
  { value: 'openrouter', label: 'OpenRouter', defaultModel: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free', helpUrl: 'https://openrouter.ai/keys' },
  { value: 'openai', label: 'OpenAI', defaultModel: 'gpt-4o-mini', helpUrl: 'https://platform.openai.com/api-keys' },
  { value: 'anthropic', label: 'Anthropic', defaultModel: 'claude-3-5-haiku-20241022', helpUrl: 'https://console.anthropic.com/settings/keys' },
  { value: 'xyphosrouter', label: 'XyphosRouter', defaultModel: 'gpt-4o', helpUrl: '#' },
  { value: 'custom', label: 'Custom (OpenAI-compatible)', defaultModel: '', helpUrl: '' },
]

export function AddApiKeyForm() {
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [provider, setProvider] = useState('openrouter')
  const [key, setKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [model, setModel] = useState('')
  const [error, setError] = useState('')

  function handleProviderChange(value: string) {
    setProvider(value)
    const p = PROVIDERS.find((x) => x.value === value)
    if (p) setModel(p.defaultModel)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name || !provider || !key) {
      setError('Nama, provider, dan key wajib diisi')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          provider,
          key,
          baseUrl: baseUrl || undefined,
          model: model || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Gagal menambahkan API key')
        return
      }
      toast.success('API key berhasil ditambahkan', {
        description: `${name} (${provider}) — agent akan otomatis pakai key ini.`,
      })
      setName('')
      setKey('')
      setBaseUrl('')
      setModel('')
      // Refresh page to show new key
      setTimeout(() => window.location.reload(), 800)
    } catch (err) {
      setError('Network error: ' + String(err))
    } finally {
      setLoading(false)
    }
  }

  const selectedProvider = PROVIDERS.find((p) => p.value === provider)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Plus className="h-5 w-5 text-emerald-400" />
          Tambah Custom API Key
        </CardTitle>
        <CardDescription>
          Tambahkan API key pribadi Anda untuk agent
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nama (label bebas)</Label>
            <Input
              id="name"
              type="text"
              placeholder="Contoh: OpenRouter Personal"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider">Provider</Label>
            <Select value={provider} onValueChange={handleProviderChange}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih provider" />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProvider?.helpUrl && selectedProvider.helpUrl !== '#' && (
              <p className="text-xs text-muted-foreground">
                Dapatkan API key di{' '}
                <a
                  href={selectedProvider.helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:underline"
                >
                  {selectedProvider.helpUrl}
                </a>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="key">API Key</Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="key"
                type="password"
                placeholder="sk-or-v1-... / sk-... / etc"
                className="pl-9 font-mono"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Disimpan terenkripsi (base64) — hanya digunakan saat agent run
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="baseUrl">Base URL (opsional)</Label>
            <Input
              id="baseUrl"
              type="url"
              placeholder="https://openrouter.ai/api/v1 (default per provider)"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">Override untuk custom gateway (mis. proxy lokal)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Model (opsional)</Label>
            <Input
              id="model"
              type="text"
              placeholder="mis. gpt-4o-mini, claude-3-5-haiku"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">Model spesifik untuk key ini (override default server)</p>
          </div>

          <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Tambah API Key
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
