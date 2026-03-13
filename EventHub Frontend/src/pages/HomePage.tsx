import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
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

  const [recommendations, setRecommendations] = useState<Event[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const interval = setInterval(() => setQuoteIdx(i => (i + 1) % HERO_QUOTES.length), 4000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!q.trim()) {
      setRecommendations([])
      setIsDropdownOpen(false)
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    setIsDropdownOpen(true)

    const delayDebounceFn = setTimeout(async () => {
      try {
        const response = await eventsApi.getEvents({ search: q, page: 0, size: 10 } as EventFilters)
        const fetchedEvents = response?.data?.data?.content || []
        setRecommendations(fetchedEvents)
      } catch (error) {
        console.error("Failed to fetch recommendations:", error)
        setRecommendations([])
      } finally {
        setIsSearching(false)
      }
    }, 500)

    return () => clearTimeout(delayDebounceFn)
  }, [q])

  return (
    <div className="relative w-full py-20 md:py-28 bg-ink-900 overflow-hidden">
      
      <div 
        className="absolute top-0 right-0 w-full md:w-3/4 h-full z-0 pointer-events-none"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=2070')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-ink-900 via-ink-900/90 to-transparent" />
      </div>

      <div className="relative z-10 page-container flex items-center h-full">
        <div className="max-w-2xl w-full">
          
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

          <div className="flex gap-4 max-w-xl w-full">
            <div className="relative flex-1" ref={dropdownRef}>
              
              <div className="bg-ink-800/80 backdrop-blur-md border border-ink-700/50 rounded-xl px-4 py-3 flex items-center shadow-lg transition-all focus-within:border-gold/50 focus-within:bg-ink-800 w-full">
                {isSearching ? (
                  <svg className="w-5 h-5 text-gold animate-spin mr-3 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <span className="text-ink-400 mr-3 shrink-0">🔍</span>
                )}
                
                <input 
                  type="text" 
                  placeholder="Search events, categories..." 
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  onFocus={() => { if (q) setIsDropdownOpen(true) }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      setIsDropdownOpen(false)
                      onSearch(q)
                    }
                  }}
                  className="bg-transparent border-none outline-none text-white w-full placeholder:text-ink-400/70 font-sans"
                />

                {q && !isSearching && (
                  <button 
                    onClick={() => {
                      setQ('')
                      setIsDropdownOpen(false)
                      onSearch('')
                    }}
                    className="ml-2 text-ink-400 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>

              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-ink-900/5 shadow-xl overflow-hidden z-50 animate-fade-in">
                  {isSearching && recommendations.length === 0 ? (
                    <div className="p-4 text-sm text-ink-500 text-center flex items-center justify-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-gold border-t-transparent animate-spin"></span>
                      Searching...
                    </div>
                  ) : recommendations.length > 0 ? (
                    <ul className="max-h-80 overflow-y-auto py-2">
                      {recommendations.slice(0, 10).map((event) => (
                        <li key={event.id}>
                          <Link
                            to={`/events/${event.id}`}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-ink-50 transition-colors group"
                          >
                            <div className="w-8 h-8 rounded bg-ink-100 flex items-center justify-center shrink-0">
                              <span className="text-lg">🎫</span>
                            </div>
                            <div className="flex flex-col overflow-hidden">
                              <span className="text-sm font-bold text-ink-900 truncate group-hover:text-yellow-600 transition-colors">
                                {event.title}
                              </span>
                              <span className="text-xs text-ink-500 truncate">
                                {event.category} • {new Date(event.eventDate).toLocaleDateString()}
                              </span>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : q.trim() ? (
                    <div className="p-4 text-sm text-ink-500 text-center">
                      No events found for "{q}"
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <button 
              onClick={() => {
                setIsDropdownOpen(false)
                onSearch(q)
              }}
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

  const handleFilterChange = (newFilters: Partial<EventFilters>) => {
    setFilters(f => ({ ...f, ...newFilters, page: 0 }))
  }

  // ─── NEW: Explicitly wipe all filters back to default ───
  const handleClearFilters = () => {
    setFilters({ page: 0, size: 9, search: searchInput || undefined });
  }

  const events = data?.content ?? []
  const totalPages = data?.totalPages ?? 0

  return (
    <div>
      <Hero onSearch={handleSearch} />

      <div className="page-container py-10">
        {data && (
          <div className="flex items-center gap-6 mb-8 text-sm font-sans text-ink-600/60 min-h-[24px]">
            {filters.search && (
              <span className="flex items-center gap-1">
                Results for <strong className="text-ink-900">"{filters.search}"</strong>
                <button onClick={() => handleSearch('')} className="ml-1 text-red-500 hover:text-red-700 font-bold">✕</button>
              </span>
            )}
            
            {isFetching && !isLoading && (
              <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-ink-900 text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-3 text-xs font-bold uppercase tracking-wider animate-fade-in border border-white/10">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                Syncing Events...
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">
          <aside>
            {/* ─── PASSED onClear PROP HERE ─── */}
            <FilterPanel filters={filters} onChange={handleFilterChange} onClear={handleClearFilters} />
          </aside>

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
                <button onClick={handleClearFilters} className="btn-outline mt-4">
                  Clear all filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {events.map((event: Event, i: number) => (
                    <EventCard key={event.id} event={event}  />
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