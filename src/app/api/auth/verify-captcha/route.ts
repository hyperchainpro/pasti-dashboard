// POST /api/auth/verify-captcha
// Verifies Cloudflare Turnstile token server-side
// Free, no limit, works in all countries (better than hCaptcha/reCAPTCHA in Asia)

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/api/v3/siteverify'

export async function POST(req: Request) {
  try {
    const { token } = await req.json()
    if (!token) {
      return Response.json({ success: false, error: 'Token tidak ditemukan' }, { status: 400 })
    }

    // Allow bypass in dev mode if no secret configured
    const secret = process.env.TURNSTILE_SECRET_KEY
    if (!secret) {
      // Dev mode: accept any non-empty token
      console.warn('[captcha] TURNSTILE_SECRET_KEY not set — accepting token in dev mode')
      return Response.json({ success: true, dev: true })
    }

    const formData = new FormData()
    formData.append('secret', secret)
    formData.append('response', token)

    // Forward client IP if available (for analytics; not required)
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
    if (ip) formData.append('remoteip', ip.split(',')[0].trim())

    const verifyRes = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      body: formData,
    })
    const verifyData = await verifyRes.json()

    if (!verifyData.success) {
      return Response.json(
        { success: false, error: 'Verifikasi captcha gagal', codes: verifyData['error-codes'] },
        { status: 400 }
      )
    }

    return Response.json({ success: true })
  } catch (err) {
    return Response.json(
      { success: false, error: 'Server error: ' + String(err) },
      { status: 500 }
    )
  }
}
