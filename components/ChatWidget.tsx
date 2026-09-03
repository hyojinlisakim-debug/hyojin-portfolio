'use client'
import { useEffect, useRef, useState } from 'react'

type Message = { role: 'user' | 'assistant'; content: string }

const INTRO: Message = {
  role: 'assistant',
  content: "Hi — I'm Hyojin's AI guide. Ask me anything about her experience, projects, or availability.",
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([INTRO])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setError(null)
    const next = [...messages, { role: 'user', content: text } as Message]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: next.filter((m) => m !== INTRO) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Something went wrong.')
      setMessages((cur) => [...cur, { role: 'assistant', content: data.reply as string }])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close chat' : 'Ask Hyojin\'s AI guide'}
        style={{
          position: 'fixed', right: '5vw', bottom: '5vw', zIndex: 150,
          display: 'flex', alignItems: 'center', gap: '9px',
          padding: '13px 20px', borderRadius: '100px', border: 'none', cursor: 'pointer',
          background: 'var(--ink)', color: 'var(--linen)',
          fontFamily: 'var(--sans)', fontSize: '13px', fontWeight: 500, letterSpacing: '0.02em',
          boxShadow: '0 14px 32px -12px rgba(16,24,38,0.45)',
          transition: 'transform .25s cubic-bezier(.34,1.56,.64,1)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)' }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'none' }}
      >
        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--teal)', boxShadow: '0 0 8px var(--teal)' }} />
        {open ? 'Close' : 'Ask Hyojin'}
      </button>

      <div
        role="dialog"
        aria-label="Chat with Hyojin's AI guide"
        style={{
          position: 'fixed', right: '5vw', bottom: 'calc(5vw + 64px)', zIndex: 149,
          width: 'min(360px, 90vw)', maxHeight: 'min(520px, 70vh)',
          display: 'flex', flexDirection: 'column',
          background: 'var(--card)', border: '1px solid var(--border2)', borderRadius: '18px',
          boxShadow: '0 30px 60px -20px rgba(16,24,38,0.5)', overflow: 'hidden',
          opacity: open ? 1 : 0, visibility: open ? 'visible' : 'hidden',
          transform: open ? 'translateY(0) scale(1)' : 'translateY(14px) scale(0.96)',
          transformOrigin: 'bottom right',
          transition: 'opacity .3s cubic-bezier(.16,1,.3,1), transform .4s cubic-bezier(.22,1.4,.36,1), visibility 0s linear ' + (open ? '0s' : '.3s'),
        }}
      >
        <div style={{
          padding: '14px 18px', borderBottom: '1px solid var(--border)',
          fontFamily: 'var(--serif)', fontSize: '15px', fontWeight: 500, color: 'var(--text)',
        }}>
          Ask Hyojin
          <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--muted)', marginTop: '2px', letterSpacing: '0.04em' }}>
            AI guide · based on her resume &amp; projects
          </div>
        </div>

        <div ref={bodyRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '86%',
                background: m.role === 'user' ? 'var(--card-hover)' : 'color-mix(in srgb, var(--teal) 12%, var(--card))',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '9px 13px',
                fontSize: '13.5px', lineHeight: 1.6, color: 'var(--text)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {m.content}
            </div>
          ))}
          {loading && (
            <div style={{
              alignSelf: 'flex-start', fontFamily: 'var(--mono)', fontSize: '11px',
              color: 'var(--muted)', letterSpacing: '0.04em', padding: '4px 2px',
            }}>
              thinking…
            </div>
          )}
          {error && (
            <div style={{
              alignSelf: 'flex-start', fontSize: '12.5px', color: 'var(--accent2)',
              background: 'rgba(var(--accent-rgb),0.08)', border: '1px solid rgba(var(--accent-rgb),0.25)',
              borderRadius: '10px', padding: '8px 12px',
            }}>
              {error}
            </div>
          )}
        </div>

        <div style={{ borderTop: '1px solid var(--border)', padding: '10px', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask about her experience, projects…"
            rows={1}
            style={{
              flex: 1, resize: 'none', border: '1px solid var(--border2)', borderRadius: '10px',
              padding: '9px 12px', fontFamily: 'var(--sans)', fontSize: '13px', color: 'var(--text)',
              background: 'var(--bg)', maxHeight: '96px', outline: 'none',
            }}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            style={{
              padding: '9px 16px', borderRadius: '10px', border: 'none', cursor: loading || !input.trim() ? 'default' : 'pointer',
              background: loading || !input.trim() ? 'var(--border2)' : 'var(--ink)',
              color: loading || !input.trim() ? 'var(--muted)' : 'var(--linen)',
              fontFamily: 'var(--sans)', fontSize: '12.5px', fontWeight: 500,
              transition: 'background .2s, color .2s',
            }}
          >
            Send
          </button>
        </div>
      </div>
    </>
  )
}
