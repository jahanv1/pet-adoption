import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import StarField from '../components/StarField'

export default function AdopterLogin() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [isRegister, setIsRegister] = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  const [form, setForm] = useState({
    name: '', address: '', contact_no: '',
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
      const endpoint = isRegister ? '/auth/adopter/register' : '/auth/adopter/login'
      const payload  = isRegister
        ? { name: form.name, address: form.address,
            contact_no: form.contact_no, email: form.email, password: form.password }
        : { email: form.email, password: form.password }

      const { data } = await api.post(endpoint, payload)
      login({
        token:     data.access_token,
        userType:  'adopter',
        name:      data.name,
        email:     data.email,
        adopterId: data.adopter_id,
      })
      navigate('/adopter/dashboard')
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
      <div className="split-panel split-panel-adopter">
        <div className="panel-watermark">02</div>
        <div className="panel-content">
          <div className="panel-tag panel-tag-dark">PawsHome</div>
          <h2 className="panel-title panel-title-dark">ADOPTER<br />PORTAL</h2>
          <p className="panel-sub panel-sub-dark">BROWSE · CONNECT · ADOPT</p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="split-form">
        <Link to="/" className="split-back">← Home</Link>

        <div className="split-form-inner">
          <p className="split-eyebrow">WELCOME BACK</p>
          <h1 className="split-title">
            {isRegister ? 'CREATE ACCOUNT' : 'ADOPTER LOGIN'}
          </h1>

          {error && <div className="split-error">{error}</div>}

          <form onSubmit={handleSubmit} className="split-form-fields">
            {isRegister && (
              <>
                <div className="line-field">
                  <label>Full Name</label>
                  <input name="name" placeholder="Your full name" value={form.name} onChange={handle} required />
                </div>
                <div className="line-field-row">
                  <div className="line-field">
                    <label>Address</label>
                    <input name="address" placeholder="Your address" value={form.address} onChange={handle} required />
                  </div>
                  <div className="line-field">
                    <label>Contact No.</label>
                    <input name="contact_no" placeholder="+1-555-0200" value={form.contact_no} onChange={handle} required />
                  </div>
                </div>
              </>
            )}

            <div className="line-field">
              <label>Email</label>
              <input name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handle} required />
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

            <button className="split-submit split-submit-adopter" type="submit" disabled={loading}>
              {loading ? <span className="spinner" /> : null}
              {loading ? 'PLEASE WAIT' : isRegister ? 'JOIN PAWSHOME' : 'LOGIN'}
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
