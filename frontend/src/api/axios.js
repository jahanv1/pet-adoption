import axios from 'axios'

const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost'
const BASE_URL = isLocal
  ? 'http://localhost:8000'
  : 'https://pawshome-backend-tjxq.onrender.com'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Surface error messages cleanly
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.detail ||
      err.response?.data?.message ||
      err.message ||
      'Something went wrong'
    return Promise.reject(new Error(message))
  }
)

export default api
