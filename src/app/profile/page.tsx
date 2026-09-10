// /profile — User profile page
// Shows user info, role, account stats, change password form, recent activity

import { auth, signOut } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { ProfileCard } from '@/components/profile/profile-card'
import { ChangePasswordCard } from '@/components/profile/change-password-card'
import { RecentActivityCard } from '@/components/profile/recent-activity-card'
import { SignOutButton } from '@/components/profile/sign-out-button'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      emailVerified: true,
      createdAt: true,
    },
  })
  if (!user) redirect('/login')

  const [apiKeyCount, agentLogCount, lastAgentLog] = await Promise.all([
    db.apiKey.count({ where: { userId: user.id } }),
    db.agentLog.count({ where: { userId: user.id } }),
    db.agentLog.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { traceId: true, timestamp: true, step: true, createdAt: true },
    }),
  ])

  const recentLogs = await db.agentLog.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      traceId: true,
      timestamp: true,
      step: true,
      createdAt: true,
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Kelola informasi akun dan keamanan Anda
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <ProfileCard
          user={{
            name: user.name || '',
            email: user.email,
            role: user.role,
            image: user.image,
            createdAt: user.createdAt,
            emailVerified: user.emailVerified,
          }}
          stats={{ apiKeyCount, agentLogCount, lastRun: lastAgentLog?.createdAt || null }}
        />

        <ChangePasswordCard />
      </div>

      <RecentActivityCard logs={recentLogs} />

      <div className="flex justify-end pt-4 border-t border-border">
        <SignOutButton signOutFn={signOut} />
      </div>
    </div>
  )
}
