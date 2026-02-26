import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { format, differenceInHours, differenceInDays } from 'date-fns'
import toast from 'react-hot-toast'
import { eventsApi } from '../../api/Endpoints'
import { useAuthStore } from '../../store/authStore'
import type { Event } from '../../types'

interface EventCardProps {
  event: Event
  featured?: boolean
}

const CATEGORY_COLORS: Record<string, string> = {
  'Technology': 'bg-blue-50 text-blue-700 border-blue-200',
  'Arts & Culture': 'bg-purple-50 text-purple-700 border-purple-200',
  'Sports': 'bg-green-50 text-green-700 border-green-200',
  'Academic': 'bg-amber-50 text-amber-700 border-amber-200',
  'Social': 'bg-pink-50 text-pink-700 border-pink-200',
  'Career': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Health': 'bg-emerald-50 text-emerald-700 border-emerald-200',
}



export const getImageUrl = (url: string | undefined | null): string | undefined => {
  if (!url) return undefined;
  
  // If it's already a full link (like a Google profile picture), return it directly
  if (url.startsWith('http')) return url;
  
  // Point directly to your local Spring Boot backend
  const backendUrl = import.meta.env.VITE_API_BASE_URL||'http://localhost:8080';
  
  // Prevent double '/uploads/' just in case your DB stored it that way
  if (url.startsWith('uploads/')) {
    return `${backendUrl}/${url}`;
  }
  
  // Standard format based on your WebConfig
  return `${backendUrl}/uploads/${url}`; 
};

function Countdown({ date }: { date: string }) {
  const now = new Date()
  const eventDate = new Date(date)
  const hours = differenceInHours(eventDate, now)
  const days = differenceInDays(eventDate, now)

  if (hours < 0) return null
  if (hours < 24) {
    return (
      <span className="text-crimson font-mono text-xs font-medium animate-pulse-slow">
        ⚡ {hours}h left
      </span>
    )
  }
  if (days < 7) {
    return <span className="text-amber-600 font-mono text-xs font-medium">⏳ {days}d left</span>
  }
  return <span className="text-ink-600/60 font-mono text-xs">{format(eventDate, 'MMM d')}</span>
}

export default function EventCard({ event, featured = false }: EventCardProps) {
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const fillPct = Math.min(100, (event.registrationCount / event.maxParticipants) * 100)
  const catColor = CATEGORY_COLORS[event.category] || 'bg-gray-50 text-gray-700 border-gray-200'

  // Use cardImageUrl for card thumbnail, fallback to posterUrl
  const cardImage = getImageUrl(event.cardImageUrl || event.posterUrl)

  const registerMutation = useMutation({
    mutationFn: () => eventsApi.register(event.id),
    onSuccess: (res: any) => {
      const status = res.data.data.status
      toast.success(status === 'REGISTERED' ? '🎉 Registered!' : '⏳ Added to waitlist')
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['event', event.id] })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Registration failed')
    }
  })

  const cancelMutation = useMutation({
    mutationFn: () => eventsApi.cancelRegistration(event.id),
    onSuccess: () => {
      toast.success('Registration cancelled')
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['event', event.id] })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Cancellation failed')
    }
  })

  const handleRegister = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!isAuthenticated) { navigate('/login'); return }
    if (event.currentUserRegistrationStatus === 'REGISTERED' ||
      event.currentUserRegistrationStatus === 'WAITLIST') {
      cancelMutation.mutate()
    } else {
      registerMutation.mutate()
    }
  }

  const isRegistered = event.currentUserRegistrationStatus === 'REGISTERED'
  const isWaitlisted = event.currentUserRegistrationStatus === 'WAITLIST'
  const isPastDeadline = new Date() > new Date(event.registrationDeadline)
  const canRegister = event.status !== 'SUSPENDED' && event.status !== 'COMPLETED' && !isPastDeadline

  return (
    <div className={`card group overflow-hidden flex flex-col animate-fade-in ${featured ? 'ring-2 ring-gold/30' : ''}`}>
      {/* Card thumbnail */}
      <Link to={`/events/${event.id}`} className="relative block overflow-hidden">
        <div
          className="h-44 w-full bg-gradient-to-br from-ink-800 to-ink-700 flex items-center justify-center overflow-hidden"
          style={cardImage ? {
            backgroundImage: `url(${cardImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          } : {}}
        >
          {!cardImage && (
            <div className="text-center">
              <div className="text-4xl mb-2">🎓</div>
              <span className="font-serif text-gold/60 text-sm">{event.category}</span>
            </div>
          )}
        </div>

        {/* Badges overlay */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {event.trending && (
            <span className="badge bg-gold text-ink-900 border-0 shadow-sm font-semibold text-[10px] uppercase tracking-wide">
              🔥 Trending
            </span>
          )}
          {event.status === 'FULL' && (
            <span className="badge bg-crimson/90 text-white border-0">Full</span>
          )}
          {event.status === 'COMPLETED' && (
            <span className="badge bg-ink-700 text-parchment-200 border-0">Completed</span>
          )}
          {featured && (
            <span className="badge bg-ink-900/80 text-gold border border-gold/30 text-[10px] uppercase tracking-wide">
              ⭐ Featured
            </span>
          )}
        </div>

        
        {/* Rating */}
        {event.averageRating && event.ratingCount > 0 && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur rounded-full px-2 py-0.5 shadow-sm">
            <span className="text-gold text-xs">★</span>
            <span className="text-xs font-medium text-ink-900 font-mono">
              {event.averageRating.toFixed(1)}
            </span>
          </div>
        )}
      </Link>

      {/* Body */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex items-center justify-between">
          <span className={`badge border text-[11px] ${catColor}`}>{event.category}</span>
          <Countdown date={event.eventDate} />
        </div>

        <Link to={`/events/${event.id}`}>
          <h3 className="font-serif text-lg text-ink-900 font-semibold leading-tight line-clamp-2 hover:text-ink-700 transition-colors">
            {event.title}
          </h3>
        </Link>

        <div className="space-y-1.5 text-sm text-ink-600/70 font-sans">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">📍</span>
            <span className="truncate">{event.venue}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm">🗓</span>
            <span>{format(new Date(event.eventDate), 'MMM d, yyyy • h:mm a')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm">👤</span>
            <span className="truncate">{event.hostName}</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-sans">
            <span className="text-ink-600/60">
              {event.availableSeats > 0
                ? `${event.availableSeats} seats left`
                : `${event.waitlistCount} on waitlist`}
            </span>
            <span className="text-ink-600/60 font-mono">
              {event.registrationCount}/{event.maxParticipants}
            </span>
          </div>
          <div className="progress-bar">
            <div
              className={`progress-fill ${fillPct >= 100 ? 'bg-crimson' : fillPct >= 75 ? 'bg-amber-500' : 'bg-sage'}`}
              style={{ width: `${fillPct}%` }}
            />
          </div>
        </div>

        <div className="mt-auto pt-1">
          {event.status === 'COMPLETED' ? (
            <Link to={`/events/${event.id}`} className="btn-outline w-full text-center text-sm block py-2">
              View & Review
            </Link>
          ) : isRegistered ? (
            <button
              onClick={handleRegister}
              disabled={cancelMutation.isPending}
              className="w-full py-2 rounded-lg border border-crimson/30 text-crimson text-sm font-sans font-medium hover:bg-crimson/5 transition-colors disabled:opacity-50"
            >
              {cancelMutation.isPending ? 'Cancelling...' : '✓ Registered — Cancel'}
            </button>
          ) : isWaitlisted ? (
            <button
              onClick={handleRegister}
              disabled={cancelMutation.isPending}
              className="w-full py-2 rounded-lg border border-amber-400/40 text-amber-600 text-sm font-sans font-medium hover:bg-amber-50 transition-colors disabled:opacity-50"
            >
              {cancelMutation.isPending ? 'Removing...' : '⏳ On Waitlist — Leave'}
            </button>
          ) : canRegister ? (
            <button
              onClick={handleRegister}
              disabled={registerMutation.isPending}
              className={`w-full py-2 rounded-lg text-sm font-sans font-semibold transition-all disabled:opacity-50 ${
                event.status === 'FULL'
                  ? 'bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100'
                  : 'btn-gold'
              }`}
            >
              {registerMutation.isPending
                ? 'Processing...'
                : event.status === 'FULL'
                  ? '+ Join Waitlist'
                  : 'Register Now'}
            </button>
          ) : (
            <button disabled className="w-full py-2 rounded-lg text-sm font-sans text-ink-600/50 bg-parchment-100 cursor-not-allowed border border-ink-900/10">
              {isPastDeadline ? 'Registration Closed' : 'Unavailable'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}