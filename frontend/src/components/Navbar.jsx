import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function PawIcon() {
  return (
    <svg viewBox="0 0 100 100" width="20" height="20" aria-hidden="true" fill="currentColor">
      <ellipse cx="50" cy="67" rx="24" ry="20" />
      <ellipse cx="26" cy="46" rx="11" ry="14" />
      <ellipse cx="74" cy="46" rx="11" ry="14" />
      <ellipse cx="38" cy="30" rx="10" ry="13" />
      <ellipse cx="62" cy="30" rx="10" ry="13" />
    </svg>
  )
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <PawIcon />
        <span>PawsHome</span>
      </Link>

      <div className="navbar-right">
        {user && (
          <>
            <span className="navbar-user">{user.name}</span>
            <button className="btn btn-ghost" onClick={handleLogout}>Logout</button>
          </>
        )}
      </div>
    </nav>
  )
}
