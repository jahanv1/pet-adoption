import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useTheme } from '../context/ThemeContext'

const THEME_STAR = {
  starry:   0xC8D4FF,
  dark:     0xFFB899,
  wild:     0xC8E8A0,
  dusk:     0xD4AECE,
  bold:     0xAABBFF,
  forest:   0x90E8BC,
  heritage: 0xFFE88A,
  noir:     0x88CCDD,
  blossom:  0xFFD4D4,
}

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

const STAR_COUNT      = 220
const PUSH_RADIUS     = 2.2
const PUSH_FORCE      = 1.8
const STAR_LERP       = 0.04

export default function StarField() {
  const canvasRef = useRef(null)
  const mouseRef  = useRef({ x: 9999, y: 9999 })
  const { theme } = useTheme()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const starColor = THEME_STAR[theme] || THEME_STAR.dark

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(canvas.clientWidth, canvas.clientHeight)
    renderer.setClearColor(0x000000, 0)

    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(55, canvas.clientWidth / canvas.clientHeight, 0.1, 200)
    camera.position.set(0, 0, 8)
    camera.lookAt(0, 0, 0)

    const starTexture = makeStarTexture()
    const color       = new THREE.Color(starColor)

    const homeX  = new Float32Array(STAR_COUNT)
    const homeY  = new Float32Array(STAR_COUNT)
    const homeZ  = new Float32Array(STAR_COUNT)
    const liveX  = new Float32Array(STAR_COUNT)
    const liveY  = new Float32Array(STAR_COUNT)
    const liveZ  = new Float32Array(STAR_COUNT)
    const phases = new Float32Array(STAR_COUNT)
    const sizes  = new Float32Array(STAR_COUNT)
    const sprites = []

    for (let i = 0; i < STAR_COUNT; i++) {
      const hx = (Math.random() - 0.5) * 20
      const hy = (Math.random() - 0.5) * 12
      const hz = (Math.random() - 0.5) * 8 - 1
      homeX[i] = hx; homeY[i] = hy; homeZ[i] = hz
      liveX[i] = hx; liveY[i] = hy; liveZ[i] = hz
      phases[i] = Math.random() * Math.PI * 2
      sizes[i]  = 0.04 + Math.random() * 0.18

      const mat = new THREE.SpriteMaterial({
        map: starTexture,
        color,
        transparent: true,
        opacity: 0.15 + Math.random() * 0.5,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
      const sprite = new THREE.Sprite(mat)
      sprite.scale.set(sizes[i], sizes[i], 1)
      sprite.position.set(hx, hy, hz)
      scene.add(sprite)
      sprites.push({ sprite, mat, baseOpacity: mat.opacity })
    }

    // Cursor → world position via raycaster
    const cursorPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
    const raycaster   = new THREE.Raycaster()
    const cursorWorld = new THREE.Vector3()

    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      const ndcX =  ((e.clientX - rect.left) / rect.width)  * 2 - 1
      const ndcY = -((e.clientY - rect.top)  / rect.height) * 2 + 1
      raycaster.setFromCamera({ x: ndcX, y: ndcY }, camera)
      raycaster.ray.intersectPlane(cursorPlane, cursorWorld)
      mouseRef.current = { x: cursorWorld.x, y: cursorWorld.y }
    }
    window.addEventListener('mousemove', onMouseMove)

    const onResize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)

    let frameId, t = 0
    const animate = () => {
      frameId = requestAnimationFrame(animate)
      t += 0.016

      const mx = mouseRef.current.x
      const my = mouseRef.current.y

      for (let i = 0; i < STAR_COUNT; i++) {
        const hx = homeX[i], hy = homeY[i], hz = homeZ[i]
        const zWeight = Math.max(0, 1 - Math.abs(hz) / 5)
        const dx = hx - mx, dy = hy - my
        const dist = Math.sqrt(dx*dx + dy*dy) + 0.001
        let tx = hx, ty = hy, tz = hz

        if (dist < PUSH_RADIUS) {
          const push = (1 - dist / PUSH_RADIUS) * PUSH_FORCE * zWeight
          tx = hx + (dx / dist) * push
          ty = hy + (dy / dist) * push
          tz = hz + push * 0.4
        }

        tx += Math.sin(t * 0.3 + phases[i]) * 0.04
        ty += Math.cos(t * 0.25 + phases[i] * 1.3) * 0.03

        liveX[i] += (tx - liveX[i]) * STAR_LERP
        liveY[i] += (ty - liveY[i]) * STAR_LERP
        liveZ[i] += (tz - liveZ[i]) * STAR_LERP

        sprites[i].sprite.position.set(liveX[i], liveY[i], liveZ[i])

        const twinkle = 0.6 + Math.sin(t * 1.5 + phases[i]) * 0.4
        sprites[i].mat.opacity = sprites[i].baseOpacity * twinkle

        const proximity = Math.max(0, 1 - dist / PUSH_RADIUS)
        const s = sizes[i] * (1 + proximity * 0.6)
        sprites[i].sprite.scale.set(s, s, 1)
      }

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('resize', onResize)
      sprites.forEach(s => { scene.remove(s.sprite); s.mat.dispose() })
      starTexture.dispose()
      renderer.dispose()
    }
  }, [theme])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  )
}
