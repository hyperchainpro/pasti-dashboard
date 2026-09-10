// Auth pages layout — minimal centered, with brand background

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  // If user is already logged in, redirect to dashboard
  const session = await auth().catch(() => null)
  if (session?.user) {
    redirect('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-background via-background/95 to-emerald-950/20">
      <div className="absolute inset-0 -z-10 h-full w-full bg-[radial-gradient(circle_at_50%_20%,rgba(16,185,129,0.15),transparent_60%)]" />
      <div className="w-full">{children}</div>
    </div>
  )
}
