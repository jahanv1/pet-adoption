import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import DashboardBackground from '../components/DashboardBackground'
import StarField from '../components/StarField'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

const STATUS_ICONS = { available: '✅', adopted: '💜', fostered: '🌟' }
const SPECIES_EMOJI = { Dog: '🐶', Cat: '🐱', Rabbit: '🐰', Hamster: '🐹', Bird: '🐦' }

export default function ShelterDashboard() {
  const { user } = useAuth()
  const [animals, setAnimals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

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

  return (
    <div className="dashboard" style={{ position: 'relative' }}>
      <StarField />
      <DashboardBackground />
      <Navbar />
      <div className="dashboard-content">

        {/* Welcome */}
        <div className="dashboard-welcome">
          <h1>Welcome back, {user?.name}! 🏠</h1>
          <p>Here's what's happening at your shelter today.</p>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card total">
            <span className="stat-icon">🐾</span>
            <div className="stat-num">{total}</div>
            <div className="stat-label">Total Animals</div>
          </div>
          <div className="stat-card avail">
            <span className="stat-icon">✅</span>
            <div className="stat-num" style={{ color: '#4ade80' }}>{available}</div>
            <div className="stat-label">Available</div>
          </div>
          <div className="stat-card adopted">
            <span className="stat-icon">💜</span>
            <div className="stat-num" style={{ color: '#a855f7' }}>{adopted}</div>
            <div className="stat-label">Adopted</div>
          </div>
          <div className="stat-card foster">
            <span className="stat-icon">🌟</span>
            <div className="stat-num" style={{ color: 'var(--secondary)' }}>{fostered}</div>
            <div className="stat-label">Fostered</div>
          </div>
        </div>

        {/* Recent animals table */}
        <div className="section-title">
          <span>🐾</span> All Animals
          <span style={{
            marginLeft: 'auto',
            fontSize: '0.85rem',
            fontFamily: 'Nunito, sans-serif',
            color: 'var(--text-muted)',
            fontWeight: 600,
          }}>
            {total} animals total
          </span>
        </div>

        {loading && (
          <div className="loading-screen">
            <div className="loading-paw">🐾</div>
            <span>Loading animals…</span>
          </div>
        )}

        {error && <div className="alert alert-error">⚠️ {error}</div>}

        {!loading && !error && animals.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🏠</div>
            <h3>No animals yet</h3>
            <p>Your shelter doesn't have any animals registered yet.</p>
          </div>
        )}

        {!loading && animals.length > 0 && (
          <div className="animals-table-wrap">
            <table className="animals-table">
              <thead>
                <tr>
                  <th>Animal</th>
                  <th>Species</th>
                  <th>Breed</th>
                  <th>Age</th>
                  <th>Gender</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {animals.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="animal-emoji">{a.image_emoji || '🐾'}</span>
                        <div>
                          <div className="animal-name">{a.name}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span>{SPECIES_EMOJI[a.species] || '🐾'} {a.species}</span>
                    </td>
                    <td>
                      <span className="animal-breed">{a.breed}</span>
                    </td>
                    <td>{a.age} {a.age === 1 ? 'yr' : 'yrs'}</td>
                    <td>{a.gender === 'Male' ? '♂ Male' : '♀ Female'}</td>
                    <td>
                      <span className={`badge badge-${a.status}`}>
                        {STATUS_ICONS[a.status]} {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Species breakdown */}
        {!loading && animals.length > 0 && (
          <>
            <div className="divider" />
            <div className="section-title"><span>📊</span> Species Breakdown</div>
            <div className="stats-grid">
              {Object.entries(
                animals.reduce((acc, a) => {
                  acc[a.species] = (acc[a.species] || 0) + 1
                  return acc
                }, {})
              ).map(([species, count]) => (
                <div key={species} className="stat-card total">
                  <span className="stat-icon">{SPECIES_EMOJI[species] || '🐾'}</span>
                  <div className="stat-num">{count}</div>
                  <div className="stat-label">{species}s</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
