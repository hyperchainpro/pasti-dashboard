'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Lock, ArrowRight, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import TurnstileWidget from '@/components/auth/turnstile-widget'

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [token, setToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [tokenError, setTokenError] = useState('')

  useEffect(() => {
    const t = searchParams.get('token')
    if (!t) {
      setTokenError('Token reset password tidak ditemukan di URL. Pastikan Anda mengklik link dari email.')
    } else {
      setToken(t)
    }
  }, [searchParams])

  const passwordChecks = {
    length: newPassword.length >= 8,
    hasUpper: /[A-Z]/.test(newPassword),
    hasLower: /[a-z]/.test(newPassword),
    hasNumber: /[0-9]/.test(newPassword),
  }
  const passwordScore = Object.values(passwordChecks).filter(Boolean).length
  const passwordValid = passwordScore === 4

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (tokenError) return
    if (newPassword !== confirmPassword) {
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
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newPassword,
          captchaToken,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Gagal reset password')
        return
      }
      toast.success('Password berhasil direset', {
        description: 'Silakan login dengan password baru Anda.',
      })
      setTimeout(() => router.push('/login'), 1000)
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
          <Lock className="h-6 w-6 text-emerald-400" />
        </div>
        <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
        <CardDescription>
          Masukkan password baru untuk akun Anda
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {(error || tokenError) && (
            <Alert variant="destructive">
              <AlertDescription>{error || tokenError}</AlertDescription>
            </Alert>
          )}
          {token && !tokenError && (
            <div className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
              <span className="font-medium">Token:</span> {token.slice(0, 12)}...{token.slice(-8)}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="newPassword">Password Baru</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="newPassword"
                type="password"
                placeholder="••••••••"
                className="pl-9"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
                disabled={loading || !!tokenError}
              />
            </div>
            {newPassword && (
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
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
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
                disabled={loading || !!tokenError}
              />
              {confirmPassword && confirmPassword === newPassword && (
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
            disabled={loading || !captchaToken || !passwordValid || !!tokenError}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Mereset...
              </>
            ) : (
              <>
                Reset Password
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
