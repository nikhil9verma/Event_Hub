import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { eventsApi } from '../api/Endpoints'
import { useState } from 'react'
import type { EventStatus, Event } from '../types'
import DeleteEventModal from '../components/event/DeleteEventModal'

const STATUS_BADGE: Record<EventStatus, string> = {
  ACTIVE: 'badge-sage',
  FULL: 'bg-amber-50 text-amber-700 border-amber-200',
  COMPLETED: 'badge-ink',
  SUSPENDED: 'badge-crimson',
}

export default function MyEventsPage() {
  const [page, setPage] = useState(0)
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['myEvents', page],
    queryFn: () => eventsApi.getMyEvents(page).then((r: { data: { data: any } }) => r.data.data ?? null),
  })

  const events = data?.content ?? []

  return (
    <div className="page-container py-10 max-w-4xl animate-fade-in">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl text-ink-900">My Events</h1>
          <p className="text-ink-600/60 font-sans text-sm mt-1">Events you've created and are managing.</p>
        </div>
        <Link to="/events/create" className="btn-gold">
          + Create Event
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-24">
          <div className="text-5xl mb-4">📋</div>
          <h3 className="font-serif text-xl text-ink-900 mb-2">No events yet</h3>
          <p className="text-ink-600/60 font-sans text-sm mb-4">Create your first event to get started.</p>
          <Link to="/events/create" className="btn-gold">Create Event →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event: Event) => {
            const fillPct = Math.min(100, (event.registrationCount / event.maxParticipants) * 100)
            return (
              <div key={event.id} className="card p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link to={`/events/${event.id}`} className="font-serif text-lg text-ink-900 hover:text-ink-700 truncate">
                        {event.title}
                      </Link>
                      <span className={`badge border text-[11px] ${STATUS_BADGE[event.status]}`}>
                        {event.status}
                      </span>
                      {event.trending && <span className="badge badge-gold text-[10px]">🔥</span>}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-ink-600/50 font-sans">
                      <span>📅 {format(new Date(event.eventDate), 'MMM d, yyyy')}</span>
                      <span>📍 {event.venue}</span>
                      <span>👥 {event.registrationCount}/{event.maxParticipants}</span>
                    </div>
                    <div className="mt-3 max-w-xs">
                      <div className="progress-bar">
                        <div
                          className={`progress-fill ${fillPct >= 100 ? 'bg-crimson' : fillPct >= 75 ? 'bg-amber-500' : 'bg-sage'}`}
                          style={{ width: `${fillPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Reorganized Action Buttons: Analytics beside, Edit above Delete */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Link to={`/events/${event.id}/analytics`} className="btn-outline py-2 px-3 text-xs h-fit">
                      📊 Analytics
                    </Link>
                    
                    <div className="flex flex-col gap-2">
                      <Link 
                        to={`/events/${event.id}/edit`} 
                        className="btn-ghost py-1.5 px-3 text-xs text-center border border-ink-900/10 hover:bg-ink-50"
                      >
                        ✏️ Edit Event
                      </Link>
                      <button 
                        onClick={() => setEventToDelete(event)}
                        className="btn-ghost py-1.5 px-3 text-xs text-crimson hover:bg-crimson/10 transition-colors border border-crimson/10"
                      >
                        🗑️ Delete Event
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )
          })}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <button onClick={() => setPage(p => p - 1)} disabled={page === 0} className="btn-outline py-2 px-4 text-sm disabled:opacity-40">← Prev</button>
          <span className="font-mono text-sm self-center text-ink-600">{page + 1} / {data.totalPages}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page >= data.totalPages - 1} className="btn-outline py-2 px-4 text-sm disabled:opacity-40">Next →</button>
        </div>
      )}

      <DeleteEventModal 
        event={eventToDelete} 
        onClose={() => setEventToDelete(null)} 
      />
    </div>
  )
}