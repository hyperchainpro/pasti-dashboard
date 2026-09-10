// PASTI — NextAuth.js v5 configuration
// Uses credentials provider (email + password) with bcrypt
// + Prisma adapter for session/account storage in Neon

import NextAuth, { type NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import { db } from './db'

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/api/v3/siteverify'

async function verifyCaptcha(token: string, ip?: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    // Dev mode: accept any non-empty token (real Turnstile not configured)
    console.warn('[captcha] TURNSTILE_SECRET_KEY not set — accepting token in dev mode')
    return !!token
  }
  const formData = new FormData()
  formData.append('secret', secret)
  formData.append('response', token)
  if (ip) formData.append('remoteip', ip)
  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, { method: 'POST', body: formData })
    const data = await res.json()
    return !!data.success
  } catch {
    return false
  }
}

const adapter = new PrismaAdapter(db)

export const config = {
  adapter,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    signUp: '/register',
    error: '/login',
    verifyRequest: '/login',
    forgotPassword: '/forgot-password',
  },
  providers: [
    Credentials({
      id: 'credentials',
      name: 'Email & Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        captchaToken: { label: 'Captcha Token', type: 'text' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null
        const email = String(credentials.email).toLowerCase().trim()
        const password = String(credentials.password)
        const captchaToken = String(credentials.captchaToken || '')

        // ── Verify captcha server-side (required) ──
        const ip =
          (req as Request | undefined)?.headers?.get?.('x-forwarded-for') ||
          (req as Request | undefined)?.headers?.get?.('x-real-ip') ||
          null
        const captchaOk = await verifyCaptcha(captchaToken, ip)
        if (!captchaOk) {
          // Returning null with no specific error — NextAuth treats as auth failure
          console.warn(`[auth] Login captcha failed for email=${email}`)
          return null
        }

        const user = await db.user.findUnique({
          where: { email },
          select: { id: true, name: true, email: true, password: true, role: true, image: true },
        })
        if (!user || !user.password) return null

        // No email verification required — just password match.
        const valid = await bcrypt.compare(password, user.password)
        if (!valid) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.image,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string })?.role || 'user'
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = (token.role as string) || 'user'
      }
      return session
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const { pathname } = nextUrl
      // Public routes
      if (
        pathname === '/' ||
        pathname.startsWith('/login') ||
        pathname.startsWith('/register') ||
        pathname.startsWith('/forgot-password') ||
        pathname.startsWith('/reset-password') ||
        pathname.startsWith('/api/auth') ||
        pathname.startsWith('/api/seed') ||
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon') ||
        pathname.startsWith('/logo') ||
        pathname.startsWith('/data/') // public demo JSON files
      ) {
        return true
      }
      // Dashboard + protected routes require login
      return isLoggedIn
    },
  },
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
} satisfies NextAuthConfig

export const { handlers, auth, signIn, signOut } = NextAuth(config)

// Augment NextAuth types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: string
    }
  }
  interface User {
    role?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    role?: string
  }
}
