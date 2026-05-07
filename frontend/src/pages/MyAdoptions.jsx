import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import DashboardBackground from '../components/DashboardBackground'
import StarField from '../components/StarField'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

const STATUS_COLOR = { pending: '#F4C542', approved: '#52B788', rejected: '#E07070' }

function pad(n) { return String(n).padStart(2, '0') }

export default function MyAdoptions() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [adoptionCards, setAdoptionCards]   = useState([])
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState('')

  const [healthModal, setHealthModal]       = useState(null) // animal name string
  const [healthData, setHealthData]         = useState(null)
  const [healthLoading, setHealthLoading]   = useState(false)
  const [healthError, setHealthError]       = useState('')

  const counts = {
    pending:  adoptionCards.filter(c => c.status === 'pending').length,
    approved: adoptionCards.filter(c => c.status === 'approved').length,
    rejected: adoptionCards.filter(c => c.status === 'rejected').length,
  }

  useEffect(() => {
    const adopterId = user?.adopterId || user?.id
    if (!adopterId) return
    setLoading(true)
    api.get(`/adoption/my?adopter_id=${adopterId}`)
      .then(async ({ data }) => {
        const cards = await Promise.all(
          data.map(async (req) => {
            try {
              const { data: animal } = await api.get(`/animals/${req.animal_id}`)
              return { ...req, animal }
            } catch {
              return { ...req, animal: null }
            }
          })
        )
        setAdoptionCards(cards)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [user])

  useEffect(() => {
    if (!healthModal) { setHealthData(null); setHealthError(''); return }
    setHealthLoading(true)
    setHealthData(null)
    setHealthError('')
    api.get(`/health/by-name/${encodeURIComponent(healthModal)}`)
      .then(({ data }) => setHealthData(data))
      .catch(() => setHealthError('no-record'))
      .finally(() => setHealthLoading(false))
  }, [healthModal])

  const closeHealthModal = useCallback(() => setHealthModal(null), [])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') closeHealthModal() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [closeHealthModal])

  return (
    <div className="ad-page" style={{ position: 'relative' }}>
      <StarField />
      <DashboardBackground />
      <Navbar />

      {/* Header */}
      <div className="ma-header">
        <div className="geo geo-c1" />
        <div className="geo geo-c2" />
        <button className="ma-back-btn" onClick={() => navigate('/adopter/dashboard')}>
          ← BACK TO BROWSE
        </button>
        <div className="ma-header-inner">
          <p className="ad-hero-tag">{user?.name} · ADOPTER PORTAL</p>
          <h1 className="ad-hero-headline">
            <span className="ad-hero-num">{pad(adoptionCards.length)}</span>
            {' '}MY<br />ADOPTIONS
          </h1>
        </div>
      </div>

      {loading && <div className="ad-loading">LOADING YOUR ADOPTIONS</div>}
      {error && <div className="alert alert-error" style={{ margin: '0 48px' }}>{error}</div>}

      {!loading && (
        <>
          {/* Stats */}
          <div className="ad-adoption-stats">
            <div className="stat-card stat-card-sharp ad-adopt-stat">
              <span className="stat-num" style={{ color: 'var(--primary)' }}>{pad(counts.pending)}</span>
              <span className="stat-label">PENDING</span>
            </div>
            <div className="stat-card stat-card-sharp ad-adopt-stat">
              <span className="stat-num" style={{ color: '#52B788' }}>{pad(counts.approved)}</span>
              <span className="stat-label">APPROVED</span>
            </div>
            <div className="stat-card stat-card-sharp ad-adopt-stat">
              <span className="stat-num" style={{ color: '#E07070' }}>{pad(counts.rejected)}</span>
              <span className="stat-label">REJECTED</span>
            </div>
          </div>

          {adoptionCards.length === 0 && !error && (
            <div className="ad-empty" style={{ marginTop: '48px' }}>
              <span className="ad-empty-num">00</span>
              <p>No adoption requests yet. Browse animals and submit a request!</p>
            </div>
          )}

          {adoptionCards.length > 0 && (
            <div className="ad-status-grid">
              {adoptionCards.map(card => {
                const animal = card.animal
                const sc = STATUS_COLOR[card.status] || '#aaa'
                return (
                  <div key={card.id} className="ad-status-card">
                    <div className="ad-status-card-img">
                      {animal?.image_url
                        ? <img src={animal.image_url} alt={card.animal_name} />
                        : <span className="ad-status-card-emoji">{animal?.image_emoji || '🐾'}</span>
                      }
                      <span className="ad-status-badge" style={{ background: sc }}>
                        {card.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="ad-status-card-body">
                      <div className="ad-status-card-name">{card.animal_name}</div>

                      {animal && (
                        <div className="ad-status-card-meta">
                          {animal.species && <span>{animal.species}</span>}
                          {animal.breed   && <><span className="ad-status-sep">·</span><span>{animal.breed}</span></>}
                          {animal.age != null && <><span className="ad-status-sep">·</span><span>{animal.age} {animal.age === 1 ? 'yr' : 'yrs'}</span></>}
                          {animal.gender  && <><span className="ad-status-sep">·</span><span>{animal.gender}</span></>}
                        </div>
                      )}

                      <div className="ad-status-card-date">
                        {card.created_at
                          ? new Date(card.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                          : ''}
                      </div>

                      {card.message && (
                        <div className="ad-status-card-msg">
                          <span className="sd-meta-label">YOUR MESSAGE</span>
                          <p>{card.message}</p>
                        </div>
                      )}

                      {card.status === 'approved' && (
                        <button
                          className="ad-status-health-btn"
                          onClick={() => setHealthModal(card.animal_name)}
                        >
                          VIEW HEALTH RECORD
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Health Record Modal */}
      {healthModal && (
        <div className="sd-modal-overlay" onClick={closeHealthModal}>
          <div className="sd-modal ma-health-modal" onClick={e => e.stopPropagation()}>
            <div className="sd-modal-topbar">
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', letterSpacing: '0.1em' }}>
                MEDICAL RECORD — {healthModal.toUpperCase()}
              </span>
              <button className="sd-modal-close" onClick={closeHealthModal}>CLOSE</button>
            </div>

            <div className="sd-modal-body">
              {healthLoading && <p className="sd-health-none">Loading health records...</p>}
              {healthError === 'no-record' && !healthLoading && (
                <p className="sd-health-none">No health record on file for this animal.</p>
              )}

              {healthData && !healthLoading && (
                <>
                  {/* Most recent visit card */}
                  <div className="ma-visit-card">
                    <div className="ma-visit-header">
                      <div>
                        <div className="ma-visit-label">MOST RECENT VISIT</div>
                        <div className="ma-visit-date">{healthData.last_checkup || '—'}</div>
                      </div>
                      <div className="ma-visit-vet">
                        <div className="ma-visit-label">ATTENDING VET</div>
                        <div className="ma-visit-vet-name">{healthData.vet_name || '—'}</div>
                      </div>
                    </div>

                    <div className="ma-visit-vitals">
                      <div className="ma-vital">
                        <span className="ma-vital-label">WEIGHT</span>
                        <span className="ma-vital-val">
                          {healthData.weight ?? '—'}
                          <span className="ma-vital-unit">kg</span>
                        </span>
                      </div>
                      <div className="ma-vital-divider" />
                      <div className="ma-vital">
                        <span className="ma-vital-label">TEMPERATURE</span>
                        <span className="ma-vital-val">
                          {healthData.temperature ?? '—'}
                          <span className="ma-vital-unit">°C</span>
                        </span>
                      </div>
                      <div className="ma-vital-divider" />
                      <div className="ma-vital">
                        <span className="ma-vital-label">STATUS</span>
                        <span className="ma-vital-val" style={{ color: '#52B788', fontSize: '0.9rem' }}>
                          {healthData.weight && healthData.temperature ? 'EXAMINED' : 'ON FILE'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Vaccination history as a timeline */}
                  <div className="ma-section-label">VACCINATION HISTORY</div>

                  {Array.isArray(healthData.vaccinations) && healthData.vaccinations.length === 0 && (
                    <p className="sd-health-none" style={{ marginTop: '8px' }}>No vaccinations on record.</p>
                  )}

                  {Array.isArray(healthData.vaccinations) && healthData.vaccinations.length > 0 && (
                    <div className="ma-vacc-timeline">
                      {[...healthData.vaccinations]
                        .sort((a, b) => {
                          const da = typeof a === 'string' ? '' : a.date_given || ''
                          const db = typeof b === 'string' ? '' : b.date_given || ''
                          return db.localeCompare(da)
                        })
                        .map((v, i) => {
                          const name     = typeof v === 'string' ? v : v.name
                          const given    = typeof v === 'string' ? '' : v.date_given
                          const nextDue  = typeof v === 'string' ? '' : v.next_due
                          const isOverdue = nextDue && new Date(nextDue.split('-').reverse().join('-')) < new Date()
                          return (
                            <div key={i} className="ma-vacc-entry">
                              <div className="ma-vacc-dot" style={{ background: isOverdue ? '#E07070' : '#52B788' }} />
                              <div className="ma-vacc-content">
                                <div className="ma-vacc-name">{name}</div>
                                <div className="ma-vacc-dates">
                                  {given && <span>Given: <strong>{given}</strong></span>}
                                  {nextDue && (
                                    <span style={{ color: isOverdue ? '#E07070' : 'var(--text-muted)' }}>
                                      Next due: <strong>{nextDue}</strong>
                                      {isOverdue && <span className="ma-overdue-tag">OVERDUE</span>}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
