// Lightweight middleware — does NOT import auth (which pulls Prisma)
// Instead, just checks for session cookie presence
// Actual session validation happens in route handlers via auth() call

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
]

const PUBLIC_PREFIXES = [
  '/api/auth',
  '/api/seed',
  '/_next',
  '/favicon',
  '/logo',
  '/data/',
  '/robots.txt',
  '/manifest',
]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next()
  }
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  // Check for NextAuth session cookie
  // v5 uses `authjs.session-token` or `__Secure-authjs.session-token` (HTTPS)
  const sessionCookie =
    req.cookies.get('authjs.session-token')?.value ||
    req.cookies.get('__Secure-authjs.session-token')?.value ||
    req.cookies.get('next-auth.session-token')?.value ||
    req.cookies.get('__Secure-next-auth.session-token')?.value

  if (!sessionCookie) {
    // Redirect to login for HTML routes, 401 for API routes
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  // Skip middleware for static assets
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.svg|data/|robots.txt|manifest.json).*)'],
}
