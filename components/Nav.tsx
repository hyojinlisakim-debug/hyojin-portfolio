'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Nav() {
  const pathname = usePathname()

  const links = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/projects', label: 'Projects' },
    { href: '/contact', label: 'Contact' },
  ]

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      padding: '0 5vw', height: '60px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      borderBottom: '1px solid var(--border)',
      backdropFilter: 'blur(16px)',
      background: 'rgba(10,10,15,0.7)',
    }}>
      <Link href="/" style={{
        fontFamily: 'var(--mono)', fontSize: '14px', color: 'var(--accent2)',
        letterSpacing: '0.04em', textDecoration: 'none',
      }}>
        HK_
      </Link>
      <ul style={{ display: 'flex', gap: '2rem', listStyle: 'none' }}>
        {links.map(({ href, label }) => (
          <li key={href}>
            <Link href={href} style={{
              color: pathname === href ? 'var(--text)' : 'var(--muted)',
              textDecoration: 'none', fontSize: '13px',
              letterSpacing: '0.03em', transition: 'color .2s',
              borderBottom: pathname === href ? '1px solid var(--accent)' : 'none',
              paddingBottom: '2px',
            }}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
