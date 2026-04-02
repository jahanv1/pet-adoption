import { useEffect, useState, useCallback } from 'react'
import Navbar from '../components/Navbar'
import DashboardBackground from '../components/DashboardBackground'
import StarField from '../components/StarField'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

function pad(n) {
  return n.toString().padStart(2, '0')
}

const NAV_ITEMS = ['Overview', 'Health Screening']

export default function ShelterDashboard() {
  const { user } = useAuth()
  const [animals, setAnimals]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [activeNav, setActiveNav]     = useState('Overview')

  // Modal state
  const [modalAnimal, setModalAnimal]   = useState(null)
  const [editing, setEditing]           = useState(false)
  const [editStory, setEditStory]       = useState('')
  const [editTraits, setEditTraits]     = useState('')
  const [saving, setSaving]             = useState(false)
  const [saveError, setSaveError]       = useState('')

  const openModal = (a) => {
    setModalAnimal(a)
    setEditing(false)
    setSaveError('')
  }

  const closeModal = useCallback(() => {
    setModalAnimal(null)
    setEditing(false)
    setSaveError('')
  }, [])

  const startEdit = () => {
    setEditStory(modalAnimal.story || '')
    setEditTraits((modalAnimal.traits || []).join(', '))
    setEditing(true)
    setSaveError('')
  }

  const saveEdit = async () => {
    setSaving(true)
    setSaveError('')
    try {
      const traits = editTraits.split(',').map(t => t.trim()).filter(Boolean)
      const { data } = await api.patch(`/animals/${modalAnimal.id}/profile`, {
        story: editStory,
        traits,
      })
      // Update local animals list and modal
      setAnimals(prev => prev.map(a => a.id === data.id ? data : a))
      setModalAnimal(data)
      setEditing(false)
    } catch (err) {
      setSaveError(err.response?.data?.detail || err.message)
    } finally {
      setSaving(false)
    }
  }

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') closeModal() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [closeModal])

  // Health screening state
  const [selectedPet, setSelectedPet]   = useState('')
  const [healthData, setHealthData]     = useState(null)
  const [healthLoading, setHealthLoading] = useState(false)
  const [healthError, setHealthError]   = useState('')

  useEffect(() => {
    api.get('/animals/')
      .then(({ data }) => setAnimals(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const total     = animals.length
  const available = animals.filter((a) => a.status === 'available').length
  const adopted   = animals.filter((a) => a.status === 'adopted').length
  const fostered  = animals.filter((a) => a.status === 'fostered').length

  const handleSelectPet = async (name) => {
    setSelectedPet(name)
    setHealthData(null)
    setHealthError('')
    if (!name) return
    setHealthLoading(true)
    try {
      const { data } = await api.get(`/health/by-name/${encodeURIComponent(name)}`)
      setHealthData(data)
    } catch (err) {
      setHealthError(err.response?.status === 404 ? 'No health record found for this animal.' : err.message)
    } finally {
      setHealthLoading(false)
    }
  }

  return (
    <div className="sd-page">
      <StarField />
      <DashboardBackground />
      <Navbar />

      <div className="sd-layout">

        {/* ── Left Sidebar ── */}
        <aside className="sd-sidebar">
          <div className="sd-sidebar-label">NAVIGATION</div>
          {NAV_ITEMS.map((item) => (
            <button
              key={item}
              className={`sd-nav-item ${activeNav === item ? 'active' : ''}`}
              onClick={() => setActiveNav(item)}
            >
              {item.toUpperCase()}
            </button>
          ))}
        </aside>

        {/* ── Main Content ── */}
        <main className="sd-main">

          {/* ── OVERVIEW ── */}
          {activeNav === 'Overview' && (
            <>
              {/* Hero */}
              <div className="sd-hero">
                <div className="sd-watermark" aria-hidden="true">{pad(total)}</div>
                <div className="sd-hero-inner">
                  <p className="sd-hero-tag">{user?.name} · SHELTER PORTAL</p>
                  <h1 className="sd-hero-headline">
                    <span className="sd-hero-num">{pad(total)}</span> ANIMALS<br />IN YOUR SHELTER
                  </h1>
                </div>
              </div>

              {/* Stats */}
              <div className="stats-grid">
                <div className="stat-card total">
                  <div className="stat-num">{pad(total)}</div>
                  <div className="stat-label">Total Animals</div>
                </div>
                <div className="stat-card avail">
                  <div className="stat-num" style={{ color: '#FFD700' }}>{pad(available)}</div>
                  <div className="stat-label">Available</div>
                </div>
                <div className="stat-card adopted">
                  <div className="stat-num">{pad(adopted)}</div>
                  <div className="stat-label">Adopted</div>
                </div>
                <div className="stat-card foster">
                  <div className="stat-num">{pad(fostered)}</div>
                  <div className="stat-label">Fostered</div>
                </div>
              </div>

              {/* Section heading */}
              <div className="sd-section-title">
                ALL ANIMALS
                <span className="sd-section-count">{total} TOTAL</span>
              </div>

              {loading && <div className="sd-loading">LOADING ANIMALS</div>}
              {error && <div className="alert alert-error">{error}</div>}

              {!loading && animals.length === 0 && (
                <div className="ad-empty">
                  <span className="ad-empty-num">00</span>
                  <p>No animals registered yet.</p>
                </div>
              )}

              {/* Animal flashcard grid */}
              {!loading && animals.length > 0 && (
                <div className="animals-grid">
                  {animals.map((a) => (
                    <div key={a.id} className="animal-card sd-card-clickable" onClick={() => openModal(a)}>
                      <div className="animal-card-img">
                        <img src={a.image_url} alt={a.name} />
                        <span className={`ac-badge ac-badge-${a.status}`}>{a.status}</span>
                      </div>
                      <div className="animal-card-body">
                        <div className="ac-header">
                          <div className="animal-card-name">{a.name}</div>
                          <span className="ac-gender">{a.gender === 'Male' ? 'M' : 'F'}</span>
                        </div>
                        <div className="animal-card-meta">{a.breed}</div>
                        <div className="animal-card-meta">
                          {a.dob ? `Admitted ${a.dob}` : `${a.age} ${a.age === 1 ? 'year' : 'years'} old`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── HEALTH SCREENING ── */}
          {activeNav === 'Health Screening' && (
            <div className="sd-health">
              <div className="sd-hero" style={{ marginBottom: 0 }}>
                <div className="sd-hero-inner">
                  <p className="sd-hero-tag">SHELTER PORTAL · MEDICAL</p>
                  <h1 className="sd-hero-headline">HEALTH<br />SCREENING</h1>
                </div>
              </div>

              <div className="sd-health-controls">
                <div className="sd-section-title" style={{ marginTop: '40px' }}>SELECT ANIMAL</div>
                <select
                  className="sd-select"
                  value={selectedPet}
                  onChange={(e) => handleSelectPet(e.target.value)}
                >
                  <option value="">-- Choose a pet --</option>
                  {animals.map((a) => (
                    <option key={a.id} value={a.name}>{a.name} ({a.species})</option>
                  ))}
                </select>
              </div>

              {healthLoading && <div className="sd-loading">LOADING HEALTH DATA</div>}
              {healthError && <div className="alert alert-error">{healthError}</div>}

              {healthData && (
                <div className="sd-health-panel">
                  <div className="sd-health-title">{healthData.animal_name}</div>

                  <div className="sd-health-grid">
                    <div className="sd-health-card">
                      <div className="sd-health-label">WEIGHT</div>
                      <div className="sd-health-value">{healthData.weight} <span className="sd-health-unit">kg</span></div>
                    </div>
                    <div className="sd-health-card">
                      <div className="sd-health-label">TEMPERATURE</div>
                      <div className="sd-health-value">{healthData.temperature} <span className="sd-health-unit">°C</span></div>
                    </div>
                    <div className="sd-health-card">
                      <div className="sd-health-label">LAST CHECKUP</div>
                      <div className="sd-health-value sd-health-value--sm">{healthData.last_checkup}</div>
                    </div>
                    <div className="sd-health-card">
                      <div className="sd-health-label">ATTENDING VET</div>
                      <div className="sd-health-value sd-health-value--sm">{healthData.vet_name}</div>
                    </div>
                  </div>

                  <div className="sd-section-title" style={{ marginTop: '40px' }}>VACCINATIONS</div>
                  {healthData.vaccinations.length === 0 ? (
                    <p className="sd-health-none">No vaccinations on record.</p>
                  ) : (
                    <div className="sd-vacc-table">
                      <div className="sd-vacc-row sd-vacc-header">
                        <span>VACCINE</span>
                        <span>DATE GIVEN</span>
                        <span>NEXT DUE</span>
                      </div>
                      {healthData.vaccinations.map((v, i) => (
                        <div key={i} className="sd-vacc-row">
                          <span className="sd-vacc-name">{v.name}</span>
                          <span>{v.date_given}</span>
                          <span style={{ color: '#FFD700' }}>{v.next_due}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* ── Animal Detail Modal ── */}
      {modalAnimal && (
        <div className="sd-modal-overlay" onClick={closeModal}>
          <div className="sd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sd-modal-topbar">
              {editing ? (
                <>
                  <button className="sd-modal-action-btn sd-modal-save" onClick={saveEdit} disabled={saving}>
                    {saving ? 'SAVING...' : 'SAVE'}
                  </button>
                  <button className="sd-modal-action-btn sd-modal-cancel" onClick={() => setEditing(false)} disabled={saving}>
                    CANCEL
                  </button>
                </>
              ) : (
                <button className="sd-modal-action-btn sd-modal-edit" onClick={startEdit}>
                  EDIT
                </button>
              )}
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

              {/* Personality */}
              <div className="sd-modal-section">
                <div className="sd-modal-section-label">PERSONALITY</div>
                {editing ? (
                  <input
                    className="sd-edit-input"
                    value={editTraits}
                    onChange={(e) => setEditTraits(e.target.value)}
                    placeholder="Playful, Calm, Energetic (comma-separated)"
                  />
                ) : (
                  modalAnimal.traits && modalAnimal.traits.length > 0 ? (
                    <div className="sd-modal-traits">
                      {modalAnimal.traits.map((t) => (
                        <span key={t} className="sd-modal-trait">{t}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="sd-modal-empty-field">No traits added yet.</p>
                  )
                )}
              </div>

              {/* Story */}
              <div className="sd-modal-section">
                <div className="sd-modal-section-label">THEIR STORY</div>
                {editing ? (
                  <textarea
                    className="sd-edit-textarea"
                    value={editStory}
                    onChange={(e) => setEditStory(e.target.value)}
                    placeholder="Write this animal's story..."
                    rows={6}
                  />
                ) : (
                  modalAnimal.story ? (
                    <p className="sd-modal-story">{modalAnimal.story}</p>
                  ) : (
                    <p className="sd-modal-empty-field">No story added yet.</p>
                  )
                )}
              </div>

              {saveError && <div className="alert alert-error" style={{ marginTop: '16px' }}>{saveError}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
