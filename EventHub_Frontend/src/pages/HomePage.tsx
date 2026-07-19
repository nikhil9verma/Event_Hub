import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { eventsApi } from '../api/Endpoints'
import EventCard from '../components/event/EventCard'
import EventCardSkeleton from '../components/event/EventCardSkeleton'
import type { Event, EventFilters } from '../types'
import { useAuthStore } from '../store/authStore'

// ─── CATEGORY TABS (Unstop-style) ───
const CATEGORIES = [
  { label: 'All',          icon: '🌐', value: undefined },
  { label: 'Technology',   icon: '💻', value: 'Technology' },
  { label: 'Sports',       icon: '🏆', value: 'Sports' },
  { label: 'Arts',         icon: '🎭', value: 'Arts & Culture' },
  { label: 'Academic',     icon: '🎓', value: 'Academic' },
  { label: 'Social',       icon: '🤝', value: 'Social' },
  { label: 'Career',       icon: '💼', value: 'Career' },
  { label: 'Health',       icon: '❤️', value: 'Health' },
  { label: 'Other',        icon: '⭐', value: 'Other' },
]

// ─── EVENT TYPE FILTER OPTIONS ───
const EVENT_TYPES: { label: string; value: EventFilters['eventType'] | undefined }[] = [
  { label: 'All Types',    value: undefined },
  { label: '👤 Solo',      value: 'SOLO' },
  { label: '👥 Team',      value: 'TEAM' },
  { label: '📢 Open',      value: 'CROWD' },
]


// ─── Compact Stats Banner ───

function StatsBanner({ totalElements }: { totalElements: number }) {
  const { user } = useAuthStore()

  return (
    <div className="bg-white border-b border-ink-900/8">
      <div className="page-container py-7">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="font-serif text-2xl md:text-3xl text-ink-900 font-bold leading-tight">
                {user
                  ? `Welcome back, ${user.name.split(' ')[0]}! 👋`
                  : 'Discover Events on Campus'}
              </h1>
              {totalElements > 0 && (
                <span className="stats-pill">
                  ⚡ {totalElements}+ Events
                </span>
              )}
            </div>
            <p className="text-ink-500 font-sans text-sm">
              Competitions, workshops, hackathons, cultural fests & more
            </p>
          </div>

          {/* Quick stat chips */}
          <div className="flex items-center gap-3 flex-wrap">
            {[
              { icon: '🏆', label: 'Competitions' },
              { icon: '💻', label: 'Hackathons' },
              { icon: '🎓', label: 'Workshops' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-parchment-100 text-xs font-medium text-ink-700 font-sans">
                <span>{s.icon}</span>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Category Tabs Row (Unstop-style) ───
function CategoryTabs({
  activeCategory,
  onSelect,
}: {
  activeCategory: string | undefined
  onSelect: (cat: string | undefined) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Scroll active tab into view
  useEffect(() => {
    const el = scrollRef.current?.querySelector('.active')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activeCategory])

  return (
    <div className="bg-white border-b border-ink-900/8">
      <div className="page-container">
        <div
          ref={scrollRef}
          className="flex items-center gap-2 py-3 overflow-x-auto no-scrollbar"
        >
          {CATEGORIES.map(cat => (
            <button
              key={cat.label}
              onClick={() => onSelect(cat.value)}
              className={`category-tab shrink-0 ${(activeCategory === cat.value || (!activeCategory && !cat.value)) ? 'active' : ''}`}
            >
              <span className="text-xl leading-none">{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Inline Filter Chips Bar ───
function FilterChipsBar({
  filters,
  onChange,
  onClear,
  totalActive,
}: {
  filters: EventFilters
  onChange: (f: Partial<EventFilters>) => void
  onClear: () => void
  totalActive: number
}) {
  const [typeOpen, setTypeOpen]   = useState(false)
  const [availOpen, setAvailOpen] = useState(false)
  const typeRef  = useRef<HTMLDivElement>(null)
  const availRef = useRef<HTMLDivElement>(null)

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (typeRef.current  && !typeRef.current.contains(e.target as Node))  setTypeOpen(false)
      if (availRef.current && !availRef.current.contains(e.target as Node)) setAvailOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const activeType = EVENT_TYPES.find(t => t.value === filters.eventType)

  return (
    <div className="flex items-center gap-2 flex-wrap">

      {/* All Filters / Clear */}
      {totalActive > 0 && (
        <button
          onClick={onClear}
          className="filter-chip active"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9M3 12h5M13 12l4 4m0 0l4-4m-4 4V8" />
          </svg>
          Filters
          <span className="chip-count">{totalActive}</span>
        </button>
      )}

      {/* Event Type Dropdown */}
      <div className="relative" ref={typeRef}>
        <button
          onClick={() => setTypeOpen(o => !o)}
          className={`filter-chip ${filters.eventType ? 'active' : ''}`}
        >
          {activeType?.label ?? 'Team Size'}
          <svg className={`w-3.5 h-3.5 transition-transform ${typeOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {typeOpen && (
          <div className="absolute top-full left-0 mt-1.5 bg-white border border-ink-900/10 rounded-xl shadow-xl z-30 py-1.5 min-w-[140px] animate-fade-in">
            {EVENT_TYPES.map(t => (
              <button
                key={t.label}
                onClick={() => { onChange({ eventType: t.value }); setTypeOpen(false) }}
                className={`w-full text-left px-4 py-2 text-sm font-sans transition-colors ${
                  filters.eventType === t.value || (!filters.eventType && !t.value)
                    ? 'text-ink-900 font-semibold bg-gold/10'
                    : 'text-ink-600 hover:bg-parchment-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Availability chip */}
      <div className="relative" ref={availRef}>
        <button
          onClick={() => setAvailOpen(o => !o)}
          className={`filter-chip ${filters.available ? 'active' : ''}`}
        >
          Availability
          <svg className={`w-3.5 h-3.5 transition-transform ${availOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {availOpen && (
          <div className="absolute top-full left-0 mt-1.5 bg-white border border-ink-900/10 rounded-xl shadow-xl z-30 py-1.5 min-w-[160px] animate-fade-in">
            <button
              onClick={() => { onChange({ available: undefined }); setAvailOpen(false) }}
              className={`w-full text-left px-4 py-2 text-sm font-sans transition-colors ${!filters.available ? 'text-ink-900 font-semibold bg-gold/10' : 'text-ink-600 hover:bg-parchment-100'}`}
            >
              All Events
            </button>
            <button
              onClick={() => { onChange({ available: true }); setAvailOpen(false) }}
              className={`w-full text-left px-4 py-2 text-sm font-sans transition-colors ${filters.available ? 'text-ink-900 font-semibold bg-gold/10' : 'text-ink-600 hover:bg-parchment-100'}`}
            >
              ✅ Open for Registration
            </button>
          </div>
        )}
      </div>

      {/* Active filters summary */}
      {filters.search && (
        <div className="filter-chip active">
          🔍 "{filters.search}"
          <button
            onClick={() => onChange({ search: undefined })}
            className="ml-1 hover:text-crimson"
          >✕</button>
        </div>
      )}
    </div>
  )
}


// ─── Pagination ───
function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null
  const pages = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i)
  return (
    <div className="flex items-center justify-center gap-1 mt-10">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 0}
        className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-sans font-medium border border-ink-900/15 text-ink-700 hover:bg-parchment-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Prev
      </button>

      {pages.map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`w-9 h-9 rounded-lg text-sm font-sans font-medium transition-colors ${
            p === page
              ? 'bg-ink-900 text-gold'
              : 'border border-ink-900/15 text-ink-700 hover:bg-parchment-100'
          }`}
        >
          {p + 1}
        </button>
      ))}

      {totalPages > 7 && page < totalPages - 1 && <span className="text-ink-400 px-1">…</span>}

      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages - 1}
        className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-sans font-medium border border-ink-900/15 text-ink-700 hover:bg-parchment-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Next
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )
}

// ─── Mobile Filter Drawer ───
function MobileFilterDrawer({
  open,
  onClose,
  filters,
  onChange,
  onClear,
}: {
  open: boolean
  onClose: () => void
  filters: EventFilters
  onChange: (f: Partial<EventFilters>) => void
  onClear: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 xl:hidden">
      <div className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-serif text-lg font-bold text-ink-900">Filters</h3>
          <button onClick={onClear} className="text-xs text-crimson font-medium font-sans">Clear All</button>
        </div>

        <div className="space-y-5">
          {/* Event Type */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink-500 mb-2.5">Event Type</h4>
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPES.map(t => (
                <button
                  key={t.label}
                  onClick={() => onChange({ eventType: t.value })}
                  className={`filter-chip ${filters.eventType === t.value || (!filters.eventType && !t.value) ? 'active' : ''}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Availability */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink-500 mb-2.5">Availability</h4>
            <div className="flex gap-2">
              <button onClick={() => onChange({ available: undefined })} className={`filter-chip ${!filters.available ? 'active' : ''}`}>All Events</button>
              <button onClick={() => onChange({ available: true })} className={`filter-chip ${filters.available ? 'active' : ''}`}>Open for Registration</button>
            </div>
          </div>

        </div>

        <button onClick={onClose} className="w-full btn-primary mt-6 py-3 rounded-xl">
          Apply Filters
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ───
export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Read initial state from URL
  const urlSearch   = searchParams.get('q')       || ''
  const urlCategory = searchParams.get('category') || ''

  const [filters, setFilters] = useState<EventFilters>({
    page:     0,
    size:     9,
    search:   urlSearch || undefined,
    category: urlCategory || undefined,
  })

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)

  // Sync filters whenever URL search params change (navbar search, category links, etc.)
  useEffect(() => {
    const q        = searchParams.get('q')       || ''
    const cat      = searchParams.get('category') || ''
    setFilters(f => ({
      ...f,
      search:   q       || undefined,
      category: cat     || undefined,
      page:     0,
    }))
  }, [searchParams])

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['events', filters],
    queryFn:  () => eventsApi.getEvents(filters).then((r: any) => r.data.data ?? null),
    refetchInterval: 60000,
    placeholderData: (prev: any) => prev,
  })

  const events: Event[] = data?.content ?? []
  const totalPages   = data?.totalPages   ?? 0
  const totalElements = data?.totalElements ?? 0

  const handleFilterChange = (newFilters: Partial<EventFilters>) => {
    setFilters(f => ({ ...f, ...newFilters, page: 0 }))
  }

  const handleCategorySelect = (cat: string | undefined) => {
    const params = new URLSearchParams(searchParams)
    if (cat) params.set('category', cat)
    else params.delete('category')
    setSearchParams(params)
    setFilters(f => ({ ...f, category: cat, page: 0 }))
  }

  const handleClearFilters = () => {
    setFilters({ page: 0, size: 9 })
    setSearchParams({})
  }

  const activeFilterCount = [
    filters.eventType,
    filters.available,
  ].filter(Boolean).length

  return (
    <div>
      {/* Stats Banner */}
      <StatsBanner totalElements={totalElements} />

      {/* Category Tabs */}
      <CategoryTabs
        activeCategory={filters.category}
        onSelect={handleCategorySelect}
      />

      {/* ─── Main Content ─── */}
      <div className="page-container py-6">
        <div className="flex gap-6">

          {/* ─── LEFT: Events Area ─── */}
          <div className="flex-1 min-w-0">

            {/* Filter Chips Bar */}
            <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
              <FilterChipsBar
                filters={filters}
                onChange={handleFilterChange}
                onClear={handleClearFilters}
                totalActive={activeFilterCount}
              />

              {/* Mobile: Filters button + result count */}
              <div className="flex items-center gap-3 ml-auto">
                {data && (
                  <span className="text-xs text-ink-500 font-sans whitespace-nowrap">
                    {totalElements} events
                  </span>
                )}
                <button
                  onClick={() => setMobileFilterOpen(true)}
                  className="xl:hidden filter-chip"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9M3 12h5" />
                  </svg>
                  Filters {activeFilterCount > 0 && <span className="chip-count">{activeFilterCount}</span>}
                </button>
              </div>
            </div>

            {/* Section Title */}
            {filters.category && (
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-gold rounded-full" />
                <h2 className="font-serif text-xl text-ink-900 font-semibold">
                  {filters.category} Events
                </h2>
                <span className="text-sm text-ink-500 font-sans ml-1">
                  {totalElements} found
                </span>
              </div>
            )}

            {/* Search result label */}
            {filters.search && (
              <div className="flex items-center gap-2 mb-4 text-sm font-sans text-ink-600">
                <svg className="w-4 h-4 text-ink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Results for <strong className="text-ink-900 ml-1">"{filters.search}"</strong>
                <button
                  onClick={() => { handleFilterChange({ search: undefined }); setSearchParams({}) }}
                  className="ml-1 text-crimson hover:text-red-700"
                >✕</button>
              </div>
            )}

            {/* ─── Event Grid ─── */}
            {isError ? (
              <div className="text-center py-24 bg-white rounded-2xl border border-ink-900/5">
                <div className="text-6xl mb-4">⚠️</div>
                <h3 className="font-serif text-xl text-ink-900 mb-2">Error Loading Events</h3>
                <p className="text-ink-600/60 font-sans text-sm mb-6">
                  There was a problem connecting to the server. Please try again later.
                </p>
                <button onClick={() => window.location.reload()} className="btn-outline">
                  Retry
                </button>
              </div>
            ) : isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <EventCardSkeleton key={i} />)}
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-24 bg-white rounded-2xl border border-ink-900/5">
                <div className="text-6xl mb-4">🎭</div>
                <h3 className="font-serif text-xl text-ink-900 mb-2">No events found</h3>
                <p className="text-ink-600/60 font-sans text-sm mb-6">
                  Try adjusting your filters or search terms.
                </p>
                <button onClick={handleClearFilters} className="btn-outline">
                  Clear all filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {events.map((event: Event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
                <Pagination
                  page={filters.page || 0}
                  totalPages={totalPages}
                  onChange={p => setFilters(f => ({ ...f, page: p }))}
                />
              </>
            )}
          </div>

        </div>
      </div>

      {/* Global syncing toast */}
      {isFetching && !isLoading && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-ink-900 text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-3 text-xs font-bold uppercase tracking-wider animate-fade-in border border-white/10">
          <div className="w-2 h-2 bg-gold rounded-full animate-pulse" />
          Syncing Events...
        </div>
      )}

      {/* Mobile Filter Drawer */}
      <MobileFilterDrawer
        open={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        filters={filters}
        onChange={handleFilterChange}
        onClear={handleClearFilters}
      />
    </div>
  )
}