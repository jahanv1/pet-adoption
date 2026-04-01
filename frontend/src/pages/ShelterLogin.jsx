import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import StarField from '../components/StarField'

export default function ShelterLogin() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [isRegister, setIsRegister] = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  const [form, setForm] = useState({
    name: '', address: '', capacity: '', contact_no: '',
    email: '', password: '', confirm: '',
  })

  const handle = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (isRegister && form.password !== form.confirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const endpoint = isRegister ? '/auth/shelter/register' : '/auth/shelter/login'
      const payload  = isRegister
        ? { name: form.name, address: form.address, capacity: Number(form.capacity),
            contact_no: form.contact_no, email: form.email, password: form.password }
        : { email: form.email, password: form.password }

      const { data } = await api.post(endpoint, payload)
      login({
        token:     data.access_token,
        userType:  'shelter',
        name:      data.name,
        email:     data.email,
        shelterId: data.shelter_id,
      })
      navigate('/shelter/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="split-page">
      <StarField />

      {/* ── Left graphic panel ── */}
      <div className="split-panel split-panel-shelter">
        <div className="panel-watermark">01</div>
        <div className="panel-content">
          <div className="panel-tag">PawsHome</div>
          <h2 className="panel-title">SHELTER<br />PORTAL</h2>
          <p className="panel-sub">MANAGE · TRACK · PROTECT</p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="split-form">
        <Link to="/" className="split-back">← Home</Link>

        <div className="split-form-inner">
          <p className="split-eyebrow">WELCOME BACK</p>
          <h1 className="split-title">
            {isRegister ? 'CREATE ACCOUNT' : 'SHELTER LOGIN'}
          </h1>

          {error && <div className="split-error">{error}</div>}

          <form onSubmit={handleSubmit} className="split-form-fields">
            {isRegister && (
              <>
                <div className="line-field">
                  <label>Shelter Name</label>
                  <input name="name" placeholder="Happy Paws Shelter" value={form.name} onChange={handle} required />
                </div>
                <div className="line-field">
                  <label>Address</label>
                  <input name="address" placeholder="123 Pet Street, City" value={form.address} onChange={handle} required />
                </div>
                <div className="line-field-row">
                  <div className="line-field">
                    <label>Capacity</label>
                    <input name="capacity" type="number" min="1" placeholder="50" value={form.capacity} onChange={handle} required />
                  </div>
                  <div className="line-field">
                    <label>Contact No.</label>
                    <input name="contact_no" placeholder="+1-555-0100" value={form.contact_no} onChange={handle} required />
                  </div>
                </div>
              </>
            )}

            <div className="line-field">
              <label>Email</label>
              <input name="email" type="email" placeholder="shelter@example.com" value={form.email} onChange={handle} required />
            </div>
            <div className="line-field">
              <label>Password</label>
              <input name="password" type="password" placeholder="••••••••" value={form.password} onChange={handle} required />
            </div>
            {isRegister && (
              <div className="line-field">
                <label>Confirm Password</label>
                <input name="confirm" type="password" placeholder="••••••••" value={form.confirm} onChange={handle} required />
              </div>
            )}

            <button className="split-submit split-submit-shelter" type="submit" disabled={loading}>
              {loading ? <span className="spinner" /> : null}
              {loading ? 'PLEASE WAIT' : isRegister ? 'CREATE ACCOUNT' : 'LOGIN'}
            </button>
          </form>

          <div className="split-toggle">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button onClick={() => { setIsRegister(!isRegister); setError('') }}>
              {isRegister ? 'Login' : 'Register'}
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}
