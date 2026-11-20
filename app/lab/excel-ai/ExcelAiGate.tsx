'use client'
import { useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { DICTS, LANGS } from '@/lib/excel-ai/i18n'
import { readLang, serverLang, subscribeLang, writeLang } from '@/lib/excel-ai/lang'

export default function ExcelAiGate() {
  const lang = useSyncExternalStore(subscribeLang, readLang, serverLang)
  const d = DICTS[lang]
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<'gateWrong' | 'gateTooMany' | 'errFailed' | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (checking) return
    if (!password) { setError('gateWrong'); return }
    setChecking(true)
    setError(null)
    try {
      const res = await fetch('/api/excel-ai/unlock', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) { router.refresh(); return }
      setError(res.status === 429 ? 'gateTooMany' : res.status === 401 ? 'gateWrong' : 'errFailed')
    } catch {
      setError('errFailed')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div style={{ paddingTop: '60px' }} lang={lang}>
      <section style={{ padding: '100px 5vw 120px', background: 'var(--bg2)', minHeight: '70vh' }}>
        <div className="xl-wrap">
          <div className="xl-head">
            <div>
              <div className="section-tag">{d.tag}</div>
              <h2>{d.title}</h2>
            </div>
            <div className="xl-lang" role="group" aria-label="Language">
              {LANGS.map((l) => (
                <button key={l.code} type="button" className="xl-pill" aria-pressed={lang === l.code} onClick={() => writeLang(l.code)}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>
          <p className="section-desc">{d.subtitle}</p>
          <form className="xl-card" style={{ maxWidth: 520 }} onSubmit={submit}>
            <span className="xl-label">{d.gateTitle}</span>
            <p style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: '1rem' }}>{d.gateDesc}</p>
            <div className="xl-row" style={{ marginTop: 0 }}>
              <input
                className="xl-input"
                type="password"
                autoComplete="current-password"
                aria-label={d.gatePassword}
                placeholder={d.gatePassword}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null) }}
                autoFocus
              />
              <button type="submit" className="xl-btn primary" aria-busy={checking}>
                {checking ? d.gateChecking : d.gateSubmit}
              </button>
            </div>
            <div aria-live="polite">{error && <p className="xl-error">{d[error]}</p>}</div>
          </form>
        </div>
      </section>
    </div>
  )
}
