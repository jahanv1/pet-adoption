import { Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import ShelterLogin from './pages/ShelterLogin'
import AdopterLogin from './pages/AdopterLogin'
import ShelterDashboard from './pages/ShelterDashboard'
import AdopterDashboard from './pages/AdopterDashboard'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/shelter/login" element={<ShelterLogin />} />
      <Route path="/adopter/login" element={<AdopterLogin />} />
      <Route
        path="/shelter/dashboard"
        element={
          <ProtectedRoute userType="shelter">
            <ShelterDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/adopter/dashboard"
        element={
          <ProtectedRoute userType="adopter">
            <AdopterDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
