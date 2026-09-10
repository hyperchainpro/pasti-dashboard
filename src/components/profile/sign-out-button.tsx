'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Loader2, LogOut } from 'lucide-react'
import { toast } from 'sonner'

interface SignOutButtonProps {
  signOutFn: () => Promise<void>
}

export function SignOutButton({ signOutFn }: SignOutButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSignOut() {
    setLoading(true)
    try {
      await signOutFn()
      toast.success('Berhasil keluar')
      router.push('/login')
      router.refresh()
    } catch (err) {
      toast.error('Gagal keluar', { description: String(err) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" onClick={handleSignOut} disabled={loading} className="text-red-400 border-red-500/30 hover:bg-red-500/10">
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <LogOut className="h-4 w-4 mr-2" />
      )}
      Keluar
    </Button>
  )
}
