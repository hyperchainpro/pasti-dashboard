'use client'

import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { redirect } from 'next/navigation'
import { ProfileCard } from '@/components/profile/profile-card'
import { ChangePasswordCard } from '@/components/profile/change-password-card'
import { RecentActivityCard } from '@/components/profile/recent-activity-card'
import { SignOutButton } from '@/components/profile/sign-out-button'
import { Loader2 } from 'lucide-react'

interface UserProfile {
  id: string
  name: string | null
  email: string
  image: string | null
  role: string
  emailVerified: Date | null
  createdAt: Date
}

interface ProfileData {
  user: UserProfile
  stats: { apiKeyCount: number; agentLogCount: number; lastRun: Date | null }
  recentLogs: Array<{
    traceId: string
    timestamp: string
    step: string
    createdAt: Date
  }>
}

export default function ProfilePage() {
  const { status } = useSession()
  const [data, setData] = useState<ProfileData | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/login')
      return
    }
    if (status !== 'authenticated') return
    fetch('/profile/data')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then(setData)
      .catch((e) => console.error(e))
  }, [status])

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
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Kelola informasi akun dan keamanan Anda
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <ProfileCard user={data.user} stats={data.stats} />
        <ChangePasswordCard />
      </div>

      <RecentActivityCard logs={data.recentLogs} />

      <div className="flex justify-end pt-4 border-t border-border">
        <SignOutButton signOutFn={signOut} />
      </div>
    </div>
  )
}
