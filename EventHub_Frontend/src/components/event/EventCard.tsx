import { Link } from 'react-router-dom'
import { format, formatDistanceToNow, isPast } from 'date-fns'
import { Event } from '../../types'

export const getImageUrl = (url?: string) => {
  if (!url) return 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop'
  return url.startsWith('http') ? url : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${url}`
}

// ─── Category color map ───
const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'Technology':   { bg: 'bg-blue-50',   text: 'text-blue-700' },
  'Sports':       { bg: 'bg-green-50',  text: 'text-green-700' },
  'Arts & Culture': { bg: 'bg-purple-50', text: 'text-purple-700' },
  'Academic':     { bg: 'bg-amber-50',  text: 'text-amber-700' },
  'Social':       { bg: 'bg-pink-50',   text: 'text-pink-700' },
  'Career':       { bg: 'bg-indigo-50', text: 'text-indigo-700' },
  'Health':       { bg: 'bg-red-50',    text: 'text-red-700' },
}

function getCategoryStyle(category: string) {
  return CATEGORY_COLORS[category] ?? { bg: 'bg-ink-50', text: 'text-ink-700' }
}

// ─── Deadline chip ───
function DeadlineChip({ deadline }: { deadline: string }) {
  const date = new Date(deadline)
  if (isPast(date)) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-crimson bg-crimson/10 border border-crimson/20 rounded-full px-2 py-0.5 font-sans">
        Reg. Closed
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-ink-700 bg-parchment-100 border border-ink-900/10 rounded-full px-2 py-0.5 font-sans">
      🗓 {formatDistanceToNow(date, { addSuffix: true }).replace('in about', 'in').replace('in less than', 'in <')}
    </span>
  )
}

export default function EventCard({ event, featured }: { event: Event; featured?: boolean }) {
  if (!event) return null

  const isCrowdEvent  = event.requiresRegistration === false
  const isCompleted   = event.status === 'COMPLETED'
  const isSuspended   = event.status === 'SUSPENDED'
  const isTeamEvent   = event.maxTeamSize > 1 && !isCrowdEvent

  const teamText = isCrowdEvent
    ? 'Crowd Event'
    : isTeamEvent
      ? (event.minTeamSize === event.maxTeamSize
          ? `Team of ${event.maxTeamSize}`
          : `Team (${event.minTeamSize}–${event.maxTeamSize})`)
      : 'Solo Event'

  const fillPct        = Math.min(100, (event.registrationCount / Math.max(1, event.maxParticipants)) * 100)
  const isWaitlist     = event.registrationCount >= event.maxParticipants
  const isUserRegistered   = event.currentUserRegistrationStatus === 'REGISTERED'
  const isUserWaitlisted   = event.currentUserRegistrationStatus === 'WAITLIST'
  const isPendingInvite    = event.currentUserRegistrationStatus === 'PENDING_INVITATION'
  const isIncomplete       = event.currentUserRegistrationStatus === 'INCOMPLETE'
  const isPastDeadline     = isPast(new Date(event.registrationDeadline))

  const catStyle = getCategoryStyle(event.category)

  return (
    <div className={`group relative bg-white rounded-2xl border ${featured ? 'border-gold/40' : 'border-ink-900/6'} shadow-card hover:shadow-card-hover transition-all duration-300 flex flex-col overflow-hidden hover:-translate-y-1`}>

      {/* ── IMAGE ── */}
      <Link to={`/events/${event.id}`} className="relative aspect-square w-full bg-ink-900 overflow-hidden shrink-0 block">
        <img
          src={getImageUrl(event.cardImageUrl || event.posterUrl)}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out opacity-90 group-hover:opacity-100"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/70 via-transparent to-transparent" />

        {/* Category badge — top left */}
        <div className={`absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full text-[10px] font-bold font-sans tracking-wide shadow-sm ${catStyle.bg} ${catStyle.text}`}>
          {event.category}
        </div>

        {/* Date badge — top right */}
        <div className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-ink-900/80 backdrop-blur-md border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
          {format(new Date(event.eventDate), 'MMM d')}
        </div>

        {/* Completed / Suspended overlay */}
        {(isCompleted || isSuspended) && (
          <div className="absolute inset-0 bg-ink-900/50 backdrop-blur-[2px] flex items-center justify-center z-10">
            <span className="px-4 py-1.5 bg-ink-900/80 text-white font-serif tracking-widest uppercase text-xs rounded-lg shadow-xl">
              {isCompleted ? 'Completed' : 'Suspended'}
            </span>
          </div>
        )}
      </Link>

      {/* ── BODY ── */}
      <div className="p-4 flex flex-col flex-1 gap-3">

        {/* Title */}
        <Link to={`/events/${event.id}`}>
          <h3 className="font-serif text-base font-bold text-ink-900 leading-snug line-clamp-2 hover:text-yellow-700 transition-colors">
            {event.title}
          </h3>
        </Link>

        {/* Host + Details row */}
        <div className="flex items-center gap-2 text-xs text-ink-500 font-sans">
          {/* Host */}
          <div className="w-5 h-5 rounded-full bg-ink-100 overflow-hidden shrink-0 flex items-center justify-center text-[9px] font-bold text-ink-600">
            {event.hostImageUrl
              ? <img src={getImageUrl(event.hostImageUrl)} alt={event.hostName} className="w-full h-full object-cover" />
              : event.hostName?.[0]?.toUpperCase()
            }
          </div>
          <span className="truncate text-ink-600">{event.hostName}</span>
          <span className="text-ink-300">•</span>

          {/* Venue */}
          <svg className="w-3 h-3 shrink-0 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          </svg>
          <span className="truncate">{event.venue}</span>
        </div>

        {/* Meta chips row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Time */}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-ink-600 bg-parchment-100 font-sans">
            🕐 {format(new Date(event.eventDate), 'h:mm a')}
          </span>

          {/* Team type */}
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium font-sans ${
            isCrowdEvent  ? 'bg-indigo-50 text-indigo-600' :
            isTeamEvent   ? 'bg-amber-50 text-amber-700' :
                            'bg-parchment-100 text-ink-600'
          }`}>
            {isCrowdEvent ? '📢' : isTeamEvent ? '👥' : '👤'} {teamText}
          </span>

          {/* Deadline */}
          {!isCrowdEvent && <DeadlineChip deadline={event.registrationDeadline} />}
        </div>

        {/* Registration progress (not for crowd events) */}
        {!isCrowdEvent && (
          <div>
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider mb-1.5">
              <span className="text-ink-500">{event.registrationCount} registered</span>
              {isWaitlist ? (
                <span className="text-crimson">{event.waitlistCount} on waitlist</span>
              ) : (
                <span className={event.availableSeats <= 5 ? 'text-amber-500' : 'text-ink-400'}>
                  {event.availableSeats} spots left
                </span>
              )}
            </div>
            <div className="w-full bg-ink-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  fillPct >= 100 ? 'bg-crimson' : fillPct > 80 ? 'bg-amber-500' : 'bg-sage'
                }`}
                style={{ width: `${fillPct}%` }}
              />
            </div>
          </div>
        )}

        {/* ── CTA Button ── */}
        <div className="mt-auto pt-1">
          {isCrowdEvent ? (
            <Link to={`/events/${event.id}`} className="block w-full text-center py-2.5 rounded-xl text-sm font-bold shadow-sm bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition-colors">
              📢 View Event Info
            </Link>
          ) : isUserRegistered ? (
            <Link to={`/events/${event.id}`} className="block w-full text-center py-2.5 rounded-xl text-sm font-bold shadow-sm bg-sage/10 text-sage border border-sage/30 hover:bg-sage/20 transition-colors">
              ✅ You're Registered
            </Link>
          ) : isUserWaitlisted ? (
            <Link to={`/events/${event.id}`} className="block w-full text-center py-2.5 rounded-xl text-sm font-bold shadow-sm bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 transition-colors">
              ⏳ On Waitlist
            </Link>
          ) : isPendingInvite ? (
            <Link to={`/events/${event.id}`} className="block w-full text-center py-2.5 rounded-xl text-sm font-bold shadow-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors">
              👋 Confirm Invite
            </Link>
          ) : isIncomplete ? (
            <Link to={`/events/${event.id}`} className="block w-full text-center py-2.5 rounded-xl text-sm font-bold shadow-sm bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200 transition-colors">
              ⚠️ Incomplete Team
            </Link>
          ) : (
            <Link
              to={`/events/${event.id}`}
              className={`block w-full text-center py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${
                isCompleted || isSuspended || isPastDeadline
                  ? 'bg-parchment-100 text-ink-500 hover:bg-parchment-200'
                  : isWaitlist
                    ? 'bg-ink-900 text-white hover:bg-ink-800 hover:-translate-y-0.5'
                    : 'bg-gold text-ink-900 hover:bg-gold-light hover:-translate-y-0.5 shadow-gold/30'
              }`}
            >
              {isCompleted || isSuspended ? 'View Details' : isPastDeadline ? 'Registration Closed' : isWaitlist ? 'Join Waitlist' : 'View & Register'}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}