import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { eventsApi } from '../api/Endpoints'
import { useState } from 'react'

const STATUS_STYLES: Record<string, string> = {
  REGISTERED: 'badge-sage',
  WAITLIST: 'bg-amber-50 text-amber-700 border-amber-200',
  CANCELLED: 'bg-gray-50 text-gray-500 border-gray-200',
}

export default function MyRegistrationsPage() {
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['myRegistrations', page],
    queryFn: () => eventsApi.getMyRegistrations(page).then((r: { data: { data: any } }) => r.data.data??null),
  })

  const registrations = data?.content ?? []

  return (
    <div className="page-container py-10 max-w-3xl animate-fade-in">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-ink-900">My Registrations</h1>
        <p className="text-ink-600/60 font-sans text-sm mt-1">
          All events you've registered for or are on the waitlist for.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-2xl" />
          ))}
        </div>
      ) : registrations.length === 0 ? (
        <div className="text-center py-24">
          <div className="text-5xl mb-4">🎫</div>
          <h3 className="font-serif text-xl text-ink-900 mb-2">No registrations yet</h3>
          <p className="text-ink-600/60 font-sans text-sm mb-4">
            Discover upcoming events and start registering!
          </p>
          <Link to="/" className="btn-gold">Browse Events →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {registrations.map(reg => (
            <div key={reg.id} className="card p-5 flex items-center justify-between gap-4 hover:shadow-card-hover transition-shadow">
              <div className="flex-1 min-w-0">
                <Link
                  to={`/events/${reg.eventId}`}
                  className="font-serif text-lg text-ink-900 hover:text-ink-700 transition-colors line-clamp-1"
                >
                  {reg.eventTitle}
                </Link>
                <p className="text-ink-600/50 font-sans text-xs mt-1">
                  Registered {format(new Date(reg.registeredAt), 'MMM d, yyyy')}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`badge border text-xs ${STATUS_STYLES[reg.status]}`}>
                  {reg.status === 'REGISTERED' ? '✓ Registered' :
                   reg.status === 'WAITLIST' ? '⏳ Waitlist' : '✕ Cancelled'}
                </span>
                <Link to={`/events/${reg.eventId}`} className="btn-ghost text-sm py-1.5 px-3">
                  View →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <button onClick={() => setPage(p => p - 1)} disabled={page === 0} className="btn-outline py-2 px-4 text-sm disabled:opacity-40">
            ← Prev
          </button>
          <span className="font-mono text-sm self-center text-ink-600">{page + 1} / {data.totalPages}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page >= data.totalPages - 1} className="btn-outline py-2 px-4 text-sm disabled:opacity-40">
            Next →
          </button>
        </div>
      )}
    </div>
  )
}