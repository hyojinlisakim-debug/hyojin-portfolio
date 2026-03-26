'use client'
import { useEffect, useRef } from 'react'

const experiences = [
  {
    company: 'Commercial (Canada)',
    badge: 'CURRENT',
    role: 'Shopify Web Designer & Section Developer',
    period: '2025 — Present · Calgary, AB',
    bullets: [
      'Leading <strong>Shopify storefront design and development</strong> — from concept and UX planning to full implementation.',
      'Developing custom <strong>Shopify sections</strong> using Liquid, HTML, CSS, and JavaScript for a highly tailored shopping experience.',
      'Collaborating on web architecture, performance optimization, and cross-browser/device compatibility.',
    ],
    tech: ['Shopify', 'Liquid', 'JavaScript', 'CSS', 'UX Design'],
    current: true,
  },
  {
    company: 'ATG (Asset Technology Group)',
    badge: null,
    role: 'Software Developer / IT Integration Engineer',
    period: 'Feb 2023 — Feb 2025 · Kyunggi-do, South Korea',
    bullets: [
      'Customized Hexagon\'s <strong>AWS-based EAM solution for GS Power</strong> — built Python/SQL automation workflows syncing performance data, enabling predictive maintenance. Reduced manual reporting time by <strong>50%</strong>.',
      'Built <strong>API integrations</strong> between EAM platform and external SAP-based systems and in-house web services, automating maintenance scheduling across stakeholders.',
      'Partnered with Hexagon India to implement API integrations and SSO — resolved <strong>80+ front- and back-end issues</strong> during pre-go-live; coordinated bilingual technical communication (English/Korean).',
    ],
    tech: ['Python', 'SQL', 'AWS', 'REST API', 'SAP', 'SSO', 'Oracle DB'],
    current: false,
  },
  {
    company: 'SEO Inc.',
    badge: null,
    role: 'IT Infrastructure & Network Engineer',
    period: 'Apr 2019 — Aug 2022 · Seoul, South Korea',
    bullets: [
      'Maintained <strong>40+ network devices</strong> supporting a 24/7 control room for AI-driven national maritime infrastructure across nine major ports. Ensured <strong>99.9% uptime</strong> through proactive monitoring.',
      'Managed <strong>IP allocation for 1,000+ endpoints</strong> (PCs, servers, IoT devices) through structured subnet planning, implementing firewall and ACL policies for secure network segmentation.',
      'Handled <strong>10+ infrastructure incidents per month</strong>, completing recovery within UPS grace periods. Achieved zero critical outages through rapid failover and hardware replacement.',
    ],
    tech: ['Cisco', 'Linux', 'Firewall', 'ACL', 'Network Monitoring', 'IoT'],
    current: false,
  },
]

export default function AboutPage() {
  const fadeRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') })
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' })
    fadeRefs.current.forEach(el => { if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [])

  return (
    <div style={{ paddingTop: '60px' }}>

      {/* ── EXPERIENCE ── */}
      <section style={{ padding: '100px 5vw', background: 'var(--bg)' }}>
        <div ref={el => { fadeRefs.current[0] = el }} className="fade-in">
          <div className="section-tag">// Experience</div>
          <h2>Work history</h2>
          <p className="section-desc">From enterprise asset management to e-commerce — a journey across industries and tech stacks.</p>
        </div>

        <div style={{ position: 'relative', paddingLeft: '28px' }}>
          <div style={{
            position: 'absolute', left: 0, top: '12px', bottom: 0,
            width: '1px', background: 'var(--border2)',
          }} />

          {experiences.map((exp, i) => (
            <div key={exp.company}
              ref={el => { fadeRefs.current[i + 1] = el }}
              className="fade-in"
              style={{ position: 'relative', marginBottom: '3.5rem' }}
            >
              <div style={{
                position: 'absolute', left: '-32px', top: '12px',
                width: '8px', height: '8px', borderRadius: '50%',
                background: exp.current ? 'var(--teal)' : 'var(--accent)',
                border: '2px solid var(--bg)',
                boxShadow: exp.current ? '0 0 12px var(--teal)' : '0 0 12px var(--accent)',
              }} />

              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <span style={{ fontFamily: 'var(--serif)', fontSize: '1.35rem', lineHeight: 1.2 }}>
                  {exp.company}
                </span>
                {exp.badge && (
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.08em',
                    padding: '3px 10px', borderRadius: '100px',
                    color: 'var(--teal)', background: 'rgba(46,207,168,0.1)',
                    border: '1px solid rgba(46,207,168,0.25)', alignSelf: 'center',
                  }}>{exp.badge}</span>
                )}
              </div>

              <div style={{ color: 'var(--accent2)', fontSize: '14px', fontWeight: 500, marginBottom: '0.25rem' }}>
                {exp.role}
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--muted)', marginBottom: '1.25rem', letterSpacing: '0.05em' }}>
                {exp.period}
              </div>

              <ul style={{ listStyle: 'none' }}>
                {exp.bullets.map((b, bi) => (
                  <li key={bi} style={{
                    color: 'var(--muted)', fontSize: '14px', lineHeight: 1.75,
                    padding: '0.5rem 0 0.5rem 1.2rem',
                    borderBottom: bi < exp.bullets.length - 1 ? '1px solid var(--border)' : 'none',
                    position: 'relative',
                  }}>
                    <span style={{ position: 'absolute', left: 0, color: 'var(--accent)', fontSize: '12px', top: '0.6rem' }}>→</span>
                    <span dangerouslySetInnerHTML={{ __html: b }} />
                  </li>
                ))}
              </ul>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '1rem' }}>
                {exp.tech.map(t => <span key={t} className="tech-tag">{t}</span>)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── EDUCATION & CERTS ── */}
      <section style={{ padding: '100px 5vw', background: 'var(--bg2)' }}>
        <div ref={el => { fadeRefs.current[4] = el }} className="fade-in">
          <div className="section-tag">// Education & Certifications</div>
          <h2>Background</h2>
          <p className="section-desc">Academic foundation in security and engineering, backed by industry certifications.</p>
        </div>

        <div ref={el => { fadeRefs.current[5] = el }} className="fade-in" style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', alignItems: 'start',
        }}>
          {/* Education */}
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', letterSpacing: '0.12em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '1rem' }}>
              Education
            </div>
            {[
              { degree: 'M.S. in Security Information', school: 'Soongsil University', meta: 'Sep 2020 — Feb 2023 · Seoul, S. Korea · GPA 4.39/4.5' },
              { degree: 'B.Eng. in Electronic Engineering', school: 'Chungwoon University', meta: 'Mar 2016 — Feb 2018 · S. Korea · GPA 3.87/4.5' },
              { degree: 'High School Diploma', school: 'Proverbsville High School', meta: 'Jun 2010 — Mar 2011 · Philippines' },
            ].map(e => (
              <div key={e.school} style={{
                padding: '1.5rem', background: 'var(--card)',
                border: '1px solid var(--border)', borderRadius: '12px', marginBottom: '1rem',
              }}>
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '0.25rem' }}>{e.degree}</div>
                <div style={{ color: 'var(--accent2)', fontSize: '13px', marginBottom: '0.25rem' }}>{e.school}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.04em' }}>{e.meta}</div>
              </div>
            ))}
          </div>

          {/* Certifications */}
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', letterSpacing: '0.12em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '1rem' }}>
              Certifications
            </div>
            {[
              { name: 'CCNA — Cisco Certified Network Associate', issuer: 'Cisco', year: '2020' },
              { name: 'Information Security Engineer', issuer: 'Ministry of Science and ICT, South Korea', year: '2018' },
              { name: 'Industrial Engineer — Information Processing', issuer: 'Ministry of Science and ICT, South Korea', year: '2016' },
              { name: 'Network Administrator 2', issuer: 'Information Qualification Agency, South Korea', year: '2014' },
            ].map(c => (
              <div key={c.name} style={{
                padding: '1rem 1.25rem', background: 'var(--card)',
                border: '1px solid var(--border)', borderRadius: '10px', marginBottom: '8px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>{c.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{c.issuer}</div>
                </div>
                <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--teal)', whiteSpace: 'nowrap', marginLeft: '1rem' }}>
                  {c.year}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
