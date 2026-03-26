'use client'
import { useEffect, useRef } from 'react'
import Link from 'next/link'

export default function HomePage() {
  const fadeRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add('visible')
      })
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' })

    fadeRefs.current.forEach(el => { if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [])

  const stats = [
    { num: '5+', label: 'Years Experience' },
    { num: '50%', label: 'Reporting Time Saved' },
    { num: '99.9%', label: 'Network Uptime' },
    { num: '80+', label: 'Issues Resolved' },
  ]

  const skills = [
    {
      icon: '🐍', color: 'rgba(124,111,255,0.15)', title: 'Development',
      tags: ['Python', 'SQL', 'JavaScript', 'Java', 'Liquid'],
    },
    {
      icon: '🛍', color: 'rgba(46,207,168,0.12)', title: 'Web & Commerce',
      tags: ['Shopify', 'HTML/CSS', 'Section Dev', 'UI Design', 'UX Planning'],
    },
    {
      icon: '⚙️', color: 'rgba(245,166,35,0.12)', title: 'Systems & Infrastructure',
      tags: ['Linux', 'AWS', 'ERP/EAM', 'Oracle DB', 'Cisco'],
    },
    {
      icon: '🔗', color: 'rgba(255,107,107,0.1)', title: 'Integration & Ops',
      tags: ['REST API', 'SAP', 'SSO', 'Firewall/ACL', 'Network Monitoring'],
    },
  ]

  return (
    <>
      {/* ── HERO ── */}
      <section style={{
        minHeight: '100vh', padding: '120px 5vw 80px',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `
            radial-gradient(ellipse 60% 50% at 80% 20%, rgba(124,111,255,0.12) 0%, transparent 60%),
            radial-gradient(ellipse 40% 40% at 10% 80%, rgba(46,207,168,0.08) 0%, transparent 60%)
          `,
        }} />

        <div ref={el => { fadeRefs.current[0] = el }} className="fade-in">
          <div style={{
            fontFamily: 'var(--mono)', fontSize: '12px', letterSpacing: '0.12em',
            color: 'var(--teal)', textTransform: 'uppercase', marginBottom: '1.5rem',
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <span style={{ width: '32px', height: '1px', background: 'var(--teal)', display: 'inline-block' }} />
            Available for opportunities in Canada
          </div>

          <h1 style={{
            fontFamily: 'var(--serif)',
            fontSize: 'clamp(3rem, 7vw, 6rem)',
            lineHeight: 1.05, letterSpacing: '-0.02em', marginBottom: '1.5rem',
          }}>
            Hyojin <em style={{ fontStyle: 'italic', color: 'var(--accent2)' }}>Kim</em>
          </h1>

          <p style={{
            maxWidth: '520px', color: 'var(--muted)', fontSize: '16px',
            lineHeight: 1.8, marginBottom: '2.5rem',
          }}>
            Software Engineer &amp; IT Specialist with 5+ years bridging infrastructure,
            automation, and web development. From network uptime at mission-critical ports
            to Shopify storefronts — I build things that work.
          </p>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <Link href="/contact" style={{
              padding: '12px 28px', borderRadius: '100px',
              background: 'var(--accent)', color: '#fff',
              fontFamily: 'var(--sans)', fontSize: '14px', fontWeight: 500,
              textDecoration: 'none', letterSpacing: '0.02em',
              transition: 'background .2s',
            }}>
              Get in touch
            </Link>
            <Link href="/projects" style={{
              padding: '12px 28px', borderRadius: '100px',
              background: 'transparent', color: 'var(--text)',
              border: '1px solid var(--border2)',
              fontFamily: 'var(--sans)', fontSize: '14px',
              textDecoration: 'none', letterSpacing: '0.02em',
            }}>
              View projects ↓
            </Link>
          </div>

          <div style={{
            display: 'flex', gap: '3rem', marginTop: '4rem',
            paddingTop: '2.5rem', borderTop: '1px solid var(--border)',
            flexWrap: 'wrap',
          }}>
            {stats.map(s => (
              <div key={s.label}>
                <span style={{ fontFamily: 'var(--serif)', fontSize: '2rem', color: 'var(--text)', display: 'block' }}>
                  {s.num}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SKILLS ── */}
      <section style={{ padding: '100px 5vw', background: 'var(--bg2)' }}>
        <div ref={el => { fadeRefs.current[1] = el }} className="fade-in">
          <div className="section-tag">// Skills</div>
          <h2>What I work with</h2>
          <p className="section-desc">A full stack of capabilities from network infrastructure to front-end development.</p>
        </div>

        <div ref={el => { fadeRefs.current[2] = el }} className="fade-in" style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5px', background: 'var(--border)',
          border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden',
          marginTop: '3rem',
        }}>
          {skills.map(s => (
            <div key={s.title} style={{
              background: 'var(--card)', padding: '2rem',
              transition: 'background .2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = '#22222e')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--card)')}
            >
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '1.25rem', fontSize: '18px', background: s.color,
              }}>{s.icon}</div>
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '0.75rem' }}>{s.title}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {s.tags.map(t => <span key={t} className="tag">{t}</span>)}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
