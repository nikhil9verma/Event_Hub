import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Layout from './components/layout/Layout'
import HomePage from './pages/HomePage'
import EventDetailPage from './pages/EventDetailPage'
import CreateEventPage from './pages/CreateEventPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ProfilePage from './pages/ProfilePage'
import MyRegistrationsPage from './pages/MyRegistrationsPage'
import AnalyticsPage from './pages/AnalyticsPage'
import MyEventsPage from './pages/MyEventPage'
import ErrorBoundary from './components/common/ErrorBoundary'
import ForgotPasswordPage from './pages/ForgotPassword'
import AdminDashboardPage from './pages/AdminDashboardPage'
function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const userRole = useAuthStore((s) => s.user?.role)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (roles && userRole && !roles.includes(userRole)) return <Navigate to="/" replace />
  return <>{children}</>
}

// Stable element references — created once, never recreated on App re-render
const loginElement = <LoginPage />
const registerElement = <RegisterPage />

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={loginElement} />
        <Route path="/register" element={registerElement} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="events/:id" element={<EventDetailPage />} />
          <Route path="events/create" element={
            <ProtectedRoute roles={['HOST', 'SUPER_ADMIN']}>
              <CreateEventPage />
            </ProtectedRoute>
          } />
          <Route path="events/:id/edit" element={
            <ProtectedRoute roles={['HOST', 'SUPER_ADMIN']}>
              <CreateEventPage />
            </ProtectedRoute>
          } />
          <Route path="events/:id/analytics" element={
            <ProtectedRoute roles={['HOST', 'SUPER_ADMIN']}>
              <AnalyticsPage />
            </ProtectedRoute>
          } />
          <Route path="profile" element={
            <ProtectedRoute><ProfilePage /></ProtectedRoute>
          } />
          <Route path="my-registrations" element={
            <ProtectedRoute><MyRegistrationsPage /></ProtectedRoute>
          } />
          <Route path="my-events" element={
            <ProtectedRoute roles={['HOST', 'SUPER_ADMIN']}>
              <MyEventsPage />
            </ProtectedRoute>
          } />
          <Route path="admin" element={
            <ProtectedRoute roles={['SUPER_ADMIN']}>
              <AdminDashboardPage />
            </ProtectedRoute>
          } />
        </Route>
      </Routes>
    </ErrorBoundary>
  )
}