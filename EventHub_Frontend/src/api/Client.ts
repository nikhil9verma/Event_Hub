import axios, { type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // ─── FIX: Catch BOTH 401 (Unauthorized) and 403 (Forbidden) ───
    if (error.response?.status === 401 || error.response?.status === 403) {
      const isLoggedIn = useAuthStore.getState().isAuthenticated
      // Only redirect if session expired — not on a failed login attempt
      if (isLoggedIn) {
        useAuthStore.getState().logout()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api