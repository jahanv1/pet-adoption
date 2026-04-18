import { useNavigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import HeroBackground from '../components/HeroBackground'

const MARQUEE_TEXT = 'THEY WAITED · YOU SHOWED UP · THAT\'S HOW CHANGE HAPPENS · 2,400 LIVES SAVED · 1,800 HOME AND LOVED · BE THE REASON THEY WAG AGAIN · '

const STORY_CHUNKS = [
  { text: 'Every year,',                          cls: ''       },
  { text: 'millions of animals',                  cls: 'accent' },
  { text: 'wait in shelters —',                   cls: ''       },
  { text: 'not because no one cares,',            cls: 'muted'  },
  { text: "but because the right people",         cls: 'muted'  },
  { text: "haven't found them yet.",              cls: 'muted'  },
  { text: 'PawsHome changes that.',               cls: ''       },
  { text: 'One platform. Every shelter.',         cls: 'secondary' },
  { text: 'Your forever pet.',                    cls: 'secondary' },
]

export default function Landing() {
  const navigate  = useNavigate()
  const storyRef  = useRef(null)
  const stickyRef = useRef(null)

  useEffect(() => {
    // IntersectionObserver for non-story reveals
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('reveal-in'); obs.unobserve(e.target) }
      }),
      { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
    )
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el))

    // Scroll-progress word reveal (fixed panel, JS-driven)
    const onScroll = () => {
      const section = storyRef.current
      const panel   = stickyRef.current
      if (!section || !panel) return

      const rect    = section.getBoundingClientRect()
      const h       = window.innerHeight
      const active  = rect.top <= 0 && rect.bottom > 0
      const portals = document.querySelector('.dark-portals')

      if (!active) {
        panel.style.opacity = '0'
        if (rect.bottom <= 0 && portals) portals.classList.add('portals-in')
        if (rect.top > 0  && portals) portals.classList.remove('portals-in')
        return
      }

      panel.style.opacity = '1'
      if (portals) portals.classList.remove('portals-in')

      const prog   = Math.max(0, Math.min(1, -rect.top / (section.offsetHeight - h)))
      const chunks = panel.querySelectorAll('.story-chunk')
      const n      = chunks.length

      chunks.forEach((el, i) => {
        const p = Math.max(0, Math.min(1, (prog * n - i) * 2))
        el.style.opacity = p
        el.style.filter  = `blur(${(1 - p) * 8}px)`
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => { obs.disconnect(); window.removeEventListener('scroll', onScroll) }
  }, [])

  return (
    <div className="landing-dark">

      {/* ══ Hero ══ */}
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
          <div className="hero-content">
            <h1 className="hero-heading">
              <span className="hero-line reveal" style={{ '--reveal-delay': '0ms' }}>EVERY</span>
              <span className="hero-line hero-line-accent reveal" style={{ '--reveal-delay': '80ms' }}>PAW</span>
              <span className="hero-line reveal" style={{ '--reveal-delay': '160ms' }}>DESERVES</span>
              <span className="hero-line hero-line-outline reveal" style={{ '--reveal-delay': '240ms' }}>A HOME.</span>
            </h1>
            <a href="#portals" className="hero-scroll-hint reveal" style={{ '--reveal-delay': '360ms' }}>
              <span>Explore portals</span>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 3v10M3 8l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>
        </section>
      </div>

      {/* ── Sticky scroll story — starts right after hero so words appear with paw dispersion ── */}
      <section className="dark-story-scroll" ref={storyRef}>
        <div className="dark-story-sticky" ref={stickyRef}>
          {STORY_CHUNKS.map((chunk, i) => (
            <span
              key={i}
              className={`story-chunk${chunk.cls ? ' story-chunk-' + chunk.cls : ''}`}
            >
              {chunk.text}
            </span>
          ))}
        </div>
      </section>

      {/* ── Portal cards ── */}
      <section className="dark-portals" id="portals">
        <p className="portals-label reveal" style={{ '--reveal-delay': '0ms' }}>CHOOSE YOUR PORTAL</p>
        <div className="dark-portal-cards">

          <div className="dark-card dark-card-shelter reveal" style={{ '--reveal-delay': '100ms' }} onClick={() => navigate('/shelter/login')}>
            <span className="card-num">01</span>
            <div className="card-body">
              <h2 className="dark-card-title">Shelter<br />Portal</h2>
              <p className="dark-card-desc">Manage your shelter, track animals, oversee adoptions and donations.</p>
              <button className="dark-card-btn dark-card-btn-shelter">Enter Portal →</button>
            </div>
          </div>

          <div className="dark-card dark-card-adopter reveal" style={{ '--reveal-delay': '220ms' }} onClick={() => navigate('/adopter/login')}>
            <span className="card-num">02</span>
            <div className="card-body">
              <h2 className="dark-card-title">Adopter<br />Portal</h2>
              <p className="dark-card-desc">Browse adorable animals waiting for a family exactly like yours.</p>
              <button className="dark-card-btn dark-card-btn-adopter">Enter Portal →</button>
            </div>
          </div>

        </div>
      </section>

      {/* ── Marquee ── */}
      <div className="marquee-strip">
        <div className="marquee-track">
          {[0,1,2,3,4].map(i => (
            <span key={i} className="marquee-content">{MARQUEE_TEXT}</span>
          ))}
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="dark-stats">
        {[
          { val: '2,400+', label: 'Animals Rescued' },
          { val: '48',     label: 'Partner Shelters' },
          { val: '1,800+', label: 'Happy Adoptions'  },
        ].map((s, i) => (
          <div key={s.label} className="dark-stat reveal" style={{ '--reveal-delay': `${i * 120}ms` }}>
            <div className="dark-stat-val">{s.val}</div>
            <div className="dark-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <footer className="dark-footer" />

    </div>
  )
}
