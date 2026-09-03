'use client'
import { useEffect, useRef } from 'react'

type Filament = {
  angle: number
  baseLen: number
  curveOffset: number
  phase: number
  speedMul: number
  color: string
}

type RGB = { r: number; g: number; b: number }

function hexToRgb(hex: string): RGB {
  const clean = hex.replace('#', '').trim()
  const n = parseInt(clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function lerpRgb(a: RGB, b: RGB, t: number): RGB {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t }
}

function rgbStr({ r, g, b }: RGB, alpha: number): string {
  return `rgba(${r | 0},${g | 0},${b | 0},${alpha})`
}

function readVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

function isDarkMode(): boolean {
  const attr = document.documentElement.getAttribute('data-theme')
  if (attr === 'dark') return true
  if (attr === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function angleDiff(a: number, b: number): number {
  let d = (a - b) % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  if (d < -Math.PI) d += Math.PI * 2
  return d
}

function smoothstep(t: number): number {
  const c = Math.min(1, Math.max(0, t))
  return c * c * (3 - 2 * c)
}

/**
 * A dense neuron-like cluster that stays gathered near the center at rest
 * and spreads its filaments outward the more the pointer moves across it —
 * reaching further toward wherever the cursor is. Pure Canvas2D so it needs
 * no extra dependency and degrades to a single static frame when the
 * viewer prefers reduced motion.
 */
export default function NeuronHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let stopA: RGB, stopB: RGB, stopC: RGB
    let dark = isDarkMode()
    function refreshColors() {
      dark = isDarkMode()
      stopA = hexToRgb(readVar('--signal-teal', '#187b74'))
      stopB = hexToRgb(readVar('--signal-violet', '#6a5ea3'))
      stopC = hexToRgb(readVar('--signal-amber', '#c67a1f'))
    }
    refreshColors()
    function gradientColor(t: number, alpha: number): string {
      const wrapped = ((t % 1) + 1) % 1
      const c = wrapped < 0.5
        ? lerpRgb(stopA, stopB, wrapped / 0.5)
        : lerpRgb(stopB, stopC, (wrapped - 0.5) / 0.5)
      return rgbStr(c, alpha)
    }

    const FIL_COUNT = 120
    const filaments: Filament[] = Array.from({ length: FIL_COUNT }, () => {
      const angle = Math.random() * Math.PI * 2
      return {
        angle,
        baseLen: 0.5 + Math.random() * 0.46,
        curveOffset: (Math.random() - 0.5) * 0.9,
        phase: Math.random() * 0.35,
        speedMul: 0.82 + Math.random() * 0.32,
        color: '',
      }
    })
    const CORE_COUNT = 10
    const core = Array.from({ length: CORE_COUNT }, () => ({
      a: Math.random() * Math.PI * 2,
      r: Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
    }))

    let dpr = Math.min(window.devicePixelRatio || 1, 2)
    let cw = 0, ch = 0
    function resize() {
      const rect = canvas!.getBoundingClientRect()
      cw = Math.max(1, rect.width)
      ch = Math.max(1, rect.height)
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas!.width = cw * dpr
      canvas!.height = ch * dpr
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    let mouseAngle = 0
    let pointerActive = false
    let moveEnergy = 0
    let lastPt: { x: number; y: number; t: number } | null = null
    function onMove(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect()
      const px = e.clientX - rect.left - rect.width / 2
      const py = e.clientY - rect.top - rect.height / 2
      mouseAngle = Math.atan2(py, px)
      pointerActive = true
      const now = performance.now()
      if (lastPt) {
        const dt = Math.max(1, now - lastPt.t)
        const dx = e.clientX - lastPt.x, dy = e.clientY - lastPt.y
        const speed = Math.sqrt(dx * dx + dy * dy) / dt
        moveEnergy = Math.min(1, moveEnergy + speed * 0.12)
      }
      lastPt = { x: e.clientX, y: e.clientY, t: now }
    }
    function onLeave() { pointerActive = false }
    canvas.addEventListener('pointermove', onMove, { passive: true })
    canvas.addEventListener('pointerleave', onLeave, { passive: true })

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onSchemeChange = () => refreshColors()
    mq.addEventListener?.('change', onSchemeChange)
    const mo = new MutationObserver(refreshColors)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    let raf = 0
    let drift = 0
    const start = performance.now()

    function drawFrame(spreadBase: number) {
      ctx!.clearRect(0, 0, cw, ch)
      const cx = cw / 2, cy = ch / 2
      const field = Math.min(cw, ch) / 2 * 0.92
      ctx!.globalCompositeOperation = dark ? 'lighter' : 'source-over'

      for (const c of core) {
        const rr = field * 0.06 * c.r * (1 + spreadBase * 0.3)
        const x = cx + Math.cos(c.a) * rr
        const y = cy + Math.sin(c.a) * rr
        const color = gradientColor(0.5, 0.9)
        ctx!.shadowBlur = 16
        ctx!.shadowColor = color
        ctx!.fillStyle = color
        ctx!.beginPath()
        ctx!.arc(x, y, 2.6 + spreadBase * 1.2, 0, Math.PI * 2)
        ctx!.fill()
      }

      for (const f of filaments) {
        const effAngle = f.angle + drift
        const aim = pointerActive
          ? Math.pow(Math.max(0, 1 - Math.abs(angleDiff(effAngle, mouseAngle)) / 1.1), 2)
          : 0
        const progress = Math.min(1, Math.max(0, spreadBase * f.speedMul + f.phase * 0.4 + aim * 0.4))
        const eased = smoothstep(progress)

        const sx = cx + Math.cos(effAngle) * field * 0.05
        const sy = cy + Math.sin(effAngle) * field * 0.05
        const fullLen = field * f.baseLen
        const ex = cx + Math.cos(effAngle) * fullLen
        const ey = cy + Math.sin(effAngle) * fullLen
        const curX = sx + (ex - sx) * eased
        const curY = sy + (ey - sy) * eased

        const mx = (sx + curX) / 2, my = (sy + curY) / 2
        const dist = Math.hypot(curX - sx, curY - sy)
        const px = -(curY - sy), py = (curX - sx)
        const plen = Math.hypot(px, py) || 1
        const bend = f.curveOffset * dist * 0.55
        const ctrlX = mx + (px / plen) * bend
        const ctrlY = my + (py / plen) * bend

        if (!f.color) f.color = ''
        const glow = Math.min(1, eased * 1.1 + aim * 0.45)
        const alpha = (0.22 + eased * 0.4) * (dark ? 1 : 0.85)
        ctx!.strokeStyle = gradientColor(effAngle / (Math.PI * 2) + 0.5, alpha)
        ctx!.lineWidth = 0.9 + eased * 0.7
        ctx!.shadowBlur = dark ? 4 + glow * 8 : 0
        ctx!.shadowColor = ctx!.strokeStyle
        ctx!.beginPath()
        ctx!.moveTo(sx, sy)
        ctx!.quadraticCurveTo(ctrlX, ctrlY, curX, curY)
        ctx!.stroke()

        if (eased > 0.03) {
          const tipColor = gradientColor(effAngle / (Math.PI * 2) + 0.5, Math.min(1, 0.55 + glow * 0.5))
          ctx!.shadowBlur = 6 + glow * 10
          ctx!.shadowColor = tipColor
          ctx!.fillStyle = tipColor
          ctx!.beginPath()
          ctx!.arc(curX, curY, 1 + glow * 1.8, 0, Math.PI * 2)
          ctx!.fill()
        }
      }
      ctx!.shadowBlur = 0
    }

    if (reduceMotion) {
      drawFrame(0.55)
    } else {
      const loop = () => {
        const t = (performance.now() - start) / 1000
        drift += 0.0006
        moveEnergy *= 0.945
        const breathe = 0.16 + 0.05 * Math.sin(t * 0.4)
        const spreadBase = Math.min(1, breathe + moveEnergy)
        drawFrame(spreadBase)
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
    }

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      mo.disconnect()
      mq.removeEventListener?.('change', onSchemeChange)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  return <canvas ref={canvasRef} aria-hidden="true" />
}
