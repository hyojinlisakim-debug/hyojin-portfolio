'use client'
import { useEffect, useRef } from 'react'

const projects = [
  {
    num: '01 — Automation',
    title: 'EAM Automation for GS Power',
    desc: 'Python/SQL workflows syncing plant machinery performance data to an AWS-based Enterprise Asset Management system. Enabled predictive maintenance and 100% data availability for audits.',
    meta: '50% reporting time saved',
    stack: 'Python, SQL, AWS',
  },
  {
    num: '02 — Integration',
    title: 'EAM ↔ SAP API Bridge',
    desc: 'Cross-platform API integration between Hexagon\'s EAM and SAP-based partner systems, consolidating asset status data and automating maintenance scheduling across stakeholders.',
    meta: 'Full automation',
    stack: 'REST API, SAP, SSO',
  },
  {
    num: '03 — Infrastructure',
    title: 'Maritime Port Network Operations',
    desc: '24/7 network infrastructure for AI-driven national maritime control rooms across 9 major Korean ports. Managed 40+ devices, 1,000+ endpoints, zero critical outages over 3+ years.',
    meta: '99.9% uptime',
    stack: 'Cisco, Linux, IoT',
  },
  {
    num: '04 — Commerce',
    title: 'Shopify Storefront Development',
    desc: 'Full Shopify web design and development at a Canadian commercial client — UX planning, custom section development with Liquid/JS, and responsive UI implementation.',
    meta: 'Live production',
    stack: 'Shopify, Liquid, CSS',
  },
  {
    num: '05 — Go-Live',
    title: 'Hexagon EAM Pre-Live Deployment',
    desc: 'Collaborated with Hexagon India team to resolve 80+ front- and back-end issues during pre-go-live phase. Managed bilingual technical communication to accelerate issue resolution.',
    meta: '80+ issues resolved',
    stack: 'English/Korean coordination',
  },
  {
    num: '06 — Security',
    title: 'Network Segmentation & Firewall',
    desc: 'Designed and implemented firewall policies and ACL rules for secure segmentation of a complex network with 1,000+ endpoints including IoT and server infrastructure.',
    meta: 'Enterprise scale',
    stack: 'ACL, Firewall, Cisco',
  },
]

export default function ProjectsPage() {
  const fadeRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') })
    }, { threshold: 0.1 })
    fadeRefs.current.forEach(el => { if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [])

  return (
    <div style={{ paddingTop: '60px' }}>
      <section style={{ padding: '100px 5vw', background: 'var(--bg2)' }}>
        <div ref={el => { fadeRefs.current[0] = el }} className="fade-in">
          <div className="section-tag">// Project Highlights</div>
          <h2>What I&apos;ve built</h2>
          <p className="section-desc">Key projects that demonstrate impact across software, infrastructure, and commerce.</p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1rem',
        }}>
          {projects.map((p, i) => (
            <div
              key={p.num}
              ref={el => { fadeRefs.current[i + 1] = el }}
              className="fade-in"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '1.75rem',
                transition: 'border-color .2s, transform .2s',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'default',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px)'
                e.currentTarget.style.borderColor = 'var(--border2)'
                const line = e.currentTarget.querySelector('.card-line') as HTMLElement
                if (line) line.style.opacity = '1'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.borderColor = 'var(--border)'
                const line = e.currentTarget.querySelector('.card-line') as HTMLElement
                if (line) line.style.opacity = '0'
              }}
            >
              <div className="card-line" style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                background: 'linear-gradient(90deg, var(--accent), var(--teal))',
                opacity: 0, transition: 'opacity .2s',
              }} />
              <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--accent)', marginBottom: '1rem', letterSpacing: '0.08em' }}>
                {p.num}
              </div>
              <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '0.5rem' }}>{p.title}</div>
              <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.7, marginBottom: '1.25rem' }}>{p.desc}</p>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--teal)', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.04em' }}>
                {p.meta} <span style={{ color: 'var(--muted)' }}>·</span> {p.stack}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
