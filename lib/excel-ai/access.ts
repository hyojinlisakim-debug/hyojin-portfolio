/**
 * Server-only access check for /lab/excel-ai. The password lives in the
 * EXCEL_AI_PASSWORD environment variable (never in the public repo). After a
 * correct password the browser gets an httpOnly cookie holding an HMAC of the
 * password, so changing the password signs everyone out.
 */
import { createHmac, timingSafeEqual } from 'crypto'

export const ACCESS_COOKIE = 'excel_ai_access'
export const ACCESS_MAX_AGE = 60 * 60 * 24 * 30

function password(): string | null {
  const p = process.env.EXCEL_AI_PASSWORD
  return p && p.length > 0 ? p : null
}

/** When no password is configured the page stays open (so the site never breaks). */
export function lockEnabled(): boolean {
  return password() !== null
}

export function accessToken(): string | null {
  const p = password()
  return p ? createHmac('sha256', p).update('excel-ai-access-v1').digest('hex') : null
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

export function checkPassword(attempt: string): boolean {
  const p = password()
  return p !== null && safeEqual(attempt, p)
}

export function hasAccess(cookieValue: string | undefined): boolean {
  const token = accessToken()
  if (token === null) return true
  return typeof cookieValue === 'string' && safeEqual(cookieValue, token)
}
