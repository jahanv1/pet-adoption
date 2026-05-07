import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import AnimalCard from '../components/AnimalCard'
import DashboardBackground from '../components/DashboardBackground'
import StarField from '../components/StarField'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

const SPECIES_FILTERS = ['All', 'Dog', 'Cat', 'Rabbit', 'Hamster', 'Bird']
const FAV_KEY = 'paws_favourites'

function pad(n) { return n.toString().padStart(2, '0') }
function loadFavourites() {
  try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]') } catch { return [] }
}
function saveFavourites(ids) { localStorage.setItem(FAV_KEY, JSON.stringify(ids)) }

const STATUS_COLOR = { pending: '#F4C542', approved: '#52B788', rejected: '#E07070' }

export default function AdopterDashboard() {
  const { user } = useAuth()
  const [animals, setAnimals]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [filter, setFilter]           = useState('All')
  const [search, setSearch]           = useState('')
  const [modalAnimal, setModalAnimal] = useState(null)
  const [favourites, setFavourites]   = useState(loadFavourites)
  const navigate = useNavigate()

  // Adoption request form (Browse modal)
  const [requestForm, setRequestForm]       = useState({ message: '' })
  const [requestOpen, setRequestOpen]       = useState(false)
  const [requestSaving, setRequestSaving]   = useState(false)
  const [requestSuccess, setRequestSuccess] = useState('')
  const [requestError, setRequestError]     = useState('')

  // Health for Browse modal
  const [healthData, setHealthData]       = useState(null)
  const [healthLoading, setHealthLoading] = useState(false)
  const [healthError, setHealthError]     = useState('')

  // Load all available animals
  useEffect(() => {
    api.get('/animals/?status=available')
      .then(({ data }) => setAnimals(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // Fetch health for Browse modal
  useEffect(() => {
    if (!modalAnimal) { setHealthData(null); setHealthError(''); return }
    setHealthLoading(true)
    setHealthError('')
    setHealthData(null)
    api.get(`/health/by-name/${encodeURIComponent(modalAnimal.name)}`)
      .then(({ data }) => setHealthData(data))
      .catch(() => setHealthError('no-record'))
      .finally(() => setHealthLoading(false))
  }, [modalAnimal])

  const closeModal = useCallback(() => {
    setModalAnimal(null)
    setRequestOpen(false)
    setRequestForm({ message: '' })
    setRequestSuccess('')
    setRequestError('')
  }, [])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') closeModal() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [closeModal])

  const toggleFavourite = useCallback((e, animalId) => {
    e.stopPropagation()
    setFavourites(prev => {
      const next = prev.includes(animalId)
        ? prev.filter(id => id !== animalId)
        : [...prev, animalId]
      saveFavourites(next)
      return next
    })
  }, [])

  const displayed = animals.filter((a) => {
    const matchSpecies = filter === 'All' || (a.species || '').toLowerCase() === filter.toLowerCase()
    const matchSearch  = !search || a.name.toLowerCase().includes(search.toLowerCase()) ||
                         (a.breed || '').toLowerCase().includes(search.toLowerCase())
    return matchSpecies && matchSearch
  })

  const handleAdoptionRequest = async (e) => {
    e.preventDefault()
    if (!user) { setRequestError('You must be logged in.'); return }
    setRequestSaving(true)
    setRequestError('')
    setRequestSuccess('')
    try {
      const adopterId   = user.adopterId || user.id || ''
      const adopterName = user.name || ''
      await api.post('/adoption/', {
        animal_id:    modalAnimal.id,
        animal_name:  modalAnimal.name,
        adopt_id:     adopterId,
        adopter_name: adopterName,
        shelter_id:   modalAnimal.shelter_id,
        message:      requestForm.message,
      })
      setRequestSuccess('Request submitted! The shelter will review it soon.')
      setRequestOpen(false)
      setRequestForm({ message: '' })
    } catch (err) {
      setRequestError(err.message)
    } finally {
      setRequestSaving(false)
    }
  }

  return (
    <div className="ad-page" style={{ position: 'relative' }}>
      <StarField />
      <DashboardBackground />
      <Navbar />

      {/* Hero */}
      <div className="ad-hero">
        <div className="geo geo-c1" />
        <div className="geo geo-c2" />
        <div className="geo geo-tri" />
        <div className="ad-watermark" aria-hidden="true">{pad(displayed.length)}</div>
        <div className="ad-hero-inner">
          <p className="ad-hero-tag">{user?.name} · ADOPTER PORTAL</p>
          <h1 className="ad-hero-headline">
            <span className="ad-hero-num">{pad(animals.length)}</span>
            {' '}ANIMALS<br />WAITING FOR A HOME
          </h1>
        </div>
      </div>

      {/* Controls */}
      <div className="ad-controls">
        <div className="ad-filter-row" style={{ marginBottom: '12px' }}>
          <span className="ad-filter-item">
            <button className="ad-filter-btn active">BROWSE</button>
          </span>
          <span className="ad-filter-item">
            <span className="ad-slash" aria-hidden="true"> \ </span>
            <button className="ad-filter-btn" onClick={() => navigate('/adopter/adoptions')}>
              MY ADOPTIONS
            </button>
          </span>
        </div>

        <input
          className="ad-search"
          type="text"
          placeholder="SEARCH ANIMALS"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="ad-filter-row">
          {SPECIES_FILTERS.map((f, i) => (
            <span key={f} className="ad-filter-item">
              <button
                className={`ad-filter-btn ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f.toUpperCase()}
              </button>
              {i < SPECIES_FILTERS.length - 1 && (
                <span className="ad-slash" aria-hidden="true"> \ </span>
              )}
            </span>
          ))}
          {(filter !== 'All' || search) && (
            <span className="ad-filter-item">
              <span className="ad-slash" aria-hidden="true"> \ </span>
              <button className="ad-filter-btn ad-clear" onClick={() => { setFilter('All'); setSearch('') }}>
                CLEAR
              </button>
            </span>
          )}
        </div>
      </div>

      {/* ── BROWSE ── */}
      <div className="ad-grid-section">
          {loading && <div className="ad-loading">LOADING ANIMALS</div>}
          {error && <div className="alert alert-error">{error}</div>}
          {!loading && !error && displayed.length === 0 && (
            <div className="ad-empty">
              <span className="ad-empty-num">00</span>
              <p>{search ? `No results for "${search}"` : `No ${filter !== 'All' ? filter + 's' : 'animals'} available`}</p>
            </div>
          )}
          {!loading && displayed.length > 0 && (
            <div className="animals-grid">
              {displayed.map((animal) => (
                <div key={animal.id} style={{ position: 'relative' }}>
                  <div className="sd-card-clickable" onClick={() => setModalAnimal(animal)}>
                    <AnimalCard animal={animal} />
                  </div>
                  <button
                    className={`ad-fav-btn ${favourites.includes(animal.id) ? 'ad-fav-btn--active' : ''}`}
                    onClick={(e) => toggleFavourite(e, animal.id)}
                    title={favourites.includes(animal.id) ? 'Remove from favourites' : 'Add to favourites'}
                  >
                    {favourites.includes(animal.id) ? '❤' : '♡'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CTA */}
      {!loading && animals.length > 0 && (
        <div className="adopt-cta">
          <h3>Ready to adopt?</h3>
          <p>Browse an animal and click "Request Adoption" to start the process. Every adoption saves a life.</p>
        </div>
      )}

      {/* ── Animal Detail Modal (Browse) ── */}
      {modalAnimal && (
        <div className="sd-modal-overlay" onClick={closeModal}>
          <div className="sd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sd-modal-topbar">
              <button className="sd-modal-close" onClick={closeModal}>CLOSE</button>
            </div>

            <div className="sd-modal-photo">
              <img src={modalAnimal.image_url} alt={modalAnimal.name} />
              <span className={`ac-badge ac-badge-${modalAnimal.status} sd-modal-badge`}>
                {modalAnimal.status}
              </span>
            </div>

            <div className="sd-modal-body">
              <div className="sd-modal-header">
                <h2 className="sd-modal-name">{modalAnimal.name}</h2>
                <span className="sd-modal-gender">{modalAnimal.gender === 'Male' ? 'M' : 'F'}</span>
              </div>

              <div className="sd-modal-meta-row">
                <div className="sd-modal-meta-item">
                  <span className="sd-modal-meta-label">SPECIES</span>
                  <span className="sd-modal-meta-val">{modalAnimal.species}</span>
                </div>
                <div className="sd-modal-meta-item">
                  <span className="sd-modal-meta-label">BREED</span>
                  <span className="sd-modal-meta-val">{modalAnimal.breed}</span>
                </div>
                <div className="sd-modal-meta-item">
                  <span className="sd-modal-meta-label">AGE</span>
                  <span className="sd-modal-meta-val">{modalAnimal.age} {modalAnimal.age === 1 ? 'yr' : 'yrs'}</span>
                </div>
                <div className="sd-modal-meta-item">
                  <span className="sd-modal-meta-label">GENDER</span>
                  <span className="sd-modal-meta-val">{modalAnimal.gender}</span>
                </div>
                {modalAnimal.dob && (
                  <div className="sd-modal-meta-item">
                    <span className="sd-modal-meta-label">DATE ADMITTED</span>
                    <span className="sd-modal-meta-val">{modalAnimal.dob}</span>
                  </div>
                )}
              </div>

              {modalAnimal.traits && modalAnimal.traits.length > 0 && (
                <div className="sd-modal-section">
                  <div className="sd-modal-section-label">PERSONALITY</div>
                  <div className="sd-modal-traits">
                    {modalAnimal.traits.map((t) => (
                      <span key={t} className="sd-modal-trait">{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {modalAnimal.story && (
                <div className="sd-modal-section">
                  <div className="sd-modal-section-label">THEIR STORY</div>
                  <p className="sd-modal-story">{modalAnimal.story}</p>
                </div>
              )}

              <div className="sd-modal-section">
                <div className="sd-modal-section-label">HEALTH &amp; VACCINATIONS</div>
                {healthLoading && <p className="sd-health-none" style={{ marginTop: '8px' }}>Loading health records...</p>}
                {healthError === 'no-record' && !healthLoading && (
                  <p className="sd-health-none" style={{ marginTop: '8px' }}>No health record on file.</p>
                )}
                {healthData && !healthLoading && (
                  <div className="ad-health-panel">
                    <div className="ad-health-grid">
                      <div className="ad-health-item">
                        <span className="sd-health-label">WEIGHT</span>
                        <span className="ad-health-val">{healthData.weight ?? '—'} <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>kg</span></span>
                      </div>
                      <div className="ad-health-item">
                        <span className="sd-health-label">TEMPERATURE</span>
                        <span className="ad-health-val">{healthData.temperature ?? '—'} <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>°C</span></span>
                      </div>
                      <div className="ad-health-item">
                        <span className="sd-health-label">LAST CHECKUP</span>
                        <span className="ad-health-val" style={{ fontSize: '0.9rem' }}>{healthData.last_checkup || '—'}</span>
                      </div>
                      <div className="ad-health-item">
                        <span className="sd-health-label">VET</span>
                        <span className="ad-health-val" style={{ fontSize: '0.9rem' }}>{healthData.vet_name || '—'}</span>
                      </div>
                    </div>
                    {Array.isArray(healthData.vaccinations) && healthData.vaccinations.length > 0 && (
                      <>
                        <div className="sd-modal-section-label" style={{ marginTop: '16px', marginBottom: '8px' }}>VACCINATIONS</div>
                        <div className="sd-vacc-table">
                          <div className="sd-vacc-row sd-vacc-header">
                            <span>VACCINE</span><span>DATE GIVEN</span><span>NEXT DUE</span>
                          </div>
                          {healthData.vaccinations.map((v, i) => (
                            <div key={i} className="sd-vacc-row">
                              <span className="sd-vacc-name">{typeof v === 'string' ? v : v.name}</span>
                              <span>{typeof v === 'string' ? '' : v.date_given}</span>
                              <span style={{ color: 'var(--primary)' }}>{typeof v === 'string' ? '' : v.next_due}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                    {Array.isArray(healthData.vaccinations) && healthData.vaccinations.length === 0 && (
                      <p className="sd-health-none" style={{ marginTop: '8px' }}>No vaccinations on record.</p>
                    )}
                  </div>
                )}
              </div>

              {modalAnimal.status === 'available' && (
                <div className="sd-modal-section" style={{ marginTop: '24px' }}>
                  {requestSuccess && (
                    <div className="alert alert-success" style={{ marginBottom: '12px' }}>{requestSuccess}</div>
                  )}
                  {!requestOpen && !requestSuccess && (
                    <button
                      className="sd-modal-action-btn sd-modal-save"
                      style={{ width: '100%', padding: '14px', fontSize: '0.85rem', letterSpacing: '0.1em' }}
                      onClick={() => { setRequestOpen(true); setRequestError('') }}
                    >
                      REQUEST ADOPTION
                    </button>
                  )}
                  {requestOpen && (
                    <form className="ad-request-form" onSubmit={handleAdoptionRequest}>
                      <label className="sd-add-label">YOUR MESSAGE TO THE SHELTER</label>
                      <textarea
                        className="ad-request-textarea"
                        placeholder="Tell the shelter a little about yourself and why you'd like to adopt this animal..."
                        value={requestForm.message}
                        onChange={(e) => setRequestForm({ message: e.target.value })}
                        rows={4}
                      />
                      {requestError && <div className="alert alert-error" style={{ marginTop: '8px' }}>{requestError}</div>}
                      <div className="sd-add-actions" style={{ marginTop: '12px' }}>
                        <button type="submit" className="sd-modal-action-btn sd-modal-save" disabled={requestSaving}>
                          {requestSaving ? 'SENDING...' : 'SUBMIT REQUEST'}
                        </button>
                        <button
                          type="button"
                          className="sd-modal-action-btn sd-modal-cancel"
                          onClick={() => { setRequestOpen(false); setRequestError('') }}
                          disabled={requestSaving}
                        >
                          CANCEL
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
