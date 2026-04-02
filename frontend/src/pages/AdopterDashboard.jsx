import { useEffect, useState, useCallback } from 'react'
import Navbar from '../components/Navbar'
import AnimalCard from '../components/AnimalCard'
import DashboardBackground from '../components/DashboardBackground'
import StarField from '../components/StarField'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

const FILTERS = ['All', 'Dog', 'Cat', 'Rabbit', 'Hamster', 'Bird']

function pad(n) {
  return n.toString().padStart(2, '0')
}

export default function AdopterDashboard() {
  const { user } = useAuth()
  const [animals, setAnimals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [filter,  setFilter]  = useState('All')
  const [search,  setSearch]  = useState('')
  const [modalAnimal, setModalAnimal] = useState(null)

  useEffect(() => {
    api.get('/animals/?status=available')
      .then(({ data }) => setAnimals(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const closeModal = useCallback(() => setModalAnimal(null), [])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') closeModal() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [closeModal])

  const displayed = animals.filter((a) => {
    const matchSpecies = filter === 'All' || a.species === filter
    const matchSearch  = !search || a.name.toLowerCase().includes(search.toLowerCase()) ||
                         a.breed.toLowerCase().includes(search.toLowerCase())
    return matchSpecies && matchSearch
  })

  return (
    <div className="ad-page" style={{ position: 'relative' }}>
      <StarField />
      <DashboardBackground />
      <Navbar />

      {/* Hero header */}
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
        <input
          className="ad-search"
          type="text"
          placeholder="SEARCH ANIMALS"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="ad-filter-row">
          {FILTERS.map((f, i) => (
            <span key={f} className="ad-filter-item">
              <button
                className={`ad-filter-btn ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f.toUpperCase()}
              </button>
              {i < FILTERS.length - 1 && (
                <span className="ad-slash" aria-hidden="true"> \ </span>
              )}
            </span>
          ))}
          {(filter !== 'All' || search) && (
            <span className="ad-filter-item">
              <span className="ad-slash" aria-hidden="true"> \ </span>
              <button
                className="ad-filter-btn ad-clear"
                onClick={() => { setFilter('All'); setSearch('') }}
              >
                CLEAR
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Content */}
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
              <div key={animal.id} className="sd-card-clickable" onClick={() => setModalAnimal(animal)}>
                <AnimalCard animal={animal} />
              </div>
            ))}
          </div>
        )}
      </div>

      {!loading && animals.length > 0 && (
        <div className="adopt-cta">
          <h3>Ready to adopt?</h3>
          <p>Contact your local shelter to start the adoption process. Every adoption saves a life.</p>
        </div>
      )}

      {/* ── Animal Detail Modal (read-only) ── */}
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
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
