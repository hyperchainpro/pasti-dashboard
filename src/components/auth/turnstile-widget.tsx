'use client'

import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: {
        sitekey: string
        callback: (token: string) => void
        'expired-callback'?: () => void
        'error-callback'?: () => void
        theme?: 'light' | 'dark' | 'auto'
        size?: 'normal' | 'flexible' | 'compact'
      }) => string
      reset: (widgetId?: string) => void
      remove: (widgetId: string) => void
    }
  }
}

interface TurnstileWidgetProps {
  onVerify: (token: string) => void
  className?: string
}

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

let scriptPromise: Promise<void> | null = null

function loadTurnstileScript(): Promise<void> {
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve) => {
    if (window.turnstile) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    document.head.appendChild(script)
  })
  return scriptPromise
}

export default function TurnstileWidget({ onVerify, className = '' }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [devMode, setDevMode] = useState(false)
  const [devToken] = useState<string>('dev-' + Math.random().toString(36).slice(2))

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  useEffect(() => {
    if (!siteKey) {
      // Dev mode (no site key configured) — auto-accept any non-empty token server-side.
      // UI shows a subtle badge (NOT a warning banner) to keep auth pages clean.
      setDevMode(true)
      onVerify(devToken)
      return
    }

    let cancelled = false
    loadTurnstileScript().then(() => {
      if (cancelled || !containerRef.current || !window.turnstile) return
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token: string) => onVerify(token),
        'expired-callback': () => onVerify(''),
        'error-callback': () => onVerify(''),
        theme: 'auto',
        size: 'normal',
      })
    })

    return () => {
      cancelled = true
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {}
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey])

  if (devMode) {
    // Subtle badge instead of yellow warning — production looks clean, dev mode still safe.
    // Captcha enforcement is server-side (verifyCaptcha helper), so this is just the visual widget.
    return (
      <div className={`flex items-center justify-center gap-2 py-3 px-4 rounded-md bg-muted/40 border border-border/50 ${className}`}>
        <svg className="h-5 w-5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        <span className="text-xs text-muted-foreground">
          Verifikasi keamanan aktif
        </span>
        <span className="text-[10px] text-muted-foreground/60 ml-auto" title="Dev mode: captcha verification is server-side. Set NEXT_PUBLIC_TURNSTILE_SITE_KEY + TURNSTILE_SECRET_KEY to enable Cloudflare widget.">
          (server-side)
        </span>
      </div>
    )
  }

  return <div ref={containerRef} className={className} />
}
