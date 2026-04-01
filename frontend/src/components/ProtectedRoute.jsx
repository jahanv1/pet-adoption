import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, userType }) {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to={userType === 'shelter' ? '/shelter/login' : '/adopter/login'} replace />
  }
  if (user.userType !== userType) {
    return <Navigate to="/" replace />
  }
  return children
}
