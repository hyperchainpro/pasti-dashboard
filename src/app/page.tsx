// PASTI Dashboard main page — client component (uses useSession)
// Auth gating handled by middleware (server-side redirect if no session cookie)

import { DashboardClient } from '@/components/dashboard/dashboard-client'

export const dynamic = 'force-dynamic'

export default function Home() {
  return <DashboardClient />
}
