'use client'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

type MediaItem = {
  id: string
  type: 'image' | 'video'
  src: string
  poster?: string
  title: string
  tool: string
}

// Drop your generated files into /public/ai-work and update the paths below.
const items: MediaItem[] = [
  { id: 'piece-01', type: 'image', src: '/ai-work/piece-01.jpg', title: 'Neon Skyline', tool: 'Midjourney' },
  { id: 'piece-02', type: 'video', src: '/ai-work/piece-02.mp4', poster: '/ai-work/piece-02-poster.jpg', title: 'Ocean Drift', tool: 'Runway' },
  { id: 'piece-03', type: 'image', src: '/ai-work/piece-03.jpg', title: 'Studio Portrait', tool: 'Midjourney' },
  { id: 'piece-04', type: 'image', src: '/ai-work/piece-04.jpg', title: 'Glass Architecture', tool: 'DALL·E' },
  { id: 'piece-05', type: 'video', src: '/ai-work/piece-05.mp4', poster: '/ai-work/piece-05-poster.jpg', title: 'Motion Study', tool: 'Kling' },
  { id: 'piece-06', type: 'image', src: '/ai-work/piece-06.jpg', title: 'Abstract Texture', tool: 'Midjourney' },
]

const filters = ['All', 'Image', 'Video'] as const

export default function AiWorkPage() {
  const fadeRefs = useRef<(HTMLDivElement | null)[]>([])
  const [filter, setFilter] = useState<(typeof filters)[number]>('All')
  const [active, setActive] = useState<MediaItem | null>(null)

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') })
    }, { threshold: 0.1 })
    fadeRefs.current.forEach(el => { if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setActive(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])

  const visible = items.filter(i => filter === 'All' || i.type === filter.toLowerCase())

  return (
    <div style={{ paddingTop: '60px' }}>
      <section style={{ padding: '100px 5vw', background: 'var(--bg2)' }}>
        <div ref={el => { fadeRefs.current[0] = el }} className="fade-in">
          <div className="section-tag">// AI Work</div>
          <h2>Generated with AI</h2>
          <p className="section-desc">A gallery of images and videos created with AI tools — experiments in prompting, style, and motion.</p>
        </div>

        <div ref={el => { fadeRefs.current[1] = el }} className="fade-in" style={{ display: 'flex', gap: '8px', marginBottom: '2rem' }}>
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="tag"
              style={{
                cursor: 'pointer',
                color: filter === f ? 'var(--bg)' : 'var(--muted)',
                background: filter === f ? 'var(--accent)' : undefined,
                borderColor: filter === f ? 'var(--accent)' : undefined,
              }}
            >
              {f}
            </button>
          ))}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem',
        }}>
          {visible.map((item, i) => (
            <div
              key={item.id}
              ref={el => { fadeRefs.current[i + 2] = el }}
              className="fade-in"
              onClick={() => setActive(item)}
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'border-color .2s, transform .2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = 'var(--border2)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 3', background: 'var(--card-hover)' }}>
                {item.type === 'image' ? (
                  <Image src={item.src} alt={item.title} fill sizes="(max-width: 768px) 100vw, 33vw" style={{ objectFit: 'cover' }} />
                ) : (
                  <video
                    src={item.src}
                    poster={item.poster}
                    muted
                    loop
                    playsInline
                    onMouseEnter={e => e.currentTarget.play()}
                    onMouseLeave={e => e.currentTarget.pause()}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}
              </div>
              <div style={{ padding: '1rem 1.25rem' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '0.35rem' }}>{item.title}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--accent2)', letterSpacing: '0.04em' }}>{item.tool}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {active && (
        <div
          onClick={() => setActive(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '5vw',
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', width: '100%' }}>
            {active.type === 'image' ? (
              <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 3' }}>
                <Image src={active.src} alt={active.title} fill sizes="90vw" style={{ objectFit: 'contain' }} />
              </div>
            ) : (
              <video src={active.src} poster={active.poster} controls autoPlay style={{ width: '100%', maxHeight: '80vh' }} />
            )}
            <div style={{ marginTop: '1rem', color: '#fff', fontSize: '14px' }}>
              {active.title} <span style={{ color: 'var(--muted)' }}>·</span> <span style={{ fontFamily: 'var(--mono)', fontSize: '11px' }}>{active.tool}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
