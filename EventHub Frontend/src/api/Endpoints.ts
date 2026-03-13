import axios, { type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '../store/authStore'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
// const BASE_URL = 'http://localhost:5000/api'  // For development

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// ─── 1. FIXED: Request Interceptor (Attaches your JWT token!) ───
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ─── 2. FIXED: Response Interceptor (Catches BOTH 401 and 403 errors!) ───
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  refreshToken: () => api.post('/auth/refresh'),
  
  // ─── 3. FIXED: Adjusted signatures to match exactly what ProfilePage.tsx sends ───
  requestEmailChange: (newEmail: string) =>
    api.post('/auth/profile/email/request', { newEmail }),

  verifyEmailChange: (newEmail: string, otp: string) =>
    api.post('/auth/profile/email/verify', { newEmail, otp }),
    
  forgotPassword: (email: string) => 
    api.post(`/auth/forgot-password?email=${encodeURIComponent(email)}`),
    
  resetPassword: (data: { email: string; otp: string; newPassword: string }) =>
    api.post(`/auth/reset-password?email=${encodeURIComponent(data.email)}&otp=${data.otp}&newPassword=${encodeURIComponent(data.newPassword)}`),
  
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  
  register: (data: { name: string; email: string; password: string; course: string; batch: string }) =>
    api.post('/auth/register', data),
    
  verifyRegistration: (email: string, otp: string) =>
    api.post(`/auth/verify-registration?email=${email}&otp=${otp}`),
  
  getProfile: () =>  // Renamed from getMe to getProfile to match ProfilePage.tsx
    api.get('/auth/profile'),
  
  updateProfile: (data: { name: string; course?: string; batch?: string }) =>
    api.patch('/auth/profile', data),
  
  uploadAvatar: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/auth/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/auth/password', data),
  
  applyForHost: () => api.post('/auth/apply-host'),
  
  deleteAccount: () => api.delete('/auth/account'),
}

// ─── Admin ────────────────────────────────────────────────────────────────────
export const adminApi = {
  getPendingHostRequests: () => api.get('/admin/host-requests'),
  approveHost: (id: number) => api.post(`/admin/host-requests/${id}/approve`),
  rejectHost: (id: number) => api.post(`/admin/host-requests/${id}/reject`),
  getHostsAndAdmins: () => api.get('/admin/hosts'),
  demoteToStudent: (id: number) => api.post(`/admin/users/${id}/demote`),
}

// ─── Events ───────────────────────────────────────────────────────────────────
export const eventsApi = {
  getEvents: (filters: Record<string, any>) =>
    api.get('/events', { params: filters }),

  getEvent: (id: number) =>
    api.get(`/events/${id}`),

  createEvent: (data: Record<string, any>) =>
    api.post('/events', data),

  updateEvent: (id: number, data: Record<string, any>) =>
    api.put(`/events/${id}`, data),
  
  getAttendees: (id: number) =>
    api.get(`/events/${id}/attendees`),
  
  uploadPoster: (id: number, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/events/${id}/poster`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  deleteEvent: (id: number) => 
    api.delete(`/events/${id}`),

  uploadCardImage: (id: number, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/events/${id}/card-image`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  getMyEvents: (page: number) =>
    api.get('/events/my-events', { params: { page, size: 10 } }),

  register: (id: number, data?: any) =>
    api.post(`/events/${id}/register`, data),

  cancelRegistration: (id: number) =>
    api.delete(`/events/${id}/register`),

  getMyRegistrations: (page: number = 0) =>
    api.get('/registrations/my', { params: { page, size: 10 } }),

  getComments: (id: number, page = 0, size = 20) =>
    api.get(`/events/${id}/comments`, { params: { page, size } }),

  addComment: (id: number, message: string) =>
    api.post(`/events/${id}/comments`, { message }),

  rateEvent: (id: number, stars: number) =>
    api.post(`/events/${id}/rating`, { stars }),

  getAnalytics: (id: number) =>
    api.get(`/events/${id}/analytics`),
}