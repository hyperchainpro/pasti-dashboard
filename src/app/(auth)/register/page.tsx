'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, ShoppingBag, User, Mail, Lock, ArrowRight, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import TurnstileWidget from '@/components/auth/turnstile-widget'

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [error, setError] = useState('')

  const passwordChecks = {
    length: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  }
  const passwordScore = Object.values(passwordChecks).filter(Boolean).length
  const passwordValid = passwordScore === 4

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Password dan konfirmasi password tidak cocok')
      return
    }
    if (!passwordValid) {
      setError('Password belum memenuhi syarat keamanan')
      return
    }
    if (!captchaToken) {
      setError('Harap selesaikan verifikasi captcha')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, captchaToken }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Gagal mendaftar')
        return
      }
      toast.success('Akun berhasil dibuat', {
        description: 'Silakan masuk dengan email dan password Anda.',
      })
      setTimeout(() => router.push('/login'), 800)
    } catch (err) {
      setError('Network error: ' + String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto border-emerald-500/20 bg-card/95 backdrop-blur">
      <CardHeader className="space-y-3 text-center">
        <div className="mx-auto h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
          <ShoppingBag className="h-6 w-6 text-emerald-400" />
        </div>
        <CardTitle className="text-2xl font-bold">Buat Akun PASTI</CardTitle>
        <CardDescription>
          Daftar gratis untuk mengakses dashboard AI procurement agent
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
            <Label htmlFor="name">Nama Lengkap</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="name"
                type="text"
                placeholder="Bu Sari / Pak Andi"
                className="pl-9"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                autoComplete="name"
                disabled={loading}
              />
            </div>
          </div>
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
            <Label htmlFor="password">Password</Label>
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
                autoComplete="new-password"
                disabled={loading}
              />
            </div>
            {password && (
              <div className="space-y-1.5">
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i < passwordScore
                          ? passwordScore === 4
                            ? 'bg-emerald-500'
                            : 'bg-amber-500'
                          : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
                <ul className="text-xs space-y-0.5">
                  <li className={passwordChecks.length ? 'text-emerald-500' : 'text-muted-foreground'}>
                    {passwordChecks.length ? '✓' : '○'} Minimal 8 karakter
                  </li>
                  <li className={passwordChecks.hasUpper ? 'text-emerald-500' : 'text-muted-foreground'}>
                    {passwordChecks.hasUpper ? '✓' : '○'} Huruf besar (A-Z)
                  </li>
                  <li className={passwordChecks.hasLower ? 'text-emerald-500' : 'text-muted-foreground'}>
                    {passwordChecks.hasLower ? '✓' : '○'} Huruf kecil (a-z)
                  </li>
                  <li className={passwordChecks.hasNumber ? 'text-emerald-500' : 'text-muted-foreground'}>
                    {passwordChecks.hasNumber ? '✓' : '○'} Angka (0-9)
                  </li>
                </ul>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                className="pl-9"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                disabled={loading}
              />
              {confirmPassword && confirmPassword === password && (
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
              )}
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
            disabled={loading || !captchaToken || !passwordValid}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Mendaftarkan...
              </>
            ) : (
              <>
                Daftar Sekarang
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Sudah punya akun?{' '}
            <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium">
              Masuk di sini
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
