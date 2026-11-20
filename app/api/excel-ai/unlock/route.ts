import { NextRequest, NextResponse } from 'next/server'
import { ACCESS_COOKIE, ACCESS_MAX_AGE, accessToken, checkPassword } from '@/lib/excel-ai/access'

// Slow down guessing: 10 attempts per 10 minutes per IP (best effort, in memory).
const LIMIT = 10
const WINDOW_MS = 10 * 60 * 1000
const attempts = new Map<string, { count: number; resetAt: number }>()

function tooMany(ip: string): boolean {
  const now = Date.now()
  const e = attempts.get(ip)
  if (!e || now > e.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  e.count += 1
  return e.count > LIMIT
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (tooMany(ip)) return NextResponse.json({ error: 'too_many' }, { status: 429 })

  const body = await request.json().catch(() => null)
  const attempt = typeof body?.password === 'string' ? body.password.slice(0, 200) : ''
  const token = accessToken()
  if (!token) return NextResponse.json({ ok: true })
  if (!checkPassword(attempt)) return NextResponse.json({ error: 'wrong_password' }, { status: 401 })

  const res = NextResponse.json({ ok: true })
  res.cookies.set(ACCESS_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_MAX_AGE,
  })
  return res
}
