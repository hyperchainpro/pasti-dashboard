'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User, Mail, Shield, Calendar, Key, Bot } from 'lucide-react'

interface ProfileCardProps {
  user: {
    name: string
    email: string
    role: string
    image: string | null
    createdAt: Date
    emailVerified: Date | null
  }
  stats: {
    apiKeyCount: number
    agentLogCount: number
    lastRun: Date | null
  }
}

export function ProfileCard({ user, stats }: ProfileCardProps) {
  const initials = user.name
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || user.email[0].toUpperCase()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="h-5 w-5 text-emerald-400" />
          Informasi Akun
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-emerald-500/30">
            <AvatarImage src={user.image || undefined} />
            <AvatarFallback className="bg-emerald-500/20 text-emerald-400 text-lg font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-lg">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <Badge
              variant="outline"
              className={`mt-1.5 text-xs ${
                user.role === 'admin'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              <Shield className="h-3 w-3 mr-1" />
              {user.role === 'admin' ? 'Admin' : 'User'}
            </Badge>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-border">
          <Row
            icon={<Mail className="h-4 w-4 text-muted-foreground" />}
            label="Email"
            value={user.email}
          />
          <Row
            icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
            label="Bergabung sejak"
            value={new Date(user.createdAt).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          />
          <Row
            icon={<Key className="h-4 w-4 text-muted-foreground" />}
            label="Custom API Keys"
            value={String(stats.apiKeyCount)}
          />
          <Row
            icon={<Bot className="h-4 w-4 text-muted-foreground" />}
            label="Total agent runs"
            value={String(stats.agentLogCount)}
          />
          <Row
            icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
            label="Run terakhir"
            value={
              stats.lastRun
                ? new Date(stats.lastRun).toLocaleString('id-ID', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })
                : 'Belum pernah'
            }
          />
        </div>
      </CardContent>
    </Card>
  )
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="font-medium text-right truncate">{value}</span>
    </div>
  )
}
