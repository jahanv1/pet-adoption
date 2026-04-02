import { useEffect, useState, useCallback, useRef } from 'react'
import Navbar from '../components/Navbar'
import DashboardBackground from '../components/DashboardBackground'
import StarField from '../components/StarField'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

function pad(n) {
  return n.toString().padStart(2, '0')
}

const NAV_ITEMS = ['Overview', 'Health Screening']

const BLANK_FORM = {
  name: '', species: 'Dog', breed: '', age: '', gender: 'Male',
  dob: '', story: '', traits: '', status: 'available', image_url: '',
}

export default function ShelterDashboard() {
  const { user } = useAuth()
  const [animals, setAnimals]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [activeNav, setActiveNav]     = useState('Overview')

  // Detail modal state
  const [modalAnimal, setModalAnimal]   = useState(null)
  const [editing, setEditing]           = useState(false)
  const [editStory, setEditStory]       = useState('')
  const [editTraits, setEditTraits]     = useState('')
  const [editStatus, setEditStatus]     = useState('')
  const [saving, setSaving]             = useState(false)
  const [saveError, setSaveError]       = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting]           = useState(false)

  // Add Animal modal state
  const [addOpen, setAddOpen]           = useState(false)
  const [form, setForm]                 = useState(BLANK_FORM)
  const [photoFile, setPhotoFile]       = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [addSaving, setAddSaving]       = useState(false)
  const [addError, setAddError]         = useState('')
  const fileInputRef                    = useRef(null)

  const openModal = (a) => {
    setModalAnimal(a)
    setEditing(false)
    setSaveError('')
    setConfirmDelete(false)
  }

  const closeModal = useCallback(() => {
    setModalAnimal(null)
    setEditing(false)
    setSaveError('')
    setConfirmDelete(false)
  }, [])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`/animals/${modalAnimal.id}`)
      setAnimals(prev => prev.filter(a => a.id !== modalAnimal.id))
      closeModal()
    } catch (err) {
      setSaveError(err.message)
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  const closeAdd = useCallback(() => {
    setAddOpen(false)
    setForm(BLANK_FORM)
    setPhotoFile(null)
    setPhotoPreview('')
    setAddError('')
  }, [])

  const startEdit = () => {
    setEditStory(modalAnimal.story || '')
    setEditTraits((modalAnimal.traits || []).join(', '))
    setEditStatus(modalAnimal.status || 'available')
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
        status: editStatus,
      })
      setAnimals(prev => prev.map(a => a.id === data.id ? data : a))
      setModalAnimal(data)
      setEditing(false)
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    setAddSaving(true)
    setAddError('')
    try {
      let image_url = form.image_url

      // Upload file if one was selected
      if (photoFile) {
        const fd = new FormData()
        fd.append('file', photoFile)
        const token = localStorage.getItem('token')
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/upload/`,
          { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd }
        )
        if (!res.ok) throw new Error('Image upload failed')
        const json = await res.json()
        // Make the URL absolute so it works from the frontend
        image_url = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${json.url}`
      }

      const traits = form.traits.split(',').map(t => t.trim()).filter(Boolean)
      const { data } = await api.post('/animals/', {
        name:       form.name,
        species:    form.species,
        breed:      form.breed,
        age:        parseInt(form.age) || 0,
        gender:     form.gender,
        dob:        form.dob || null,
        status:     form.status,
        shelter_id: user?.id || 'demo_shelter',
        story:      form.story,
        traits,
        image_url,
        image_emoji: '🐾',
        description: form.story,
      })

      setAnimals(prev => [data, ...prev])
      closeAdd()
    } catch (err) {
      setAddError(err.message)
    } finally {
      setAddSaving(false)
    }
  }

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (modalAnimal) closeModal()
        else if (addOpen) closeAdd()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [closeModal, closeAdd, modalAnimal, addOpen])

  // Health screening state
  const [selectedPet, setSelectedPet]       = useState('')
  const [healthData, setHealthData]         = useState(null)
  const [healthLoading, setHealthLoading]   = useState(false)
  const [healthError, setHealthError]       = useState('')
  const [healthEditing, setHealthEditing]   = useState(false)
  const [healthSaving, setHealthSaving]     = useState(false)
  const [healthSaveErr, setHealthSaveErr]   = useState('')
  const [editHealth, setEditHealth]         = useState(null)   // working copy
  const [confirmDelHealth, setConfirmDelHealth] = useState(false)

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
    setHealthEditing(false)
    setConfirmDelHealth(false)
    if (!name) return
    setHealthLoading(true)
    try {
      const { data } = await api.get(`/health/by-name/${encodeURIComponent(name)}`)
      setHealthData(data)
    } catch (err) {
      if (err.message?.includes('404') || err.message?.includes('No health')) {
        setHealthData(null)
        setHealthError('no-record')
      } else {
        setHealthError(err.message)
      }
    } finally {
      setHealthLoading(false)
    }
  }

  const startHealthEdit = () => {
    setEditHealth({
      weight:       healthData.weight ?? '',
      temperature:  healthData.temperature ?? '',
      last_checkup: healthData.last_checkup ?? '',
      vet_name:     healthData.vet_name ?? '',
      vaccinations: healthData.vaccinations.map(v => ({ ...v })),
    })
    setHealthEditing(true)
    setHealthSaveErr('')
  }

  const startNewRecord = () => {
    setEditHealth({ weight: '', temperature: '', last_checkup: '', vet_name: '', vaccinations: [] })
    setHealthEditing(true)
    setHealthSaveErr('')
  }

  const updateVacc = (i, field, val) => {
    setEditHealth(h => {
      const vaccs = h.vaccinations.map((v, idx) => idx === i ? { ...v, [field]: val } : v)
      return { ...h, vaccinations: vaccs }
    })
  }

  const addVaccRow = () => {
    setEditHealth(h => ({ ...h, vaccinations: [...h.vaccinations, { name: '', date_given: '', next_due: '' }] }))
  }

  const removeVaccRow = (i) => {
    setEditHealth(h => ({ ...h, vaccinations: h.vaccinations.filter((_, idx) => idx !== i) }))
  }

  const saveHealthRecord = async () => {
    setHealthSaving(true)
    setHealthSaveErr('')
    try {
      const payload = {
        weight:       editHealth.weight === '' ? null : parseFloat(editHealth.weight),
        temperature:  editHealth.temperature === '' ? null : parseFloat(editHealth.temperature),
        last_checkup: editHealth.last_checkup || null,
        vet_name:     editHealth.vet_name,
        vaccinations: editHealth.vaccinations.filter(v => v.name.trim()),
      }
      let data
      if (healthData) {
        ;({ data } = await api.patch(`/health/${healthData.id}`, payload))
      } else {
        ;({ data } = await api.post('/health/', { ...payload, animal_name: selectedPet }))
      }
      setHealthData(data)
      setHealthEditing(false)
      setHealthError('')
    } catch (err) {
      setHealthSaveErr(err.message)
    } finally {
      setHealthSaving(false)
    }
  }

  const deleteHealthRecord = async () => {
    setHealthSaving(true)
    try {
      await api.delete(`/health/${healthData.id}`)
      setHealthData(null)
      setHealthEditing(false)
      setConfirmDelHealth(false)
      setHealthError('no-record')
    } catch (err) {
      setHealthSaveErr(err.message)
    } finally {
      setHealthSaving(false)
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
                <button className="sd-add-btn" onClick={() => setAddOpen(true)}>+ ADD ANIMAL</button>
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
              {healthError && healthError !== 'no-record' && (
                <div className="alert alert-error" style={{ margin: '0 48px' }}>{healthError}</div>
              )}

              {/* No record yet — offer to create one */}
              {!healthLoading && healthError === 'no-record' && !healthEditing && (
                <div className="sd-health-panel">
                  <p className="sd-health-none">No health record found for {selectedPet}.</p>
                  <button className="sd-modal-action-btn sd-modal-edit" style={{ marginTop: '16px' }} onClick={startNewRecord}>
                    + CREATE HEALTH RECORD
                  </button>
                </div>
              )}

              {/* View mode */}
              {healthData && !healthEditing && (
                <div className="sd-health-panel">
                  <div className="sd-health-panel-topbar">
                    <div className="sd-health-title">{healthData.animal_name}</div>
                    <div className="sd-health-panel-actions">
                      {confirmDelHealth ? (
                        <>
                          <span className="sd-delete-confirm-text">DELETE RECORD?</span>
                          <button className="sd-modal-action-btn sd-modal-delete-confirm" onClick={deleteHealthRecord} disabled={healthSaving}>
                            {healthSaving ? '...' : 'YES'}
                          </button>
                          <button className="sd-modal-action-btn sd-modal-cancel" onClick={() => setConfirmDelHealth(false)}>NO</button>
                        </>
                      ) : (
                        <>
                          <button className="sd-modal-action-btn sd-modal-edit" onClick={startHealthEdit}>EDIT</button>
                          <button className="sd-modal-action-btn sd-modal-delete" onClick={() => setConfirmDelHealth(true)}>DELETE RECORD</button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="sd-health-grid">
                    <div className="sd-health-card">
                      <div className="sd-health-label">WEIGHT</div>
                      <div className="sd-health-value">{healthData.weight ?? '—'} <span className="sd-health-unit">kg</span></div>
                    </div>
                    <div className="sd-health-card">
                      <div className="sd-health-label">TEMPERATURE</div>
                      <div className="sd-health-value">{healthData.temperature ?? '—'} <span className="sd-health-unit">°C</span></div>
                    </div>
                    <div className="sd-health-card">
                      <div className="sd-health-label">LAST CHECKUP</div>
                      <div className="sd-health-value sd-health-value--sm">{healthData.last_checkup || '—'}</div>
                    </div>
                    <div className="sd-health-card">
                      <div className="sd-health-label">ATTENDING VET</div>
                      <div className="sd-health-value sd-health-value--sm">{healthData.vet_name || '—'}</div>
                    </div>
                  </div>

                  <div className="sd-section-title" style={{ marginTop: '40px' }}>VACCINATIONS</div>
                  {healthData.vaccinations.length === 0 ? (
                    <p className="sd-health-none">No vaccinations on record.</p>
                  ) : (
                    <div className="sd-vacc-table">
                      <div className="sd-vacc-row sd-vacc-header">
                        <span>VACCINE</span><span>DATE GIVEN</span><span>NEXT DUE</span><span></span>
                      </div>
                      {healthData.vaccinations.map((v, i) => (
                        <div key={i} className="sd-vacc-row">
                          <span className="sd-vacc-name">{v.name}</span>
                          <span>{v.date_given}</span>
                          <span style={{ color: '#FFD700' }}>{v.next_due}</span>
                          <span></span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Edit / Create mode */}
              {healthEditing && editHealth && (
                <div className="sd-health-panel">
                  <div className="sd-health-panel-topbar">
                    <div className="sd-health-title">{selectedPet}</div>
                    <div className="sd-health-panel-actions">
                      <button className="sd-modal-action-btn sd-modal-save" onClick={saveHealthRecord} disabled={healthSaving}>
                        {healthSaving ? 'SAVING...' : 'SAVE'}
                      </button>
                      <button className="sd-modal-action-btn sd-modal-cancel" onClick={() => setHealthEditing(false)} disabled={healthSaving}>
                        CANCEL
                      </button>
                    </div>
                  </div>

                  <div className="sd-health-grid">
                    <div className="sd-health-card">
                      <div className="sd-health-label">WEIGHT (kg)</div>
                      <input className="sd-health-input" type="number" step="0.1" placeholder="e.g. 12.5"
                        value={editHealth.weight}
                        onChange={(e) => setEditHealth(h => ({ ...h, weight: e.target.value }))} />
                    </div>
                    <div className="sd-health-card">
                      <div className="sd-health-label">TEMPERATURE (°C)</div>
                      <input className="sd-health-input" type="number" step="0.1" placeholder="e.g. 38.5"
                        value={editHealth.temperature}
                        onChange={(e) => setEditHealth(h => ({ ...h, temperature: e.target.value }))} />
                    </div>
                    <div className="sd-health-card">
                      <div className="sd-health-label">LAST CHECKUP</div>
                      <input className="sd-health-input" type="date"
                        value={editHealth.last_checkup}
                        onChange={(e) => setEditHealth(h => ({ ...h, last_checkup: e.target.value }))} />
                    </div>
                    <div className="sd-health-card">
                      <div className="sd-health-label">ATTENDING VET</div>
                      <input className="sd-health-input" placeholder="Dr. Name"
                        value={editHealth.vet_name}
                        onChange={(e) => setEditHealth(h => ({ ...h, vet_name: e.target.value }))} />
                    </div>
                  </div>

                  <div className="sd-section-title" style={{ marginTop: '40px' }}>
                    VACCINATIONS
                    <button className="sd-add-btn" style={{ fontSize: '0.75rem', padding: '4px 14px' }} onClick={addVaccRow}>
                      + ADD ROW
                    </button>
                  </div>

                  <div className="sd-vacc-table">
                    <div className="sd-vacc-row sd-vacc-header">
                      <span>VACCINE</span><span>DATE GIVEN</span><span>NEXT DUE</span><span></span>
                    </div>
                    {editHealth.vaccinations.length === 0 && (
                      <div className="sd-vacc-row"><span className="sd-health-none" style={{ gridColumn: '1/-1' }}>No vaccinations — click + ADD ROW</span></div>
                    )}
                    {editHealth.vaccinations.map((v, i) => (
                      <div key={i} className="sd-vacc-row sd-vacc-edit-row">
                        <input className="sd-vacc-input" placeholder="Vaccine name"
                          value={v.name} onChange={(e) => updateVacc(i, 'name', e.target.value)} />
                        <input className="sd-vacc-input" type="date"
                          value={v.date_given} onChange={(e) => updateVacc(i, 'date_given', e.target.value)} />
                        <input className="sd-vacc-input" type="date"
                          value={v.next_due} onChange={(e) => updateVacc(i, 'next_due', e.target.value)} />
                        <button className="sd-vacc-del" onClick={() => removeVaccRow(i)}>X</button>
                      </div>
                    ))}
                  </div>

                  {healthSaveErr && <div className="alert alert-error" style={{ marginTop: '16px' }}>{healthSaveErr}</div>}
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
              {confirmDelete ? (
                <>
                  <span className="sd-delete-confirm-text">ARE YOU SURE?</span>
                  <button className="sd-modal-action-btn sd-modal-delete-confirm" onClick={handleDelete} disabled={deleting}>
                    {deleting ? 'REMOVING...' : 'YES, REMOVE'}
                  </button>
                  <button className="sd-modal-action-btn sd-modal-cancel" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                    CANCEL
                  </button>
                </>
              ) : editing ? (
                <>
                  <button className="sd-modal-action-btn sd-modal-save" onClick={saveEdit} disabled={saving}>
                    {saving ? 'SAVING...' : 'SAVE'}
                  </button>
                  <button className="sd-modal-action-btn sd-modal-cancel" onClick={() => setEditing(false)} disabled={saving}>
                    CANCEL
                  </button>
                </>
              ) : (
                <>
                  <button className="sd-modal-action-btn sd-modal-edit" onClick={startEdit}>EDIT</button>
                  <button className="sd-modal-action-btn sd-modal-delete" onClick={() => setConfirmDelete(true)}>DELETE</button>
                </>
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

              {/* Status */}
              <div className="sd-modal-section">
                <div className="sd-modal-section-label">STATUS</div>
                {editing ? (
                  <select
                    className="sd-select"
                    style={{ marginBottom: 0, maxWidth: '240px' }}
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                  >
                    <option value="available">Available</option>
                    <option value="adopted">Adopted</option>
                    <option value="fostered">Fostered</option>
                  </select>
                ) : (
                  <span className={`ac-badge ac-badge-${modalAnimal.status}`} style={{ position: 'static', display: 'inline-block' }}>
                    {modalAnimal.status}
                  </span>
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

      {/* ── Add Animal Modal ── */}
      {addOpen && (
        <div className="sd-modal-overlay" onClick={closeAdd}>
          <div className="sd-modal sd-add-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sd-modal-topbar">
              <span className="sd-add-modal-title">ADD ANIMAL</span>
              <button className="sd-modal-close" onClick={closeAdd}>CLOSE</button>
            </div>

            <form className="sd-add-form" onSubmit={handleAddSubmit}>

              {/* Photo upload */}
              <div className="sd-add-field">
                <label className="sd-add-label">PHOTO</label>
                <div className="sd-photo-upload" onClick={() => fileInputRef.current?.click()}>
                  {photoPreview
                    ? <img src={photoPreview} alt="preview" className="sd-photo-preview" />
                    : <span className="sd-photo-placeholder">CLICK TO UPLOAD IMAGE</span>
                  }
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handlePhotoChange}
                />
                {!photoFile && (
                  <input
                    className="sd-edit-input"
                    style={{ marginTop: '8px' }}
                    placeholder="Or paste an image URL"
                    value={form.image_url}
                    onChange={(e) => setForm(f => ({ ...f, image_url: e.target.value }))}
                  />
                )}
              </div>

              <div className="sd-add-row">
                <div className="sd-add-field">
                  <label className="sd-add-label">NAME *</label>
                  <input className="sd-edit-input" required value={form.name}
                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="sd-add-field">
                  <label className="sd-add-label">SPECIES</label>
                  <select className="sd-select" style={{ marginBottom: 0 }} value={form.species}
                    onChange={(e) => setForm(f => ({ ...f, species: e.target.value }))}>
                    {['Dog', 'Cat', 'Rabbit', 'Hamster', 'Bird', 'Other'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="sd-add-row">
                <div className="sd-add-field">
                  <label className="sd-add-label">BREED *</label>
                  <input className="sd-edit-input" required value={form.breed}
                    onChange={(e) => setForm(f => ({ ...f, breed: e.target.value }))} />
                </div>
                <div className="sd-add-field">
                  <label className="sd-add-label">AGE (years) *</label>
                  <input className="sd-edit-input" required type="number" min="0" value={form.age}
                    onChange={(e) => setForm(f => ({ ...f, age: e.target.value }))} />
                </div>
              </div>

              <div className="sd-add-row">
                <div className="sd-add-field">
                  <label className="sd-add-label">GENDER</label>
                  <select className="sd-select" style={{ marginBottom: 0 }} value={form.gender}
                    onChange={(e) => setForm(f => ({ ...f, gender: e.target.value }))}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div className="sd-add-field">
                  <label className="sd-add-label">STATUS</label>
                  <select className="sd-select" style={{ marginBottom: 0 }} value={form.status}
                    onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="available">Available</option>
                    <option value="adopted">Adopted</option>
                    <option value="fostered">Fostered</option>
                  </select>
                </div>
              </div>

              <div className="sd-add-field">
                <label className="sd-add-label">DATE ADMITTED</label>
                <input className="sd-edit-input" type="date" value={form.dob}
                  onChange={(e) => setForm(f => ({ ...f, dob: e.target.value }))} />
              </div>

              <div className="sd-add-field">
                <label className="sd-add-label">PERSONALITY TRAITS (comma-separated)</label>
                <input className="sd-edit-input" placeholder="Playful, Calm, Energetic" value={form.traits}
                  onChange={(e) => setForm(f => ({ ...f, traits: e.target.value }))} />
              </div>

              <div className="sd-add-field">
                <label className="sd-add-label">THEIR STORY</label>
                <textarea className="sd-edit-textarea" rows={5} placeholder="Write this animal's story..."
                  value={form.story}
                  onChange={(e) => setForm(f => ({ ...f, story: e.target.value }))} />
              </div>

              {addError && <div className="alert alert-error">{addError}</div>}

              <div className="sd-add-actions">
                <button type="submit" className="sd-modal-action-btn sd-modal-save" disabled={addSaving}>
                  {addSaving ? 'SAVING...' : 'ADD ANIMAL'}
                </button>
                <button type="button" className="sd-modal-action-btn sd-modal-cancel" onClick={closeAdd}>
                  CANCEL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
