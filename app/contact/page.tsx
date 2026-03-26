'use client'
import { useState } from 'react'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [sent, setSent] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // 나중에 백엔드 API 연결 시 여기에 fetch('/api/contact', ...) 추가
    console.log('Form submitted:', form)
    setSent(true)
  }

  return (
    <div style={{ paddingTop: '60px' }}>
      <section style={{ padding: '100px 5vw', background: 'var(--bg2)', minHeight: '100vh' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div className="section-tag" style={{ textAlign: 'center' }}>// Contact</div>
          <h2>Let&apos;s work together</h2>
          <p style={{ color: 'var(--muted)', lineHeight: 1.8, marginBottom: '3rem' }}>
            Currently based in Calgary, AB — open to full-time roles in software development, IT support, or web engineering.
          </p>

          {/* Contact Info */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '3rem' }}>
            {[
              { icon: '✉', label: 'hyojinlisa.kim@gmail.com', href: 'mailto:hyojinlisa.kim@gmail.com' },
              { icon: '☎', label: '+1 825-733-9679', href: 'tel:+18257339679' },
            ].map(c => (
              <a key={c.label} href={c.href} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '12px 20px', borderRadius: '10px',
                background: 'var(--card)', border: '1px solid var(--border)',
                color: 'var(--text)', textDecoration: 'none', fontSize: '13px',
                fontFamily: 'var(--mono)', letterSpacing: '0.03em',
                transition: 'border-color .2s, color .2s',
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--accent)'
                  e.currentTarget.style.color = 'var(--accent2)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.color = 'var(--text)'
                }}
              >
                {c.icon} {c.label}
              </a>
            ))}
          </div>

          {/* Visa note */}
          <div style={{
            padding: '1.25rem 1.5rem', marginBottom: '3rem',
            background: 'rgba(46,207,168,0.06)', border: '1px solid rgba(46,207,168,0.18)',
            borderRadius: '12px', fontSize: '13px', color: 'var(--muted)',
            display: 'inline-block',
          }}>
            <strong style={{ color: 'var(--teal)' }}>✓ Work-authorized in Canada</strong> — 2-Year Working Holiday Visa (approved, extendable to 4 years)
          </div>

          {/* Contact Form */}
          {!sent ? (
            <form onSubmit={handleSubmit} style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: '16px', padding: '2rem', textAlign: 'left',
            }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                  NAME
                </label>
                <input
                  type="text" required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  style={{
                    width: '100%', padding: '10px 14px',
                    background: 'var(--bg)', border: '1px solid var(--border2)',
                    borderRadius: '8px', color: 'var(--text)',
                    fontFamily: 'var(--sans)', fontSize: '14px', outline: 'none',
                  }}
                />
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                  EMAIL
                </label>
                <input
                  type="email" required
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  style={{
                    width: '100%', padding: '10px 14px',
                    background: 'var(--bg)', border: '1px solid var(--border2)',
                    borderRadius: '8px', color: 'var(--text)',
                    fontFamily: 'var(--sans)', fontSize: '14px', outline: 'none',
                  }}
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                  MESSAGE
                </label>
                <textarea
                  required rows={5}
                  value={form.message}
                  onChange={e => setForm({ ...form, message: e.target.value })}
                  style={{
                    width: '100%', padding: '10px 14px',
                    background: 'var(--bg)', border: '1px solid var(--border2)',
                    borderRadius: '8px', color: 'var(--text)',
                    fontFamily: 'var(--sans)', fontSize: '14px', outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>
              <button type="submit" style={{
                width: '100%', padding: '12px 28px', borderRadius: '100px',
                background: 'var(--accent)', color: '#fff',
                fontFamily: 'var(--sans)', fontSize: '14px', fontWeight: 500,
                border: 'none', cursor: 'pointer', letterSpacing: '0.02em',
                transition: 'background .2s',
              }}>
                Send message →
              </button>
            </form>
          ) : (
            <div style={{
              background: 'rgba(46,207,168,0.06)', border: '1px solid rgba(46,207,168,0.18)',
              borderRadius: '16px', padding: '3rem', textAlign: 'center',
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>✓</div>
              <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '0.5rem' }}>Message sent!</div>
              <div style={{ color: 'var(--muted)', fontSize: '14px' }}>Thanks for reaching out. I&apos;ll get back to you soon.</div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
