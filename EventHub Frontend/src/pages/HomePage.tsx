import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {eventsApi}  from '../api/Endpoints'
import EventCard from '../components/event/EventCard'
import EventCardSkeleton from '../components/event/EventCardSkeleton'
import FilterPanel from '../components/event/FilterPanel'
import type { Event, EventFilters } from '../types'
import { useAuthStore } from '../store/authStore'

const HERO_QUOTES = [
  "Where ideas meet community.",
  "Your campus, your story.",
  "Events that define your years.",
]

function Hero({ onSearch }: { onSearch: (q: string) => void }) {
  const [q, setQ] = useState('')
  const [quoteIdx, setQuoteIdx] = useState(0)
  const { user } = useAuthStore()

  useEffect(() => {
    const interval = setInterval(() => setQuoteIdx(i => (i + 1) % HERO_QUOTES.length), 4000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="bg-ink-900 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-gold/5" />
        <div className="absolute -bottom-10 -left-10 w-64 h-64 rounded-full bg-ink-800" />
        <div className="absolute top-1/2 left-1/4 w-px h-32 bg-gold/20 rotate-12" />
        <div className="absolute top-1/3 right-1/3 w-px h-24 bg-gold/10 -rotate-6" />
      </div>

      <div className="page-container relative py-16 md:py-24">
        <div className="max-w-2xl">
          <p className="text-gold/70 font-sans text-sm font-medium tracking-widest uppercase mb-4">
            University Event Hub
          </p>
          <h1 className="font-serif text-4xl md:text-5xl text-white mb-3 leading-tight">
            {user ? `Welcome back, ${user.name.split(' ')[0]}.` : 'Discover What\'s'}
            {!user && <span className="block text-gold">Happening on Campus</span>}
          </h1>
          <p className="text-parchment-200/60 font-sans text-lg mb-8 transition-all duration-500">
            {HERO_QUOTES[quoteIdx]}
          </p>

          {/* Search bar */}
          <div className="flex gap-2 max-w-lg">
            <div className="flex-1 relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-parchment-200/40">🔍</span>
              <input
                type="text"
                placeholder="Search events, categories..."
                value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && onSearch(q)}
                className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-ink-800 border border-ink-700 text-white placeholder-parchment-200/30 font-sans focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/30 transition-all"
              />
            </div>
            <button
              onClick={() => onSearch(q)}
              className="btn-gold px-6 rounded-xl"
            >
              Search
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Pagination({ page, totalPages, onChange }: {
  page: number; totalPages: number; onChange: (p: number) => void
}) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 0}
        className="btn-outline py-2 px-4 text-sm disabled:opacity-40"
      >
        ← Prev
      </button>
      <span className="font-mono text-sm text-ink-600">
        {page + 1} / {totalPages}
      </span>
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages - 1}
        className="btn-outline py-2 px-4 text-sm disabled:opacity-40"
      >
        Next →
      </button>
    </div>
  )
}

export default function HomePage() {
  const [filters, setFilters] = useState<EventFilters>({ page: 0, size: 9 })
  const [searchInput, setSearchInput] = useState('')

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['events', filters],
    queryFn: () => eventsApi.getEvents(filters).then((r: { data: { data: any } }) => r.data.data??null),
    refetchInterval: 10000, // Real-time seat polling
    placeholderData: (prev) => prev,
  })

  const handleSearch = (q: string) => {
    setSearchInput(q)
    setFilters(f => ({ ...f, search: q || undefined, page: 0 }))
  }

  const handleFilterChange = (newFilters: EventFilters) => {
    setFilters(f => ({ ...f, ...newFilters, page: 0 }))
  }

  const events = data?.content ?? []
  const totalPages = data?.totalPages ?? 0
  const totalElements = data?.totalElements ?? 0

  return (
    <div>
      <Hero onSearch={handleSearch} />

      <div className="page-container py-10">
        {/* Stats bar */}
        {data && (
          <div className="flex items-center gap-6 mb-8 text-sm font-sans text-ink-600/60">
            {filters.search && (
              <span className="flex items-center gap-1">
                Results for <strong className="text-ink-900">"{filters.search}"</strong>
                <button onClick={() => handleSearch('')} className="ml-1 text-crimson hover:text-crimson/70">✕</button>
              </span>
            )}
            {isFetching && !isLoading && (
              <span className="flex items-center gap-1.5 text-gold">
                <div className="w-2 h-2 bg-gold rounded-full animate-pulse" />
                Updating...
              </span>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">
          {/* Filters */}
          <aside>
            <FilterPanel filters={filters} onChange={handleFilterChange} />
          </aside>

          {/* Events grid */}
          <div>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => <EventCardSkeleton key={i} />)}
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-24">
                <div className="text-5xl mb-4">🎭</div>
                <h3 className="font-serif text-xl text-ink-900 mb-2">No events found</h3>
                <p className="text-ink-600/60 font-sans text-sm">Try adjusting your filters or search terms.</p>
                <button onClick={() => setFilters({ page: 0, size: 9 })} className="btn-outline mt-4">
                  Clear all filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {events.map((event: Event, i: number) => (
                    <EventCard key={event.id} event={event} featured={i === 0 && !filters.search} />
                  ))}
                </div>
                <Pagination page={filters.page || 0} totalPages={totalPages} onChange={p => setFilters(f => ({ ...f, page: p }))} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}