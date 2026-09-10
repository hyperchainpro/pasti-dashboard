// PASTI Dashboard main page (server component)
// Fetches session and passes user info to client component

import { auth, signOut } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardClient } from '@/components/dashboard/dashboard-client'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const session = await auth()

  // Allow demo access if no auth is configured — but prefer login
  // If session exists, show personalized dashboard
  // If not, redirect to login (auth is required by middleware anyway)
  if (!session?.user) {
    redirect('/login')
  }

  return (
    <DashboardClient
      user={{
        name: session.user.name || session.user.email || 'User',
        email: session.user.email || '',
        image: session.user.image,
        role: session.user.role,
      }}
      signOutFn={signOut}
    />
  )
}
