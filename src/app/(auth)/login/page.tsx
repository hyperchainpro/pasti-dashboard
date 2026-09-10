'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, ShoppingBag, Mail, Lock, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import TurnstileWidget from '@/components/auth/turnstile-widget'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!captchaToken) {
      setError('Harap selesaikan verifikasi captcha terlebih dahulu')
      return
    }
    setLoading(true)
    try {
      // Use signIn from next-auth/react — handles CSRF + session automatically
      const result = await signIn('credentials', {
        email,
        password,
        captchaToken,
        redirect: false,
      })
      if (result?.error) {
        setError('Email, password, atau captcha salah')
        setLoading(false)
        return
      }
      if (result?.ok) {
        toast.success('Login berhasil', { description: 'Mengalihkan ke dashboard...' })
        router.push('/')
        router.refresh()
      } else {
        setError('Login gagal. Silakan coba lagi.')
        setLoading(false)
      }
    } catch (err) {
      setError('Network error: ' + String(err))
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto border-emerald-500/20 bg-card/95 backdrop-blur">
      <CardHeader className="space-y-3 text-center">
        <div className="mx-auto h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
          <ShoppingBag className="h-6 w-6 text-emerald-400" />
        </div>
        <CardTitle className="text-2xl font-bold">Masuk ke PASTI</CardTitle>
        <CardDescription>
          Masukkan email dan password Anda untuk mengakses dashboard
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="anda@contoh.com"
                className="pl-9"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={loading}
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-emerald-400 hover:text-emerald-300"
              >
                Lupa password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="pl-9"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={loading}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Verifikasi Keamanan (wajib)</Label>
            <TurnstileWidget onVerify={setCaptchaToken} />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button
            type="submit"
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
            disabled={loading || !captchaToken}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                Masuk
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Belum punya akun?{' '}
            <Link href="/register" className="text-emerald-400 hover:text-emerald-300 font-medium">
              Daftar di sini
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
