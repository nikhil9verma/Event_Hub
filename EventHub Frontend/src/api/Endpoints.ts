import axios from 'axios'
import { useAuthStore } from '../store/authStore'

// const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
const BASE_URL = "/api";
const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  forgotPassword: (email: string) => 
    api.post(`/auth/forgot-password?email=${encodeURIComponent(email)}`),
    
  resetPassword: (data: { email: string; otp: string; newPassword: string }) =>
    api.post(`/auth/reset-password?email=${encodeURIComponent(data.email)}&otp=${data.otp}&newPassword=${encodeURIComponent(data.newPassword)}`),
    
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
    
  register: (data: { name: string; email: string; password: string }) =>
    api.post('/auth/register', data),
    
  verifyRegistration: (email: string, otp: string) =>
    api.post(`/auth/verify-registration?email=${email}&otp=${otp}`),
    
  getMe: () =>
    api.get('/auth/profile'),
    
  updateProfile: (data: { name: string }) =>
    api.patch('/auth/profile', data),
    
  uploadAvatar: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    // FIX: Explicitly override the global application/json header
    return api.post('/auth/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/auth/password', data),
    
  applyForHost: () => api.post('/auth/apply-host'),
  
  deleteAccount: () => api.delete('/auth/account'),
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
    // FIX: Explicitly override the global application/json header
    return api.post(`/events/${id}/poster`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  uploadCardImage: (id: number, file: File) => {
    const form = new FormData()
    form.append('file', file)
    // FIX: Explicitly override the global application/json header
    return api.post(`/events/${id}/card-image`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  getMyEvents: (page: number) =>
    api.get('/events/my-events', { params: { page, size: 10 } }),

  register: (id: number) =>
    api.post(`/events/${id}/register`),

  cancelRegistration: (id: number) =>
    api.delete(`/events/${id}/register`),

  getMyRegistrations: (page: number) =>
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

// ─── Notifications ────────────────────────────────────────────────────────────
export const notificationsApi = {
  getNotifications: (page = 0, size = 20) =>
    api.get('/notifications', { params: { page, size } }),

  getUnreadCount: () =>
    api.get('/notifications/unread-count'),

  markRead: (id: number) =>
    api.patch(`/notifications/${id}/read`),

  markAllRead: () =>
    api.post('/notifications/mark-all-read'),
}