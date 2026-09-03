import { NextRequest, NextResponse } from 'next/server'
import { ASSISTANT_SYSTEM_PROMPT } from '@/lib/assistant-context'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022'
const MAX_TOKENS = 500
const MAX_MESSAGES = 20
const MAX_MESSAGE_CHARS = 2000

// Best-effort in-memory rate limit. Resets on cold start and isn't shared
// across regions/instances — good enough to blunt casual abuse on a
// low-traffic portfolio site without adding an external store.
const RATE_LIMIT = 20
const RATE_WINDOW_MS = 10 * 60 * 1000
const hits = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = hits.get(ip)
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return false
  }
  entry.count += 1
  return entry.count > RATE_LIMIT
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests — please try again in a few minutes.' }, { status: 429 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY is not set')
      return NextResponse.json({ error: 'Chat is not configured yet.' }, { status: 500 })
    }

    const body = await request.json()
    const rawMessages: unknown = body?.messages

    if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
      return NextResponse.json({ error: 'Missing messages' }, { status: 400 })
    }

    const messages: ChatMessage[] = rawMessages
      .slice(-MAX_MESSAGES)
      .filter(
        (m): m is ChatMessage =>
          typeof m === 'object' &&
          m !== null &&
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string' &&
          m.content.trim().length > 0
      )
      .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }))

    if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
      return NextResponse.json({ error: 'Invalid message history' }, { status: 400 })
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: ASSISTANT_SYSTEM_PROMPT,
        messages,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Anthropic API error:', res.status, errText)
      return NextResponse.json({ error: 'The AI guide is having trouble responding right now.' }, { status: 502 })
    }

    const data = await res.json()
    const reply = Array.isArray(data?.content)
      ? data.content.map((block: { type: string; text?: string }) => (block.type === 'text' ? block.text : '')).join('')
      : ''

    if (!reply) {
      return NextResponse.json({ error: 'No response generated.' }, { status: 502 })
    }

    return NextResponse.json({ reply })
  } catch (err) {
    console.error('Chat route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
