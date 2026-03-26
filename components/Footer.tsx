export default function Footer() {
  return (
    <footer style={{
      padding: '2rem 5vw',
      borderTop: '1px solid var(--border)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      flexWrap: 'wrap', gap: '1rem',
    }}>
      <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
        © 2025 Hyojin Kim. Built for opportunities.
      </span>
      <a href="#" style={{
        fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--muted)',
        textDecoration: 'none', letterSpacing: '0.06em',
      }}>
        ↑ Back to top
      </a>
    </footer>
  )
}
