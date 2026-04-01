import { useEffect, useRef } from 'react'
import { useTheme } from '../context/ThemeContext'

function getCSSVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

// Parse any CSS color string to { r, g, b } 0-255
function parseColor(str) {
  const d = document.createElement('div')
  d.style.color = str
  document.body.appendChild(d)
  const computed = getComputedStyle(d).color
  document.body.removeChild(d)
  const m = computed.match(/\d+/g)
  if (!m) return { r: 255, g: 107, b: 53 }
  return { r: parseInt(m[0]), g: parseInt(m[1]), b: parseInt(m[2]) }
}

function luminance({ r, g, b }) {
  // Perceived brightness 0-255
  return 0.299 * r + 0.587 * g + 0.114 * b
}

// Pick a trail color that contrasts against the element under the cursor
function pickContrастColor(primary, bg) {
  const pLum  = luminance(parseColor(primary))
  const bgLum = luminance(parseColor(bg))
  const diff  = Math.abs(pLum - bgLum)

  if (diff > 45) return primary   // good contrast — use primary

  // Too similar: use high-contrast fallback based on bg brightness
  if (bgLum > 128) {
    // Light background — use a dark color
    return darken(primary, 0.65)
  } else {
    // Dark/saturated background — go very light (near white)
    return lighten(primary, 0.78)
  }
}

function darken(hex, amt) {
  const { r, g, b } = parseColor(hex)
  const c = (v) => Math.max(0, Math.round(v * (1 - amt))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

function lighten(hex, amt) {
  const { r, g, b } = parseColor(hex)
  const c = (v) => Math.min(255, Math.round(v + (255 - v) * amt)).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

function toHex({ r, g, b }) {
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
}

function lerpColor(a, b, t) {
  const ca = parseColor(a), cb = parseColor(b)
  return toHex({
    r: Math.round(ca.r + (cb.r - ca.r) * t),
    g: Math.round(ca.g + (cb.g - ca.g) * t),
    b: Math.round(ca.b + (cb.b - ca.b) * t),
  })
}

function drawPaw(ctx, x, y, size, opacity, angle, color) {
  ctx.save()
  ctx.globalAlpha = opacity
  ctx.translate(x, y)
  ctx.rotate(angle)

  const s = size / 100

  ctx.beginPath()
  ctx.ellipse(0, 15 * s, 22 * s, 20 * s, 0, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()

  const toes = [
    { dx: -18, dy: -12, rx: 9,  ry: 11, rot: -0.26 },
    { dx:  -6, dy: -20, rx: 8,  ry: 11, rot: -0.09 },
    { dx:   7, dy: -20, rx: 8,  ry: 11, rot:  0.09 },
    { dx:  19, dy: -12, rx: 9,  ry: 11, rot:  0.26 },
  ]
  toes.forEach(({ dx, dy, rx, ry, rot }) => {
    ctx.save()
    ctx.translate(dx * s, dy * s)
    ctx.rotate(rot)
    ctx.beginPath()
    ctx.ellipse(0, 0, rx * s, ry * s, 0, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
    ctx.restore()
  })

  ctx.restore()
}

export default function PawTrail() {
  const canvasRef    = useRef(null)
  const stamps       = useRef([])
  const last         = useRef({ x: -999, y: -999 })
  const rafId        = useRef(null)
  const primaryRef   = useRef('#FF6B35')
  const bgRef        = useRef('#0d0d0d')
  const trailColor   = useRef('#FF6B35')   // current resolved trail color
  const targetColor  = useRef('#FF6B35')   // color we're lerping toward
  const lerpT        = useRef(1)           // 0→1 transition progress
  const { theme }    = useTheme()

  // Update primary + bg refs when theme changes
  useEffect(() => {
    const id = setTimeout(() => {
      primaryRef.current  = getCSSVar('--primary') || '#FF6B35'
      bgRef.current       = getCSSVar('--bg')      || '#0d0d0d'
      // Trigger a smooth color transition
      targetColor.current = pickContrастColor(primaryRef.current, bgRef.current)
      lerpT.current       = 0
    }, 50)
    return () => clearTimeout(id)
  }, [theme])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')

    const MIN_DIST  = 30
    const FADE_IN   = 80         // ms — faster pop-in
    const FADE_OUT  = 1400       // ms — long, silky fade
    const TOTAL     = FADE_IN + FADE_OUT
    const PEAK_OP   = 0.52
    const SIZE      = 34

    function resize() {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Sample background color under cursor using element at point
    function sampleBgUnderCursor(x, y) {
      // Temporarily hide the trail canvas
      canvas.style.display = 'none'
      const el = document.elementFromPoint(x, y)
      canvas.style.display = ''
      if (!el) return bgRef.current
      const bg = getComputedStyle(el).backgroundColor
      // Skip transparent
      if (!bg || bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)') return bgRef.current
      return bg
    }

    function onMove(e) {
      const dx   = e.clientX - last.current.x
      const dy   = e.clientY - last.current.y
      const dist = Math.hypot(dx, dy)

      if (dist >= MIN_DIST) {
        // Check if cursor is over the paw (same detection as HeroBackground)
        const pawScreenX = window.innerWidth  * 0.5 + (0.4 / 8) * window.innerWidth  * 0.5 * 1.2
        const pawScreenY = window.innerHeight * 0.5
        const pawDist    = Math.hypot(e.clientX - pawScreenX, e.clientY - pawScreenY)
        const overPaw    = pawDist < 200

        // If over the paw, treat its color as the local background
        // Otherwise sample actual element background
        const localBg  = overPaw
          ? primaryRef.current
          : sampleBgUnderCursor(e.clientX, e.clientY)

        const resolved = pickContrастColor(primaryRef.current, localBg)

        // If color needs to change, start lerp
        if (resolved !== targetColor.current) {
          targetColor.current = resolved
          lerpT.current       = 0
        }

        const angle = Math.atan2(dy, dx) + Math.PI / 2 + (Math.random() - 0.5) * 0.2
        stamps.current.push({
          x: e.clientX + (Math.random() - 0.5) * 4,
          y: e.clientY + (Math.random() - 0.5) * 4,
          angle,
          color: trailColor.current,
          born: performance.now(),
        })
        if (stamps.current.length > 50) stamps.current.shift()
        last.current = { x: e.clientX, y: e.clientY }
      }
    }
    window.addEventListener('mousemove', onMove)

    // Smooth cubic ease-out for opacity fade
    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3) }
    // Smooth sine ease-in for fade-in pop
    function easeInSine(t)   { return 1 - Math.cos(t * Math.PI / 2) }

    function loop(now) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      stamps.current = stamps.current.filter(s => now - s.born < TOTAL)

      // Advance color lerp
      if (lerpT.current < 1) {
        lerpT.current = Math.min(1, lerpT.current + 0.04)
        trailColor.current = lerpColor(trailColor.current, targetColor.current, lerpT.current)
      }

      stamps.current.forEach(s => {
        const age = now - s.born
        let opacity
        if (age < FADE_IN) {
          opacity = easeInSine(age / FADE_IN) * PEAK_OP
        } else {
          const t = (age - FADE_IN) / FADE_OUT
          // Smooth cubic fade-out — much gentler than quadratic
          opacity = (1 - easeOutCubic(t)) * PEAK_OP
        }
        if (opacity > 0.003) {
          drawPaw(ctx, s.x, s.y, SIZE, opacity, s.angle, s.color)
        }
      })

      rafId.current = requestAnimationFrame(loop)
    }
    rafId.current = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(rafId.current)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  )
}
