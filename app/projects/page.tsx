'use client'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

type Category = 'dev' | 'design' | 'ai'
type Media = { type: 'image' | 'video'; src: string }

type Project = {
  id: string
  num: string
  title: string
  desc: string
  meta: string
  stack: string
  categories: Category[]
  media?: Media[]
}

const FILTERS: { key: 'all' | Category; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'dev', label: 'Dev' },
  { key: 'design', label: 'Design' },
  { key: 'ai', label: 'AI' },
]

const projects: Project[] = [
  {
    id: 'eam-automation',
    num: '01 — Automation',
    title: 'EAM Automation for GS Power',
    desc: 'Python/SQL workflows syncing plant machinery performance data to an AWS-based Enterprise Asset Management system. Enabled predictive maintenance and 100% data availability for audits.',
    meta: '50% reporting time saved',
    stack: 'Python, SQL, AWS',
    categories: ['dev'],
  },
  {
    id: 'eam-sap-bridge',
    num: '02 — Integration',
    title: 'EAM ↔ SAP API Bridge',
    desc: 'Cross-platform API integration between Hexagon\'s EAM and SAP-based partner systems, consolidating asset status data and automating maintenance scheduling across stakeholders.',
    meta: 'Full automation',
    stack: 'REST API, SAP, SSO',
    categories: ['dev'],
  },
  {
    id: 'maritime-network',
    num: '03 — Infrastructure',
    title: 'Maritime Port Network Operations',
    desc: '24/7 network infrastructure for AI-driven national maritime control rooms across 9 major Korean ports. Managed 40+ devices, 1,000+ endpoints, zero critical outages over 3+ years.',
    meta: '99.9% uptime',
    stack: 'Cisco, Linux, IoT',
    categories: ['dev'],
  },
  {
    id: 'shopify-storefront',
    num: '04 — Commerce',
    title: 'Shopify Storefront Development',
    desc: 'Full Shopify web design and development at a Canadian commercial client — UX planning, custom section development with Liquid/JS, and responsive UI implementation.',
    meta: 'Live production',
    stack: 'Shopify, Liquid, CSS',
    categories: ['dev', 'design'],
  },
  {
    id: 'hexagon-golive',
    num: '05 — Go-Live',
    title: 'Hexagon EAM Pre-Live Deployment',
    desc: 'Collaborated with Hexagon India team to resolve 80+ front- and back-end issues during pre-go-live phase. Managed bilingual technical communication to accelerate issue resolution.',
    meta: '80+ issues resolved',
    stack: 'English/Korean coordination',
    categories: ['dev'],
  },
  {
    id: 'network-segmentation',
    num: '06 — Security',
    title: 'Network Segmentation & Firewall',
    desc: 'Designed and implemented firewall policies and ACL rules for secure segmentation of a complex network with 1,000+ endpoints including IoT and server infrastructure.',
    meta: 'Enterprise scale',
    stack: 'ACL, Firewall, Cisco',
    categories: ['dev'],
  },
  {
    id: 'kjmaleo-miniature',
    num: '07 — AI Generation',
    title: 'KJMaleo Miniature',
    desc: 'A gallery of images and video created with AI generation tools — experiments in prompting, style consistency, and motion.',
    meta: '5 stills + video',
    stack: 'AI image & video generation',
    categories: ['ai'],
    media: [
      { type: 'video', src: '/ai-work/videos/kjmaloe_miniature_img_video.mp4' },
      { type: 'image', src: '/ai-work/images/kjmaloe_miniature_img_1.png' },
      { type: 'image', src: '/ai-work/images/kjmaloe_miniature_img_2.png' },
      { type: 'image', src: '/ai-work/images/kjmaloe_miniature_img_3.png' },
      { type: 'image', src: '/ai-work/images/kjmaloe_miniature_img_4.png' },
      { type: 'image', src: '/ai-work/images/kjmaloe_miniature_img_5.png' },
    ],
  },
]

export default function ProjectsPage() {
  const [filter, setFilter] = useState<'all' | Category>('all')
  const [openProject, setOpenProject] = useState<Project | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const fadeRefs = useRef<(HTMLDivElement | null)[]>([])

  const filtered = projects.filter(p => filter === 'all' || p.categories.includes(filter))

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') })
    }, { threshold: 0.1 })
    fadeRefs.current.forEach(el => { if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [filter])

  useEffect(() => {
    if (!openProject?.media) return
    const media = openProject.media
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenProject(null)
      if (e.key === 'ArrowRight') setActiveIndex(i => (i + 1) % media.length)
      if (e.key === 'ArrowLeft') setActiveIndex(i => (i - 1 + media.length) % media.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openProject])

  const openAt = (project: Project, index: number) => {
    if (!project.media) return
    setOpenProject(project)
    setActiveIndex(index)
  }

  const activeMedia = openProject?.media ? openProject.media[activeIndex] : null

  return (
    <div style={{ paddingTop: '60px' }}>
      <section style={{ padding: '100px 5vw', background: 'var(--bg2)' }}>
        <div ref={el => { fadeRefs.current[0] = el }} className="fade-in">
          <div className="section-tag">{'// Project Highlights'}</div>
          <h2>What I&apos;ve built</h2>
          <p className="section-desc">Key projects that demonstrate impact across software, infrastructure, commerce, and AI-assisted creative work.</p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                fontFamily: 'var(--mono)', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase',
                padding: '7px 16px', borderRadius: '100px', cursor: 'pointer',
                border: `1px solid ${filter === f.key ? 'var(--accent)' : 'var(--border2)'}`,
                background: filter === f.key ? 'rgba(var(--accent-rgb),0.1)' : 'transparent',
                color: filter === f.key ? 'var(--accent)' : 'var(--muted)',
                transition: 'border-color .2s, color .2s, background .2s',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1rem',
        }}>
          {filtered.map((p, i) => {
            const isMedia = !!p.media
            const cover = p.media?.find(m => m.type === 'image')?.src

            return (
              <div
                key={p.id}
                ref={el => { fadeRefs.current[i + 1] = el }}
                className="fade-in"
                onClick={() => isMedia && openAt(p, 0)}
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  transition: 'border-color .2s, transform .2s',
                  position: 'relative',
                  cursor: isMedia ? 'pointer' : 'default',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-3px)'
                  e.currentTarget.style.borderColor = 'var(--border2)'
                  const line = e.currentTarget.querySelector('.card-line') as HTMLElement
                  if (line) line.style.opacity = '1'
                  if (isMedia) (e.currentTarget.querySelector('video') as HTMLVideoElement | null)?.play()
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.borderColor = 'var(--border)'
                  const line = e.currentTarget.querySelector('.card-line') as HTMLElement
                  if (line) line.style.opacity = '0'
                  if (isMedia) (e.currentTarget.querySelector('video') as HTMLVideoElement | null)?.pause()
                }}
              >
                <div className="card-line" style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: '2px', zIndex: 1,
                  background: 'linear-gradient(90deg, var(--accent), var(--teal))',
                  opacity: 0, transition: 'opacity .2s',
                }} />

                {isMedia && (
                  <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 3', background: 'var(--card-hover)' }}>
                    {p.media![0].type === 'video' ? (
                      <video src={p.media![0].src} poster={cover} muted loop playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Image src={p.media![0].src} alt={p.title} fill sizes="(max-width: 768px) 100vw, 33vw" style={{ objectFit: 'cover' }} />
                    )}
                    <span style={{
                      position: 'absolute', bottom: '10px', right: '10px',
                      fontFamily: 'var(--mono)', fontSize: '11px', color: '#fff',
                      background: 'rgba(0,0,0,0.55)', padding: '3px 8px', borderRadius: '100px',
                    }}>
                      {p.media!.length} items
                    </span>
                  </div>
                )}

                <div style={{ padding: '1.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--accent)', letterSpacing: '0.08em' }}>{p.num}</span>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      {p.categories.map(c => (
                        <span key={c} style={{
                          fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '0.06em', textTransform: 'uppercase',
                          padding: '2px 7px', borderRadius: '100px',
                          background: c === 'ai' ? 'rgba(var(--accent-rgb),0.1)' : 'color-mix(in srgb, var(--teal) 14%, transparent)',
                          color: c === 'ai' ? 'var(--accent)' : 'var(--teal)',
                        }}>{c}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '0.5rem' }}>{p.title}</div>
                  <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.7, marginBottom: '1.25rem' }}>{p.desc}</p>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--teal)', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.04em' }}>
                    {p.meta} <span style={{ color: 'var(--muted)' }}>·</span> {p.stack}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {openProject?.media && activeMedia && (
        <div
          onClick={() => setOpenProject(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '5vw',
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', width: '100%' }}>
            <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 3' }}>
              {activeMedia.type === 'image' ? (
                <Image src={activeMedia.src} alt={openProject.title} fill sizes="90vw" style={{ objectFit: 'contain' }} />
              ) : (
                <video src={activeMedia.src} controls autoPlay style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              )}
            </div>

            <div style={{ marginTop: '1rem', color: '#fff', fontSize: '14px' }}>{openProject.title}</div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '1rem', overflowX: 'auto' }}>
              {openProject.media.map((m, idx) => {
                const thumbSrc = m.type === 'video' ? (openProject.media!.find(x => x.type === 'image')?.src ?? m.src) : m.src
                return (
                  <div
                    key={idx}
                    onClick={() => setActiveIndex(idx)}
                    style={{
                      position: 'relative', width: '72px', height: '54px', flexShrink: 0,
                      borderRadius: '6px', overflow: 'hidden', cursor: 'pointer',
                      border: idx === activeIndex ? '2px solid var(--accent2)' : '2px solid transparent',
                    }}
                  >
                    <Image src={thumbSrc} alt="" fill sizes="72px" style={{ objectFit: 'cover' }} />
                    {m.type === 'video' && (
                      <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '18px', background: 'rgba(0,0,0,0.3)' }}>▶</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
