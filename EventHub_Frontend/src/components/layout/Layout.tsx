import { useEffect, useState, useRef } from 'react'
import { Outlet, Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import Drawer from '@mui/material/Drawer'
import Avatar from '@mui/material/Avatar'
import { useAuthStore } from '../../store/authStore'
import { getImageUrl } from '../event/EventCard'
import { authApi } from '../../api/Endpoints'

// ─── Search Icon SVG ───
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
}

// ─── Hamburger / Close Icon ───
function MenuIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ) : (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

export default function Layout() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [navQuery, setNavQuery] = useState(searchParams.get('q') || '')
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Sync search input with URL
  useEffect(() => {
    setNavQuery(searchParams.get('q') || '')
  }, [searchParams])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  // ─── Activity-based token refresh ───
  useEffect(() => {
    if (!isAuthenticated) return
    let lastActivity = Date.now()
    const updateActivity = () => { lastActivity = Date.now() }
    window.addEventListener('mousemove', updateActivity)
    window.addEventListener('keydown', updateActivity)
    window.addEventListener('click', updateActivity)
    const interval = setInterval(() => {
      if (Date.now() - lastActivity < 300000) {
        authApi.refreshToken()
          .then((res: any) => useAuthStore.setState({ token: res.data.data }))
          .catch(() => {})
      }
    }, 300000)
    return () => {
      window.removeEventListener('mousemove', updateActivity)
      window.removeEventListener('keydown', updateActivity)
      window.removeEventListener('click', updateActivity)
      clearInterval(interval)
    }
  }, [isAuthenticated])

  const handleLogout = () => {
    logout()
    setDrawerOpen(false)
    navigate('/')
  }

  const handleNavSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (navQuery.trim()) {
      navigate(`/?q=${encodeURIComponent(navQuery.trim())}`)
    } else {
      navigate('/')
    }
  }

  const isHost = user?.role === 'HOST' || user?.role === 'SUPER_ADMIN'


  // ─── Determine search placeholder based on route ───
  const getSearchPlaceholder = () => {
    if (location.pathname.includes('registrations')) return 'Search your registrations...'
    if (location.pathname.includes('my-events')) return 'Search your events...'
    return 'Search events, categories...'
  }

  const navLinks = [
    { label: 'Browse', to: '/', icon: '🏠' },
    ...(isAuthenticated ? [{ label: 'My Registrations', to: '/my-registrations', icon: '🎫' }] : []),
    ...(isHost ? [
      { label: 'My Events', to: '/my-events', icon: '📋' },
      { label: 'Create Event', to: '/events/create', icon: '✨' },
    ] : []),
  ]

  return (
    <div className="min-h-screen flex flex-col">

      {/* ═══════════════════════════════════════════════
          NAVBAR — Unstop-style structure, EventHub colors
      ═══════════════════════════════════════════════ */}
      <nav className="sticky top-0 z-40 bg-ink-900 border-b border-ink-800 shadow-nav">
        <div className="page-container">
          <div className="flex items-center gap-3 h-16">

            {/* ── Logo (left) ── */}
            <Link to="/" className="flex items-center gap-2 group shrink-0">
              <div className="w-8 h-8 bg-gold rounded-lg flex items-center justify-center shadow-gold group-hover:scale-105 transition-transform">
                <span className="font-serif font-bold text-ink-900 text-sm">E</span>
              </div>
              <span className="font-serif font-semibold text-white text-lg tracking-tight hidden sm:block">
                Event<span className="text-gold">Hub</span>
              </span>
            </Link>

            {/* ── Search Bar (center, Unstop-style) ── */}
            <form onSubmit={handleNavSearch} className="flex-1 max-w-lg mx-auto hidden md:flex">
              <div className="nav-search w-full">
                <SearchIcon className="w-4 h-4 text-parchment-200/50 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={navQuery}
                  onChange={e => setNavQuery(e.target.value)}
                  placeholder={getSearchPlaceholder()}
                />
                {navQuery && (
                  <button
                    type="button"
                    onClick={() => { setNavQuery(''); navigate('/') }}
                    className="text-parchment-200/40 hover:text-white transition-colors shrink-0"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </form>

            {/* ── Right Side ── */}
            <div className="flex items-center gap-2 shrink-0 ml-auto">

              {/* Mobile search button */}
              <button
                onClick={() => searchInputRef.current?.focus()}
                className="md:hidden p-2 rounded-lg hover:bg-ink-800 transition-colors text-parchment-200"
              >
                <SearchIcon className="w-5 h-5" />
              </button>

              {isAuthenticated ? (
                <>
                  {/* Create event quick action for hosts */}
                  {isHost && (
                    <Link
                      to="/events/create"
                      className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gold text-ink-900 font-sans font-semibold text-sm hover:bg-gold-light transition-all shadow-sm hover:-translate-y-0.5"
                    >
                      <span className="text-base leading-none">+</span>
                      <span>Create</span>
                    </Link>
                  )}

                  {/* User avatar + name → opens profile drawer */}
                  <button
                    onClick={() => setDrawerOpen(true)}
                    className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-xl hover:bg-ink-800 transition-colors group"
                  >
                    <span className="text-sm text-parchment-200 font-sans hidden sm:block truncate max-w-[100px]">
                      {user?.name?.split(' ')[0]}
                    </span>
                    <Avatar
                      src={getImageUrl(user?.profileImageUrl)}
                      sx={{ width: 32, height: 32, fontSize: 13 }}
                      className="border-2 border-gold/40 ring-2 ring-transparent group-hover:ring-gold/20 transition-all"
                    >
                      {user?.name?.[0]?.toUpperCase()}
                    </Avatar>
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/login" className="btn-ghost text-parchment-200 hover:text-white hover:bg-ink-800 text-sm py-2">
                    Sign In
                  </Link>
                  <Link to="/register" className="btn-gold text-sm py-2 px-4">
                    Join Now
                  </Link>
                </div>
              )}

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileMenuOpen(o => !o)}
                className="md:hidden p-2 rounded-lg hover:bg-ink-800 transition-colors text-parchment-200 ml-1"
              >
                <MenuIcon open={mobileMenuOpen} />
              </button>
            </div>
          </div>

          {/* ── Mobile Search Bar ── */}
          <div className="md:hidden pb-3">
            <form onSubmit={handleNavSearch}>
              <div className="nav-search w-full">
                <SearchIcon className="w-4 h-4 text-parchment-200/50 shrink-0" />
                <input
                  type="text"
                  value={navQuery}
                  onChange={e => setNavQuery(e.target.value)}
                  placeholder="Search events..."
                />
              </div>
            </form>
          </div>

          {/* ── Mobile Nav Links ── */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-ink-800 py-3 flex flex-col gap-1 animate-fade-in">
              {navLinks.map(link => (
                <Link
                  key={link.label}
                  to={link.to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-sans transition-colors ${
                    location.pathname === link.to
                      ? 'bg-gold/10 text-gold'
                      : 'text-parchment-200 hover:bg-ink-800 hover:text-white'
                  }`}
                >
                  <span>{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              ))}
              {!isAuthenticated && (
                <div className="flex gap-2 mt-2 pt-2 border-t border-ink-800">
                  <Link to="/login" className="flex-1 text-center py-2 rounded-lg text-sm font-sans text-parchment-200 hover:bg-ink-800 transition-colors">Sign In</Link>
                  <Link to="/register" className="flex-1 text-center py-2 rounded-lg text-sm font-sans bg-gold text-ink-900 font-semibold">Join Now</Link>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════
          SECONDARY NAV — Page links (desktop only)
      ═══════════════════════════════════════════════ */}
      {isAuthenticated && (
        <div className="hidden md:block bg-white border-b border-ink-900/8 shadow-sm">
          <div className="page-container">
            <div className="flex items-center gap-1 h-11">
              {navLinks.map(link => (
                <Link
                  key={link.label}
                  to={link.to}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-sans font-medium transition-all ${
                    location.pathname === link.to
                      ? 'bg-gold/10 text-ink-900 font-semibold'
                      : 'text-ink-600 hover:text-ink-900 hover:bg-parchment-100'
                  }`}
                >
                  <span className="text-xs">{link.icon}</span>
                  {link.label}
                </Link>
              ))}

              {/* Right side: admin link */}
              {user?.role === 'SUPER_ADMIN' && (
                <Link
                  to="/admin/dashboard"
                  className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-sans font-medium text-crimson hover:bg-crimson/5 transition-colors"
                >
                  <span className="text-xs">⚙️</span>
                  Admin
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Profile Side Drawer ─── */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: 300,
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
              src={getImageUrl(user?.profileImageUrl)}
              sx={{ width: 52, height: 52, fontSize: 20 }}
              className="border-2 border-gold/40"
            >
              {user?.name?.[0]?.toUpperCase()}
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-serif text-lg text-white truncate">{user?.name}</p>
              <p className="text-xs text-parchment-200/60 font-sans truncate">{user?.email}</p>
              <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gold/15 text-gold-dark border border-gold/25">
                {user?.role?.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Nav items */}
          <nav className="flex-1 flex flex-col gap-1">
            {[
              { label: 'My Profile', icon: '👤', to: '/profile' },
              { label: 'My Registrations', icon: '🎫', to: '/my-registrations' },
              ...(isHost ? [
                { label: 'My Events', icon: '📋', to: '/my-events' },
                { label: 'Create Event', icon: '✨', to: '/events/create' },
              ] : []),
              ...(user?.role === 'SUPER_ADMIN' ? [
                { label: 'Admin Dashboard', icon: '⚙️', to: '/admin/dashboard' },
              ] : []),
            ].map(item => (
              <Link
                key={item.label}
                to={item.to}
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-ink-800 text-parchment-200 hover:text-white transition-all group"
              >
                <span className="text-lg w-7 text-center">{item.icon}</span>
                <span className="font-sans text-sm">{item.label}</span>
                <svg className="w-4 h-4 ml-auto text-ink-600 group-hover:text-ink-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </nav>

          <div className="border-t border-ink-800 pt-4 mt-4">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-crimson/20 text-parchment-200/60 hover:text-crimson transition-all"
            >
              <span className="text-lg w-7 text-center">🚪</span>
              <span className="font-sans text-sm">Sign Out</span>
            </button>
          </div>
        </div>
      </Drawer>

      {/* ─── Page Content ─── */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* ═══════════════════════════════════════════════
          FOOTER — Multi-column upgraded
      ═══════════════════════════════════════════════ */}
      <footer className="bg-ink-900 border-t border-ink-800 pt-12 pb-6 mt-16">
        <div className="page-container">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">

            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 bg-gold rounded-lg flex items-center justify-center">
                  <span className="font-serif font-bold text-ink-900 text-xs">E</span>
                </div>
                <span className="font-serif text-white text-lg">Event<span className="text-gold">Hub</span></span>
              </div>
              <p className="text-parchment-200/50 font-sans text-sm leading-relaxed">
                Your university's premier platform for discovering and managing campus events.
              </p>
            </div>

            {/* Discover */}
            <div>
              <h4 className="text-white font-sans font-semibold text-sm mb-3">Discover</h4>
              <ul className="space-y-2">
                {['Technology', 'Sports', 'Arts & Culture', 'Academic', 'Career'].map(cat => (
                  <li key={cat}>
                    <Link to={`/?category=${cat}`} className="text-parchment-200/50 hover:text-gold text-sm font-sans transition-colors">
                      {cat}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Platform */}
            <div>
              <h4 className="text-white font-sans font-semibold text-sm mb-3">Platform</h4>
              <ul className="space-y-2">
                {[
                  { label: 'Browse Events', to: '/' },
                  { label: 'Create Account', to: '/register' },
                  { label: 'Host an Event', to: '/register' },
                  { label: 'My Registrations', to: '/my-registrations' },
                ].map(item => (
                  <li key={item.label}>
                    <Link to={item.to} className="text-parchment-200/50 hover:text-gold text-sm font-sans transition-colors">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Stats */}
            <div>
              <h4 className="text-white font-sans font-semibold text-sm mb-3">Community</h4>
              <div className="space-y-3">
                {[
                  { icon: '🎓', label: 'University Events' },
                  { icon: '👥', label: 'Student Community' },
                  { icon: '🏆', label: 'Competitions & Hackathons' },
                  { icon: '🤝', label: 'Networking' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2 text-parchment-200/50 text-sm font-sans">
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-ink-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-parchment-200/30 font-sans text-xs">
              © {new Date().getFullYear()} EventHub. All rights reserved. · University Event Management Platform
            </p>
            <div className="flex items-center gap-4">
              {['Privacy Policy', 'Terms of Service', 'Contact'].map(item => (
                <span key={item} className="text-parchment-200/30 hover:text-parchment-200/60 font-sans text-xs cursor-pointer transition-colors">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}