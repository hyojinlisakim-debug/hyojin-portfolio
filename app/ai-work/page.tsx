'use client'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

type Project = {
  id: string
  title: string
  tool?: string
  video?: string
  images: string[]
}

// Add new work here: drop images into /public/ai-work/images and videos into
// /public/ai-work/videos, then add a project entry (or push into an existing
// project's `images` array) pointing at the new file paths.
const projects: Project[] = [
  {
    id: 'kjmaloe-miniature',
    title: 'KJMaleo Miniature',
    video: '/ai-work/videos/kjmaloe_miniature_img_video.mp4',
    images: [
      '/ai-work/images/kjmaloe_miniature_img_1.png',
      '/ai-work/images/kjmaloe_miniature_img_2.png',
      '/ai-work/images/kjmaloe_miniature_img_3.png',
      '/ai-work/images/kjmaloe_miniature_img_4.png',
      '/ai-work/images/kjmaloe_miniature_img_5.png',
    ],
  },
]

type Media = { type: 'image' | 'video'; src: string }

function projectMedia(project: Project): Media[] {
  const media: Media[] = project.video ? [{ type: 'video', src: project.video }] : []
  return media.concat(project.images.map(src => ({ type: 'image', src })))
}

export default function AiWorkPage() {
  const fadeRefs = useRef<(HTMLDivElement | null)[]>([])
  const [openProject, setOpenProject] = useState<Project | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') })
    }, { threshold: 0.1 })
    fadeRefs.current.forEach(el => { if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!openProject) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenProject(null)
      const media = projectMedia(openProject)
      if (e.key === 'ArrowRight') setActiveIndex(i => (i + 1) % media.length)
      if (e.key === 'ArrowLeft') setActiveIndex(i => (i - 1 + media.length) % media.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openProject])

  const openAt = (project: Project, index: number) => {
    setOpenProject(project)
    setActiveIndex(index)
  }

  const activeMedia = openProject ? projectMedia(openProject)[activeIndex] : null

  return (
    <div style={{ paddingTop: '60px' }}>
      <section style={{ padding: '100px 5vw', background: 'var(--bg2)' }}>
        <div ref={el => { fadeRefs.current[0] = el }} className="fade-in">
          <div className="section-tag">// AI Work</div>
          <h2>Generated with AI</h2>
          <p className="section-desc">A gallery of images and videos created with AI tools — experiments in prompting, style, and motion.</p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem',
        }}>
          {projects.map((project, i) => {
            const coverImage = project.images[0]
            return (
              <div
                key={project.id}
                ref={el => { fadeRefs.current[i + 1] = el }}
                className="fade-in"
                onClick={() => openAt(project, 0)}
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
                  {project.video ? (
                    <video
                      src={project.video}
                      poster={coverImage}
                      muted
                      loop
                      playsInline
                      onMouseEnter={e => e.currentTarget.play()}
                      onMouseLeave={e => e.currentTarget.pause()}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Image src={coverImage} alt={project.title} fill sizes="(max-width: 768px) 100vw, 33vw" style={{ objectFit: 'cover' }} />
                  )}
                  {project.images.length > 0 && (
                    <span style={{
                      position: 'absolute', bottom: '10px', right: '10px',
                      fontFamily: 'var(--mono)', fontSize: '11px', color: '#fff',
                      background: 'rgba(0,0,0,0.55)', padding: '3px 8px', borderRadius: '100px',
                    }}>
                      {project.images.length} stills
                    </span>
                  )}
                </div>
                <div style={{ padding: '1rem 1.25rem' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: project.tool ? '0.35rem' : 0 }}>{project.title}</div>
                  {project.tool && (
                    <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--accent2)', letterSpacing: '0.04em' }}>{project.tool}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {openProject && activeMedia && (
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

            <div style={{ marginTop: '1rem', color: '#fff', fontSize: '14px' }}>
              {openProject.title}{openProject.tool && <><span style={{ color: 'var(--muted)' }}> · </span><span style={{ fontFamily: 'var(--mono)', fontSize: '11px' }}>{openProject.tool}</span></>}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '1rem', overflowX: 'auto' }}>
              {projectMedia(openProject).map((m, idx) => (
                <div
                  key={idx}
                  onClick={() => setActiveIndex(idx)}
                  style={{
                    position: 'relative', width: '72px', height: '54px', flexShrink: 0,
                    borderRadius: '6px', overflow: 'hidden', cursor: 'pointer',
                    border: idx === activeIndex ? '2px solid var(--accent2)' : '2px solid transparent',
                  }}
                >
                  <Image src={m.type === 'video' ? (openProject.images[0] ?? m.src) : m.src} alt="" fill sizes="72px" style={{ objectFit: 'cover' }} />
                  {m.type === 'video' && (
                    <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '18px', background: 'rgba(0,0,0,0.3)' }}>▶</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
