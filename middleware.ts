import NextAuth from 'next-auth'
import { config } from '@/lib/auth'

export default NextAuth(config).auth
