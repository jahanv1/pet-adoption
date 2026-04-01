import { useEffect, useState } from 'react'
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

  useEffect(() => {
    api.get('/animals/?status=available')
      .then(({ data }) => {
        console.log('[AdopterDashboard] sample animal:', data[0])
        setAnimals(data)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

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
              <AnimalCard key={animal.id} animal={animal} />
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
    </div>
  )
}
