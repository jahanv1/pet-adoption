import { useNavigate } from 'react-router-dom'
import HeroBackground from '../components/HeroBackground'

const MARQUEE_TEXT = 'ADOPT · RESCUE · LOVE · REPEAT · FIND YOUR FOREVER · '

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="landing-dark">

      {/* ══ First viewport — everything inside 100vh ══ */}
      <div className="hero-viewport" style={{ position: 'relative' }}>
        <HeroBackground />

        {/* Racing stripe */}
        <div className="racing-stripe" />

        {/* Nav */}
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

        {/* Hero text */}
        <section className="dark-hero">
          <div className="hero-content">
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

        {/* Marquee — bottom of viewport */}
        <div className="marquee-strip">
          <div className="marquee-track">
            {[0, 1, 2, 3, 4].map(i => (
              <span key={i} className="marquee-content">{MARQUEE_TEXT}</span>
            ))}
          </div>
        </div>

      </div>
      {/* ══ End first viewport ══ */}

      {/* ── Portal cards (below fold) ── */}
      <section className="dark-portals" id="portals">
        <p className="portals-label">CHOOSE YOUR PORTAL</p>
        <div className="dark-portal-cards">

          <div className="dark-card dark-card-shelter" onClick={() => navigate('/shelter/login')}>
            <span className="card-num">01</span>
            <div className="card-body">
              <h2 className="dark-card-title">Shelter<br />Portal</h2>
              <p className="dark-card-desc">
                Manage your shelter, track animals, oversee adoptions and donations.
              </p>
              <button className="dark-card-btn dark-card-btn-shelter">Enter Portal →</button>
            </div>
          </div>

          <div className="dark-card dark-card-adopter" onClick={() => navigate('/adopter/login')}>
            <span className="card-num">02</span>
            <div className="card-body">
              <h2 className="dark-card-title">Adopter<br />Portal</h2>
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
        ].map(s => (
          <div key={s.label} className="dark-stat">
            <div className="dark-stat-val">{s.val}</div>
            <div className="dark-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="dark-footer">
        <span className="dark-footer-copy">© 2024 PawsHome · Every pet deserves love</span>
      </footer>

    </div>
  )
}
