'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, ArrowRight, MailCheck } from 'lucide-react'
import { toast } from 'sonner'
import TurnstileWidget from '@/components/auth/turnstile-widget'

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!captchaToken) {
      setError('Harap selesaikan verifikasi captcha')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, captchaToken }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Gagal mengirim email reset')
        return
      }
      setSubmitted(true)
      toast.success('Permintaan terkirim', { description: data.message })
    } catch (err) {
      setError('Network error: ' + String(err))
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <Card className="w-full max-w-md mx-auto border-emerald-500/20 bg-card/95 backdrop-blur">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <MailCheck className="h-6 w-6 text-emerald-400" />
          </div>
          <CardTitle className="text-2xl font-bold">Cek Email Anda</CardTitle>
          <CardDescription>
            Jika email <span className="text-emerald-400 font-medium">{email}</span> terdaftar,
            link reset password telah dikirim. Cek folder spam jika tidak ada dalam 5 menit.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col gap-3">
          <Link href="/login" className="w-full">
            <Button variant="outline" className="w-full">
              Kembali ke Login
            </Button>
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto border-emerald-500/20 bg-card/95 backdrop-blur">
      <CardHeader className="space-y-3 text-center">
        <div className="mx-auto h-12 w-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
          <Mail className="h-6 w-6 text-amber-400" />
        </div>
        <CardTitle className="text-2xl font-bold">Lupa Password</CardTitle>
        <CardDescription>
          Masukkan email Anda dan kami akan mengirim link reset password
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
            <Label>Verifikasi Keamanan</Label>
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
                Mengirim...
              </>
            ) : (
              <>
                Kirim Link Reset
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Ingat password?{' '}
            <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium">
              Kembali ke Login
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
