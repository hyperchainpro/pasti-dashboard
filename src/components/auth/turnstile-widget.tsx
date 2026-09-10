'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

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
  const [devToken, setDevToken] = useState<string | null>(null)

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  useEffect(() => {
    if (!siteKey) {
      setDevMode(true)
      // In dev mode (no site key), generate a fake token so forms can submit
      const fakeToken = 'dev-' + Math.random().toString(36).slice(2)
      setDevToken(fakeToken)
      onVerify(fakeToken)
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
    return (
      <div className={`rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-400 ${className}`}>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="font-medium">Dev Mode Captcha</span>
        </div>
        <p className="mt-1 text-muted-foreground">
          Set <code className="text-xs px-1 py-0.5 rounded bg-amber-500/10">NEXT_PUBLIC_TURNSTILE_SITE_KEY</code> dan <code className="text-xs px-1 py-0.5 rounded bg-amber-500/10">TURNSTILE_SECRET_KEY</code> untuk aktifkan captcha asli (gratis di <a href="https://cloudflare.com/products/turnstile" target="_blank" rel="noreferrer" className="underline">Cloudflare Turnstile</a>).
        </p>
      </div>
    )
  }

  return <div ref={containerRef} className={className} />
}
