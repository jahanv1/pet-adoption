import { useNavigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import HeroBackground from '../components/HeroBackground'

const MARQUEE_TEXT = 'ADOPT · RESCUE · LOVE · REPEAT · FIND YOUR FOREVER · '

export default function Landing() {
  const navigate = useNavigate()

  // Parallax refs
  const heroContentRef   = useRef(null)
  const cardNumRefs      = useRef([])
  const portalsLabelRef  = useRef(null)
  const statValsRef      = useRef([])
  const cardTitleRefs    = useRef([])

  useEffect(() => {
    let raf
    const mid = () => window.innerHeight / 2

    const tick = () => {
      const sy = window.scrollY

      // ── Hero text lags behind scroll — feels deeper than the canvas
      if (heroContentRef.current) {
        heroContentRef.current.style.transform = `translateY(${sy * 0.38}px)`
      }

      // ── Card numbers drift at a slower rate than card titles
      cardNumRefs.current.forEach((el) => {
        if (!el) return
        const offset = (el.getBoundingClientRect().top - mid()) * -0.18
        el.style.transform = `translateY(${offset}px)`
      })

      // ── Card titles move slightly faster than the numbers
      cardTitleRefs.current.forEach((el) => {
        if (!el) return
        const offset = (el.getBoundingClientRect().top - mid()) * -0.07
        el.style.transform = `translateY(${offset}px)`
      })

      // ── Portals label floats in from slightly further back
      if (portalsLabelRef.current) {
        const offset = (portalsLabelRef.current.getBoundingClientRect().top - mid()) * 0.12
        portalsLabelRef.current.style.transform = `translateY(${offset}px)`
      }

      // ── Stat values move at a different rate than their labels
      statValsRef.current.forEach((el) => {
        if (!el) return
        const offset = (el.getBoundingClientRect().top - mid()) * -0.14
        el.style.transform = `translateY(${offset}px)`
      })

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="landing-dark">

      {/* ══ First viewport ══ */}
      <div className="hero-viewport" style={{ position: 'relative' }}>
        <HeroBackground />

        <div className="racing-stripe" />

        <header className="dark-nav">
          <div className="dark-logo">
            <svg viewBox="0 0 100 100" width="24" height="24" aria-hidden="true" style={{ color: 'var(--primary)' }}>
              <ellipse cx="50" cy="67" rx="24" ry="20" fill="currentColor"/>
              <ellipse cx="26" cy="46" rx="11" ry="14" fill="currentColor"/>
              <ellipse cx="74" cy="46" rx="11" ry="14" fill="currentColor"/>
              <ellipse cx="38" cy="30" rx="10" ry="13" fill="currentColor"/>
              <ellipse cx="62" cy="30" rx="10" ry="13" fill="currentColor"/>
            </svg>
            PawsHome
          </div>
        </header>

        <section className="dark-hero">
          {/* This ref makes the entire hero block lag behind scroll */}
          <div className="hero-content" ref={heroContentRef}>
            <h1 className="hero-heading">
              <span className="hero-line">EVERY</span>
              <span className="hero-line hero-line-accent">PAW</span>
              <span className="hero-line">DESERVES</span>
              <span className="hero-line hero-line-outline">A HOME.</span>
            </h1>
            <a href="#portals" className="hero-scroll-hint">
              <span>Explore portals</span>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 3v10M3 8l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>
        </section>

        <div className="marquee-strip">
          <div className="marquee-track">
            {[0, 1, 2, 3, 4].map(i => (
              <span key={i} className="marquee-content">{MARQUEE_TEXT}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Portal cards ── */}
      <section className="dark-portals" id="portals">
        <p className="portals-label" ref={portalsLabelRef}>CHOOSE YOUR PORTAL</p>
        <div className="dark-portal-cards">

          <div className="dark-card dark-card-shelter" onClick={() => navigate('/shelter/login')}>
            <span className="card-num" ref={el => cardNumRefs.current[0] = el}>01</span>
            <div className="card-body">
              <h2 className="dark-card-title" ref={el => cardTitleRefs.current[0] = el}>
                Shelter<br />Portal
              </h2>
              <p className="dark-card-desc">
                Manage your shelter, track animals, oversee adoptions and donations.
              </p>
              <button className="dark-card-btn dark-card-btn-shelter">Enter Portal →</button>
            </div>
          </div>

          <div className="dark-card dark-card-adopter" onClick={() => navigate('/adopter/login')}>
            <span className="card-num" ref={el => cardNumRefs.current[1] = el}>02</span>
            <div className="card-body">
              <h2 className="dark-card-title" ref={el => cardTitleRefs.current[1] = el}>
                Adopter<br />Portal
              </h2>
              <p className="dark-card-desc">
                Browse adorable animals waiting for a family exactly like yours.
              </p>
              <button className="dark-card-btn dark-card-btn-adopter">Enter Portal →</button>
            </div>
          </div>

        </div>
      </section>

      {/* Stats */}
      <div className="dark-stats">
        {[
          { val: '2,400+', label: 'Animals Rescued' },
          { val: '48',     label: 'Partner Shelters' },
          { val: '1,800+', label: 'Happy Adoptions'  },
        ].map((s, i) => (
          <div key={s.label} className="dark-stat">
            <div className="dark-stat-val" ref={el => statValsRef.current[i] = el}>{s.val}</div>
            <div className="dark-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <footer className="dark-footer" />

    </div>
  )
}
