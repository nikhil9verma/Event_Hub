import { useState } from 'react'
import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Drawer from '@mui/material/Drawer'
import Avatar from '@mui/material/Avatar'
import { useAuthStore } from '../../store/authStore'
import { notificationsApi } from '../../api/Endpoints'
import NotificationPanel from '../notifications/NotificationPanel'
import { getImageUrl } from '../event/EventCard'

function BellIcon({ count }: { count: number }) {
  return (
    <button className="relative p-2 rounded-xl hover:bg-ink-900/8 transition-colors group">
      <svg className="w-5 h-5 text-ink-700 group-hover:text-ink-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 bg-crimson text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-sans">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  )
}

export default function Layout() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)

  const { data: unreadCount } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => notificationsApi.getUnreadCount().then((r: { data: { data: any } }) => r.data.data ?? null),
    enabled: isAuthenticated,
    refetchInterval: 30000,
  })

  const handleLogout = () => {
    logout()
    setDrawerOpen(false)
    navigate('/')
  }

  const isHost = user?.role === 'HOST' || user?.role === 'SUPER_ADMIN'

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-ink-900 border-b border-ink-800">
        <div className="page-container">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 bg-gold rounded-lg flex items-center justify-center shadow-gold group-hover:scale-105 transition-transform">
                <span className="font-serif font-bold text-ink-900 text-sm">E</span>
              </div>
              <span className="font-serif font-semibold text-white text-lg tracking-tight">
                Event<span className="text-gold">Hub</span>
              </span>
            </Link>

            {/* Right side */}
            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <>
                  <div onClick={() => setNotifOpen(true)} className="cursor-pointer">
                    <BellIcon count={unreadCount ?? 0} />
                  </div>

                  <button
                    onClick={() => setDrawerOpen(true)}
                    className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-xl hover:bg-ink-800 transition-colors group"
                  >
                    <span className="text-sm text-parchment-200 font-sans hidden sm:block truncate max-w-[120px]">
                      {user?.name}
                    </span>
                    <Avatar
                      // Before: src={user?.profileImageUrl}
                      // After: wrapped in getImageUrl to handle the proxy path
                      src={getImageUrl(user?.profileImageUrl)}
                      sx={{ width: 34, height: 34, fontSize: 14 }}
                      className="border-2 border-gold/40"
                    >
                      {user?.name?.[0]?.toUpperCase()}
                    </Avatar>
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/login" className="btn-ghost text-parchment-200 hover:text-white hover:bg-ink-800 text-sm">
                    Sign In
                  </Link>
                  <Link to="/register" className="btn-gold text-sm py-2 px-4">
                    Join Now
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Profile Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: 280,
            background: '#1a1f3a',
            color: '#faf9f6',
            borderLeft: '1px solid rgba(245,200,66,0.2)',
          }
        }}
      >
        <div className="p-6 flex flex-col h-full">
          {/* Profile header */}
          <div className="flex items-center gap-3 mb-8 pb-6 border-b border-ink-800">
            <Avatar
              src={user?.profileImageUrl}
              sx={{ width: 48, height: 48, fontSize: 18 }}
              className="border-2 border-gold/40"
            >
              {user?.name?.[0]?.toUpperCase()}
            </Avatar>
            <div className="min-w-0">
              <p className="font-serif text-lg text-white truncate">{user?.name}</p>
              <p className="text-xs text-parchment-200/60 font-sans truncate">{user?.email}</p>
              
            </div>
          </div>

          {/* Nav items */}
          <nav className="flex-1 flex flex-col gap-1">
            {[
              { label: 'Profile', icon: '👤', to: '/profile' },
              { label: 'My Registrations', icon: '🎫', to: '/my-registrations' },
              ...(isHost ? [
                { label: 'My Events', icon: '📋', to: '/my-events' },
                { label: 'Create Event', icon: '✨', to: '/events/create' },
              ] : []),
              
            ].map(item => (
              <Link
                key={item.label}
                to={item.to}
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-ink-800 text-parchment-200 hover:text-white transition-all group"
              >
                <span className="text-lg">{item.icon}</span>
                <span className="font-sans text-sm">{item.label}</span>
              </Link>
            ))}
          </nav>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-crimson/20 text-parchment-200/60 hover:text-crimson transition-all mt-4"
          >
            <span className="text-lg">🚪</span>
            <span className="font-sans text-sm">Sign Out</span>
          </button>
        </div>
      </Drawer>

      {/* Notification Panel */}
      <Drawer
        anchor="right"
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        PaperProps={{
          sx: { width: 380, background: '#faf9f6' }
        }}
      >
        <NotificationPanel onClose={() => setNotifOpen(false)} />
      </Drawer>

      {/* Page Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-ink-900 border-t border-ink-800 py-8 mt-16">
        <div className="page-container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gold rounded flex items-center justify-center">
                <span className="font-serif font-bold text-ink-900 text-xs">E</span>
              </div>
              <span className="font-serif text-white">EventHub</span>
              <span className="text-parchment-200/40 font-sans text-sm">University Event Management</span>
            </div>
            <p className="text-parchment-200/40 font-sans text-xs">
              © {new Date().getFullYear()} EventHub. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}