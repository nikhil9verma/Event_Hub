import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { Event } from '../../types'

export const getImageUrl = (url?: string) => {
  if (!url) return 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop'
  return url.startsWith('http') ? url : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${url}`
}

export default function EventCard({ event, featured }: { event: Event; featured?: boolean }) {
  if (!event) return null; // Safety guard

  const isCrowdEvent = event.requiresRegistration === false;
  const isCompleted = event.status === 'COMPLETED'
  const isSuspended = event.status === 'SUSPENDED'
  const isTeamEvent = event.maxTeamSize > 1 && !isCrowdEvent

  // Format team size text elegantly
  const teamText = isCrowdEvent ? 'Crowd Event (No Reg.)' : isTeamEvent 
    ? (event.minTeamSize === event.maxTeamSize ? `Team of ${event.maxTeamSize}` : `Team (${event.minTeamSize}-${event.maxTeamSize})`) 
    : 'Solo Event'

  // Calculate Registration Progress
  const fillPct = Math.min(100, (event.registrationCount / Math.max(1, event.maxParticipants)) * 100)
  const isWaitlist = event.registrationCount >= event.maxParticipants

  // Check User's Registration Status
  const isUserRegistered = event.currentUserRegistrationStatus === 'REGISTERED'
  const isUserWaitlisted = event.currentUserRegistrationStatus === 'WAITLIST'
  const isPendingInvite = event.currentUserRegistrationStatus === 'PENDING_INVITATION'
  const isIncomplete = event.currentUserRegistrationStatus === 'INCOMPLETE'

  return (
    <div className={`group relative bg-white rounded-2xl border ${featured ? 'border-yellow-500 shadow-md' : 'border-ink-900/5'} shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col w-[320px] h-[440px] shrink-0 overflow-hidden hover:-translate-y-1`}>
      
      {/* ─── IMAGE HEADER ─── */}
      <Link to={`/events/${event.id}`} className="relative h-44 w-full bg-ink-900 overflow-hidden shrink-0 block">
        <img 
          src={getImageUrl(event.cardImageUrl || event.posterUrl)} 
          alt={event.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out opacity-90 group-hover:opacity-100" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/80 via-transparent to-transparent" />
        
        <div className="absolute top-3 left-3 px-2.5 py-1 bg-white/95 backdrop-blur-sm rounded text-[10px] font-bold uppercase tracking-wider text-ink-900 shadow-sm">
          {event.category}
        </div>
        <div className="absolute top-3 right-3 px-2.5 py-1 bg-ink-900/80 backdrop-blur-md border border-white/10 rounded text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
          {format(new Date(event.eventDate), 'MMM d')}
        </div>

        {(isCompleted || isSuspended) && (
          <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-[2px] flex items-center justify-center z-10">
            <span className="px-4 py-1.5 bg-ink-900/80 text-white font-serif tracking-widest uppercase text-xs rounded-lg shadow-xl">
              {isCompleted ? 'Completed' : 'Suspended'}
            </span>
          </div>
        )}
      </Link>

      {/* ─── CARD BODY ─── */}
      <div className="p-4 flex flex-col flex-1">
        <Link to={`/events/${event.id}`}>
          <h3 className="font-serif text-lg font-bold text-ink-900 leading-snug mb-3 line-clamp-2 hover:text-yellow-600 transition-colors">
            {event.title}
          </h3>
        </Link>
        
        {/* Key Details Grid */}
        <div className="space-y-2 text-xs text-ink-500 font-sans mb-auto">
          <div className="flex items-center gap-2.5">
            <svg className="w-3.5 h-3.5 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="font-medium">{format(new Date(event.eventDate), 'h:mm a')}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <svg className="w-3.5 h-3.5 text-ink-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <span className="truncate">{event.venue}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <svg className={`w-3.5 h-3.5 ${isCrowdEvent ? 'text-indigo-500' : isTeamEvent ? 'text-yellow-500' : 'text-ink-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isCrowdEvent ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              ) : isTeamEvent ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20c.23-.574.356-1.201.356-1.857 0-1.53-.5-2.95-1.356-4.143M12 14a4 4 0 100-8 4 4 0 000 8zM17 20c-.23-.574-.356-1.201-.356-1.857 0-1.53.5-2.95 1.356-4.143" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              )}
            </svg>
            <span className={isCrowdEvent ? 'font-semibold text-indigo-600' : isTeamEvent ? 'font-semibold text-yellow-600' : ''}>{teamText}</span>
          </div>
        </div>

        {/* ─── REGISTRATION SLIDER (HIDDEN FOR CROWD EVENTS) ─── */}
        {!isCrowdEvent ? (
          <div className="mt-4 mb-4">
            <div className="flex justify-between items-end text-[10px] font-bold uppercase tracking-wider mb-2">
              <span className="text-ink-500">{event.registrationCount} Registered</span>
              {isWaitlist ? (
                <span className="text-red-500">{event.waitlistCount} on waitlist</span>
              ) : (
                <span className={event.availableSeats <= 5 ? 'text-amber-500' : 'text-ink-400'}>
                  {event.availableSeats} spots left
                </span>
              )}
            </div>
            <div className="w-full bg-ink-100 rounded-full h-1.5 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${
                  fillPct >= 100 ? 'bg-red-500' : fillPct > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${fillPct}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="mt-8 mb-4"></div> // Spacer to keep card heights consistent
        )}

        {/* ─── DYNAMIC STATUS BUTTON ─── */}
        {isCrowdEvent ? (
          <Link to={`/events/${event.id}`} className="block w-full text-center py-2.5 rounded-xl text-sm font-bold shadow-sm bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition-colors">
            📢 View Event Info
          </Link>
        ) : isUserRegistered ? (
          <Link to={`/events/${event.id}`} className="block w-full text-center py-2.5 rounded-xl text-sm font-bold shadow-sm bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 transition-colors">
             You are Registered
          </Link>
        ) : isUserWaitlisted ? (
          <Link to={`/events/${event.id}`} className="block w-full text-center py-2.5 rounded-xl text-sm font-bold shadow-sm bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 transition-colors">
            ⏳ On Waitlist
          </Link>
        ) : isPendingInvite ? (
          <Link to={`/events/${event.id}`} className="block w-full text-center py-2.5 rounded-xl text-sm font-bold shadow-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors">
            👋 Confirm Registration
          </Link>
        ) : isIncomplete ? (
          <Link to={`/events/${event.id}`} className="block w-full text-center py-2.5 rounded-xl text-sm font-bold shadow-sm bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200 transition-colors">
            ⚠️ Incomplete Team
          </Link>
        ) : (
          <Link 
            to={`/events/${event.id}`} 
            className={`block w-full text-center py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${
              isCompleted || isSuspended 
                ? 'bg-ink-50 text-ink-500 hover:bg-ink-100' 
                : isWaitlist
                  ? 'bg-ink-900 text-white hover:bg-ink-800 hover:-translate-y-0.5'
                  : 'bg-yellow-400 text-ink-900 hover:bg-yellow-500 hover:-translate-y-0.5'
            }`}
          >
            {isCompleted || isSuspended ? 'View Details' : isWaitlist ? 'Join Waitlist' : 'View & Register'}
          </Link>
        )}
        
      </div>
    </div>
  )
}