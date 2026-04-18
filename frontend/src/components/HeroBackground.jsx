import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useTheme } from '../context/ThemeContext'

const THEME_COLORS = {
  starry:   { particle: 0xE8C547, grid: 0x4A90C4, hex: '#E8C547', star: 0xC8D4FF },
  dark:     { particle: 0xFF6B35, grid: 0xFF6B35, hex: '#FF6B35', star: 0xFFB899 },
  wild:     { particle: 0xE8792A, grid: 0x5A7A3A, hex: '#E8792A', star: 0xC8E8A0 },
  dusk:     { particle: 0x7D4E6A, grid: 0x4A3650, hex: '#7D4E6A', star: 0x5C2E4E },
  bold:     { particle: 0xFF2233, grid: 0x0A2280, hex: '#FF2233', star: 0xAABBFF },
  forest:   { particle: 0x2D6A4F, grid: 0x52B788, hex: '#2D6A4F', star: 0x90E8BC },
  heritage: { particle: 0xF7F5D0, grid: 0xF7F5D0, hex: '#F7F5D0', star: 0xFFE88A },
  noir:     { particle: 0x6B1A1A, grid: 0x3D7A8A, hex: '#6B1A1A', star: 0x88CCDD },
  blossom:  { particle: 0xE8A0A0, grid: 0x4A8B7B, hex: '#E8A0A0', star: 0xFFD4D4 },
}

function ellipseFill(cx, cy, rx, ry, count) {
  const pts = []
  while (pts.length < count) {
    const x = cx + (Math.random() * 2 - 1) * rx
    const y = cy + (Math.random() * 2 - 1) * ry
    if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) pts.push([x, y])
  }
  return pts
}

function buildPawPoints() {
  return [
    ...ellipseFill(  0.00, -1.0,  1.30, 1.10, 2000),
    ...ellipseFill( -1.20,  0.6,  0.45, 0.60,  500),
    ...ellipseFill( -0.42,  1.2,  0.45, 0.60,  500),
    ...ellipseFill(  0.42,  1.2,  0.45, 0.60,  500),
    ...ellipseFill(  1.20,  0.6,  0.45, 0.60,  500),
  ]
}

function makeCircleTexture() {
  const c = document.createElement('canvas')
  c.width = 16; c.height = 16
  const ctx = c.getContext('2d')
  ctx.beginPath()
  ctx.arc(8, 8, 6, 0, Math.PI * 2)
  ctx.fillStyle = 'white'
  ctx.fill()
  return new THREE.CanvasTexture(c)
}

// Soft radial glow — white hot centre fading to transparent
function makeStarTexture() {
  const c = document.createElement('canvas')
  c.width = 64; c.height = 64
  const ctx = c.getContext('2d')
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0,    'rgba(255,255,255,1)')
  grad.addColorStop(0.15, 'rgba(255,255,255,0.85)')
  grad.addColorStop(0.4,  'rgba(255,255,255,0.3)')
  grad.addColorStop(1,    'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
}

function clamp01(v)   { return Math.max(0, Math.min(1, v)) }
function easeInOut(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t }

const STAR_COUNT = 350

export default function HeroBackground() {
  const canvasRef  = useRef(null)
  const mouseRef   = useRef(new THREE.Vector2(9999, 9999))  // world-space cursor
  const { theme }  = useTheme()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const colors = THEME_COLORS[theme] || THEME_COLORS.dark

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(canvas.clientWidth, canvas.clientHeight)
    renderer.setClearColor(0x000000, 0)

    // ── Scene & Camera ──
    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(55, canvas.clientWidth / canvas.clientHeight, 0.1, 200)
    camera.position.set(0, 0.5, 8)
    camera.lookAt(0, 0, 0)

    // ── Textures ──
    const circleTexture = makeCircleTexture()
    const starTexture   = makeStarTexture()

    // ── Background particles ──
    const BG_COUNT = 120
    const bgPos = new Float32Array(BG_COUNT * 3)
    for (let i = 0; i < BG_COUNT; i++) {
      bgPos[i*3]   = (Math.random()-0.5)*30
      bgPos[i*3+1] = (Math.random()-0.5)*20
      bgPos[i*3+2] = (Math.random()-0.5)*20
    }
    const bgGeo = new THREE.BufferGeometry()
    bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPos, 3))
    const bgMat = new THREE.PointsMaterial({
      color: colors.particle, size: 0.07, transparent: true, opacity: 0.35,
      sizeAttenuation: true, map: circleTexture, alphaTest: 0.5,
    })
    scene.add(new THREE.Points(bgGeo, bgMat))

    // ── Stars ──
    // Each star is a sprite so it always faces the camera (billboard) — dainty glow
    const starColor  = new THREE.Color(colors.star)
    const starHomeX  = new Float32Array(STAR_COUNT)
    const starHomeY  = new Float32Array(STAR_COUNT)
    const starHomeZ  = new Float32Array(STAR_COUNT)
    const starLiveX  = new Float32Array(STAR_COUNT)
    const starLiveY  = new Float32Array(STAR_COUNT)
    const starLiveZ  = new Float32Array(STAR_COUNT)
    const starPhase  = new Float32Array(STAR_COUNT)   // for twinkle
    const starSize   = new Float32Array(STAR_COUNT)   // varied sizes

    const starSprites = []

    for (let i = 0; i < STAR_COUNT; i++) {
      // Spread across the full scene volume
      const hx = (Math.random() - 0.5) * 20
      const hy = (Math.random() - 0.5) * 12
      const hz = (Math.random() - 0.5) * 8 - 1  // mostly behind paw (negative z)
      starHomeX[i] = hx; starHomeY[i] = hy; starHomeZ[i] = hz
      starLiveX[i] = hx; starLiveY[i] = hy; starLiveZ[i] = hz
      starPhase[i] = Math.random() * Math.PI * 2
      starSize[i]  = 0.04 + Math.random() * 0.18   // 0.04 – 0.22

      const mat = new THREE.SpriteMaterial({
        map: starTexture,
        color: starColor,
        transparent: true,
        opacity: 0.15 + Math.random() * 0.5,
        depthWrite: false,
        blending: THREE.AdditiveBlending,   // glow accumulates beautifully
      })
      const sprite = new THREE.Sprite(mat)
      sprite.scale.set(starSize[i], starSize[i], 1)
      sprite.position.set(hx, hy, hz)
      scene.add(sprite)
      starSprites.push({ sprite, mat, baseOpacity: mat.opacity })
    }

    // ── Raycasting plane for cursor world pos ──
    const cursorPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
    const raycaster   = new THREE.Raycaster()
    const cursorWorld = new THREE.Vector3()

    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      const ndcX =  ((e.clientX - rect.left) / rect.width)  * 2 - 1
      const ndcY = -((e.clientY - rect.top)  / rect.height) * 2 + 1
      raycaster.setFromCamera({ x: ndcX, y: ndcY }, camera)
      raycaster.ray.intersectPlane(cursorPlane, cursorWorld)
      mouseRef.current.set(cursorWorld.x, cursorWorld.y)
    }
    window.addEventListener('mousemove', onMouseMove)

    const onResize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)

    // ── Paw particle system ──
    const PAW_SCALE = 1.5
    const pawGroup = new THREE.Group()
    pawGroup.position.set(0.4, 0, 0)
    pawGroup.scale.set(PAW_SCALE, PAW_SCALE, PAW_SCALE)
    scene.add(pawGroup)

    const shapePts = buildPawPoints()
    const N = shapePts.length

    const homeX    = new Float32Array(N)
    const homeY    = new Float32Array(N)
    const liveX    = new Float32Array(N)
    const liveY    = new Float32Array(N)
    const liveZ    = new Float32Array(N)
    const phase    = new Float32Array(N)
    const velX     = new Float32Array(N)
    const velY     = new Float32Array(N)
    const velZ     = new Float32Array(N)
    const dirX     = new Float32Array(N)
    const dirY     = new Float32Array(N)
    const dirZ     = new Float32Array(N)
    const scatterX = new Float32Array(N)
    const scatterY = new Float32Array(N)
    const scatterZ = new Float32Array(N)

    for (let i = 0; i < N; i++) {
      const [x, y] = shapePts[i]
      homeX[i] = x; homeY[i] = y
      liveX[i] = x; liveY[i] = y
      liveZ[i] = (Math.random()-0.5)*0.04
      phase[i] = Math.random() * Math.PI * 2
      const angle  = Math.atan2(y, x) + (Math.random()-0.5)*1.2
      const zAngle = (Math.random()-0.5) * Math.PI
      const r = Math.cos(zAngle)
      dirX[i] = Math.cos(angle) * r
      dirY[i] = Math.sin(angle) * r
      dirZ[i] = Math.sin(zAngle)
      // pre-bake scatter destinations (far out)
      const dist = 6.0 * (0.7 + Math.random() * 0.6)
      scatterX[i] = x + dirX[i] * dist
      scatterY[i] = y + dirY[i] * dist
      scatterZ[i] = dirZ[i] * dist
    }

    const pawPositions = new Float32Array(N * 3)
    const pawGeo = new THREE.BufferGeometry()
    pawGeo.setAttribute('position', new THREE.BufferAttribute(pawPositions, 3))

    const pawColor = new THREE.Color(colors.particle)
    pawColor.offsetHSL(0, 0.1, 0.06)
    const pawMat = new THREE.PointsMaterial({
      color: pawColor, size: 0.09, transparent: true, opacity: 1.0,
      sizeAttenuation: true, map: circleTexture, alphaTest: 0.5,
    })
    pawGroup.add(new THREE.Points(pawGeo, pawMat))

    // ── Paw state ──
    let mode = 'idle'
    const PAW_ATTRACT_RADIUS = 2.5   // world units (local paw space)
    const PAW_ATTRACT_FORCE  = 0.65  // max pull distance

    // ── Animation ──
    let frameId, t = 0
    const STAR_PUSH_RADIUS = 2.2   // world units
    const STAR_PUSH_FORCE  = 1.8   // how far they drift
    const STAR_LERP        = 0.04

    const animate = () => {
      frameId = requestAnimationFrame(animate)
      t += 0.016

      const raw  = clamp01(window.scrollY / (window.innerHeight * 1.5))
      const prog = easeInOut(raw)

      // ── Paw scatter transitions ──
      if (prog > 0.01) {
        if (mode !== 'scroll-out') mode = 'scroll-out'
      } else if (prog <= 0.01 && mode === 'scroll-out') {
        mode = 'idle'
      }

      // ── Paw particles ──
      // Keep rotating in all modes — speed up slightly during scatter for drama
      pawGroup.rotation.y = 0
      // Gentle z tilt during dispersion only
      pawGroup.rotation.z = mode === 'scroll-out' ? Math.sin(t * 0.1) * 0.02 : 0
      pawGroup.position.y = Math.sin(t * 0.25) * 0.15

      const posAttr = pawGeo.attributes.position
      for (let i = 0; i < N; i++) {
        if (mode === 'scroll-out') {
          // Directly interpolate between home and scatter based on scroll progress
          liveX[i] = homeX[i] + (scatterX[i] - homeX[i]) * prog
          liveY[i] = homeY[i] + (scatterY[i] - homeY[i]) * prog
          liveZ[i] = (scatterZ[i]) * prog
        } else {
          // Idle — continuous organic wiggle + cursor attraction
          const wiggleX = Math.sin(t * 0.9 + phase[i])         * 0.10
                        + Math.cos(t * 0.5 + phase[i] * 1.7)   * 0.05
          const wiggleY = Math.sin(t * 0.7 + phase[i] * 1.3)   * 0.10
                        + Math.cos(t * 0.4 + phase[i] * 0.8)   * 0.05

          const localMX = (mouseRef.current.x - pawGroup.position.x) / PAW_SCALE
          const localMY = (mouseRef.current.y - pawGroup.position.y) / PAW_SCALE
          const cx = localMX - homeX[i]
          const cy = localMY - homeY[i]
          const cd = Math.sqrt(cx * cx + cy * cy) + 0.001
          let tx = homeX[i] + wiggleX
          let ty = homeY[i] + wiggleY
          if (cd < PAW_ATTRACT_RADIUS) {
            const pull = (1 - cd / PAW_ATTRACT_RADIUS) * PAW_ATTRACT_FORCE
            tx += (cx / cd) * pull
            ty += (cy / cd) * pull
          }
          liveX[i] += (tx - liveX[i]) * 0.05
          liveY[i] += (ty - liveY[i]) * 0.05
          liveZ[i] += (0 - liveZ[i]) * 0.05
        }
        posAttr.setXYZ(i, liveX[i], liveY[i], liveZ[i])
      }
      posAttr.needsUpdate = true
      pawMat.opacity = clamp01(1 - (prog - 0.4) * 2.5)

      // ── Stars update ──
      const mx = mouseRef.current.x
      const my = mouseRef.current.y

      for (let i = 0; i < STAR_COUNT; i++) {
        const hx = starHomeX[i], hy = starHomeY[i], hz = starHomeZ[i]

        // Cursor repulsion (only for stars near z=0 plane; deeper stars less affected)
        const zWeight = Math.max(0, 1 - Math.abs(hz) / 5)
        const dx = hx - mx, dy = hy - my
        const dist = Math.sqrt(dx*dx + dy*dy) + 0.001
        let targetX = hx, targetY = hy, targetZ = hz

        if (dist < STAR_PUSH_RADIUS) {
          const push = (1 - dist / STAR_PUSH_RADIUS) * STAR_PUSH_FORCE * zWeight
          targetX = hx + (dx / dist) * push
          targetY = hy + (dy / dist) * push
          targetZ = hz + push * 0.4   // shift toward camera slightly
        }

        // Gentle idle drift (slight sin wave per star)
        targetX += Math.sin(t * 0.3 + starPhase[i]) * 0.04
        targetY += Math.cos(t * 0.25 + starPhase[i] * 1.3) * 0.03

        starLiveX[i] += (targetX - starLiveX[i]) * STAR_LERP
        starLiveY[i] += (targetY - starLiveY[i]) * STAR_LERP
        starLiveZ[i] += (targetZ - starLiveZ[i]) * STAR_LERP

        starSprites[i].sprite.position.set(starLiveX[i], starLiveY[i], starLiveZ[i])

        // Twinkle: modulate opacity with slow sin
        const twinkle = 0.6 + Math.sin(t * 1.5 + starPhase[i]) * 0.4
        starSprites[i].mat.opacity = starSprites[i].baseOpacity * twinkle

        // Slightly scale up stars near cursor
        const proximity = Math.max(0, 1 - Math.sqrt(dx*dx + dy*dy) / STAR_PUSH_RADIUS)
        const s = starSize[i] * (1 + proximity * 0.6)
        starSprites[i].sprite.scale.set(s, s, 1)
      }

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('resize', onResize)
      starSprites.forEach(s => { scene.remove(s.sprite); s.mat.dispose() })
      starTexture.dispose()
      renderer.dispose()
      bgGeo.dispose(); bgMat.dispose()
      pawGeo.dispose(); pawMat.dispose()
      circleTexture.dispose()
    }
  }, [theme])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  )
}
