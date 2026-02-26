import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { eventsApi } from '../api/Endpoints'
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
    <div className="relative w-full py-20 md:py-28 bg-ink-900 overflow-hidden">
      
      {/* The Background Image (Positioned on the right side) */}
      <div 
        className="absolute top-0 right-0 w-full md:w-3/4 h-full z-0 pointer-events-none"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=2070')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Gradient Mask: Solid dark blue on left fading to transparent on right */}
        <div className="absolute inset-0 bg-gradient-to-r from-ink-900 via-ink-900/90 to-transparent" />
      </div>

      {/* Hero Content (Positioned on top of the background) */}
      <div className="relative z-10 page-container flex items-center h-full">
        <div className="max-w-2xl">
          
          <span className="text-gold font-sans text-sm font-bold tracking-widest uppercase mb-4 block">
            University Event Hub
          </span>
          
          <h1 className="font-serif text-5xl md:text-6xl text-white mb-4 leading-tight">
            {user ? `Welcome back, ${user.name.split(' ')[0]}.` : 'Discover What\'s'}
            {!user && <span className="block text-gold">Happening on Campus</span>}
          </h1>
          
          <p className="text-ink-200 font-sans text-lg mb-10 transition-all duration-500">
            {HERO_QUOTES[quoteIdx]}
          </p>

          {/* Search Bar matching the mockup */}
          <div className="flex gap-4 max-w-xl">
            <div className="flex-1 bg-ink-800/80 backdrop-blur-md border border-ink-700/50 rounded-xl px-4 py-3 flex items-center shadow-lg transition-all focus-within:border-gold/50 focus-within:bg-ink-800">
              <span className="text-ink-400 mr-3">🔍</span>
              <input 
                type="text" 
                placeholder="Search events, categories..." 
                value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && onSearch(q)}
                className="bg-transparent border-none outline-none text-white w-full placeholder:text-ink-400/70 font-sans"
              />
            </div>
            <button 
              onClick={() => onSearch(q)}
              className="btn-gold px-8 py-3 rounded-xl font-semibold shadow-lg hover:-translate-y-0.5 transition-transform"
            >
              Search
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <button onClick={() => onChange(page - 1)} disabled={page === 0} className="btn-outline py-2 px-4 text-sm disabled:opacity-40">
        ← Prev
      </button>
      <span className="font-mono text-sm text-ink-600">
        {page + 1} / {totalPages}
      </span>
      <button onClick={() => onChange(page + 1)} disabled={page >= totalPages - 1} className="btn-outline py-2 px-4 text-sm disabled:opacity-40">
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
    refetchInterval: 10000, 
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