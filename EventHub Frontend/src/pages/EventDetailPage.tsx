import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useState } from 'react'
import type { Key } from 'react'
import toast from 'react-hot-toast'
import { eventsApi } from '../api/Endpoints'
import { useAuthStore } from '../store/authStore'
import { getImageUrl } from '../components/event/EventCard'  // ← shared helper

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className={`text-2xl transition-transform hover:scale-110 ${
            star <= (hover || value) ? 'text-gold' : 'text-ink-900/20'
          } ${onChange ? 'cursor-pointer' : 'cursor-default'}`}
          disabled={!onChange}
        >
          ★
        </button>
      ))}
    </div>
  )
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { isAuthenticated, user } = useAuthStore()
  const queryClient = useQueryClient()
  const [comment, setComment] = useState('')
  const [rating, setRating] = useState(0)

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', Number(id)],
    queryFn: () => eventsApi.getEvent(Number(id)).then((r: { data: { data: any } }) => r.data.data ?? null),
    refetchInterval: 10000,
  })

  const { data: commentsData } = useQuery({
    queryKey: ['comments', Number(id)],
    queryFn: () => eventsApi.getComments(Number(id)).then((r: { data: { data: any } }) => r.data.data ?? null),
    enabled: !!id,
  })

  const registerMutation = useMutation({
    mutationFn: () => eventsApi.register(Number(id)),
    onSuccess: (res: any) => {
      const status = res.data.data.status
      toast.success(status === 'REGISTERED' ? '🎉 Registered!' : '⏳ Added to waitlist')
      queryClient.invalidateQueries({ queryKey: ['event', Number(id)] })
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  })

  const cancelMutation = useMutation({
    mutationFn: () => eventsApi.cancelRegistration(Number(id)),
    onSuccess: () => {
      toast.success('Registration cancelled')
      queryClient.invalidateQueries({ queryKey: ['event', Number(id)] })
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  })

  const commentMutation = useMutation({
    mutationFn: () => eventsApi.addComment(Number(id), comment),
    onSuccess: () => {
      setComment('')
      toast.success('Comment posted!')
      queryClient.invalidateQueries({ queryKey: ['comments', Number(id)] })
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  })

  const ratingMutation = useMutation({
    mutationFn: (stars: number) => eventsApi.rateEvent(Number(id), stars),
    onSuccess: () => {
      toast.success('Rating submitted!')
      queryClient.invalidateQueries({ queryKey: ['event', Number(id)] })
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  })

  if (isLoading) {
    return (
      <div className="page-container py-12">
        <div className="skeleton h-80 w-full rounded-2xl mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="skeleton h-10 w-3/4" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-2/3" />
          </div>
          <div className="skeleton h-64 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!event) return null

  const fillPct = Math.min(100, (event.registrationCount / event.maxParticipants) * 100)
  const isRegistered = event.currentUserRegistrationStatus === 'REGISTERED'
  const isWaitlisted = event.currentUserRegistrationStatus === 'WAITLIST'
  const isPastDeadline = new Date() > new Date(event.registrationDeadline)
  const isCompleted = event.status === 'COMPLETED'
  const canRegister = event.status !== 'SUSPENDED' && !isCompleted && !isPastDeadline
  const isHost = user?.id === event.hostId || user?.role === 'SUPER_ADMIN'

  // Detail page uses posterUrl for hero
  const heroImage = getImageUrl(event.posterUrl)

  return (
    <div className="animate-fade-in">
      {/* Hero poster */}
      <div
        className="relative h-72 md:h-96 w-full bg-gradient-to-br from-ink-900 to-ink-700 overflow-hidden"
        style={heroImage ? {
          backgroundImage: `url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        } : {}}
      >
        <div className="absolute inset-0 bg-ink-900/60 backdrop-blur-[1px]" />
        <div className="absolute inset-0 flex flex-col justify-end p-8">
          <div className="page-container">
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="badge bg-white/10 text-white border-white/20 backdrop-blur">
                {event.category}
              </span>
              {event.trending && (
                <span className="badge bg-gold text-ink-900 border-0 font-semibold">🔥 Trending</span>
              )}
              <span className={`badge border-0 ${
                event.status === 'ACTIVE' ? 'bg-sage/80 text-white' :
                event.status === 'FULL' ? 'bg-crimson/80 text-white' :
                event.status === 'COMPLETED' ? 'bg-ink-700/80 text-parchment-200' :
                'bg-amber-500/80 text-white'
              }`}>
                {event.status}
              </span>
            </div>
            <h1 className="font-serif text-3xl md:text-4xl text-white max-w-3xl leading-tight">
              {event.title}
            </h1>
          </div>
        </div>
      </div>

      <div className="page-container py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Details */}
          <div className="lg:col-span-2 space-y-8">
            <div className="card p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { icon: '📅', label: 'Date & Time', val: format(new Date(event.eventDate), 'EEEE, MMMM d, yyyy • h:mm a') },
                  { icon: '📍', label: 'Venue', val: event.venue },
                  { icon: '👤', label: 'Hosted by', val: event.hostName },
                  { icon: '🗓', label: 'Registration Deadline', val: format(new Date(event.registrationDeadline), 'MMM d, yyyy') },
                ].map(item => (
                  <div key={item.label} className="flex gap-3">
                    <span className="text-xl mt-0.5">{item.icon}</span>
                    <div>
                      <p className="text-xs text-ink-600/50 font-sans uppercase tracking-wide mb-0.5">{item.label}</p>
                      <p className="text-ink-900 font-sans text-sm font-medium">{item.val}</p>
                    </div>
                  </div>
                ))}
              </div>
              {event.averageRating && event.ratingCount > 0 && (
                <div className="mt-4 pt-4 border-t border-ink-900/8 flex items-center gap-2">
                  <StarRating value={Math.round(event.averageRating)} />
                  <span className="font-mono text-sm font-semibold text-ink-900">{event.averageRating.toFixed(1)}</span>
                  <span className="text-ink-600/50 text-sm font-sans">({event.ratingCount} ratings)</span>
                </div>
              )}
            </div>

            <div className="card p-6">
              <h2 className="section-title mb-4">About this Event</h2>
              <p className="text-ink-700 font-sans leading-relaxed whitespace-pre-wrap">{event.description}</p>
            </div>

            <div className="card p-6">
              <h2 className="section-title mb-4">Comments</h2>
              {isCompleted && isAuthenticated && (
                <div className="mb-6 space-y-3">
                  <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="Share your experience at this event..."
                    rows={3}
                    className="input-field resize-none text-sm"
                  />
                  <button
                    onClick={() => commentMutation.mutate()}
                    disabled={!comment.trim() || commentMutation.isPending}
                    className="btn-primary text-sm py-2"
                  >
                    {commentMutation.isPending ? 'Posting...' : 'Post Comment'}
                  </button>
                </div>
              )}
              {!isCompleted && (
                <p className="text-ink-600/50 text-sm font-sans italic mb-4">
                  Comments and ratings are available after the event concludes.
                </p>
              )}
              <div className="space-y-4">
                {commentsData?.content.map((c: {
                  id: Key | null | undefined
                  userName: string
                  createdAt: string | number | Date
                  message: string
                }) => (
                  <div key={c.id} className="flex gap-3 pb-4 border-b border-ink-900/5 last:border-0">
                    <div className="w-8 h-8 bg-ink-900 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-gold text-xs font-serif font-bold">
                        {c.userName[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-sans font-medium text-sm text-ink-900">{c.userName}</span>
                        <span className="text-xs text-ink-600/40 font-sans">
                          {format(new Date(c.createdAt), 'MMM d')}
                        </span>
                      </div>
                      <p className="text-ink-700 font-sans text-sm leading-relaxed">{c.message}</p>
                    </div>
                  </div>
                ))}
                {commentsData?.content.length === 0 && (
                  <p className="text-ink-600/40 text-sm font-sans italic">No comments yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right: Sidebar */}
          <div className="space-y-5">
            <div className="card p-5 sticky top-24">
              <div className="mb-4">
                <div className="flex justify-between text-sm font-sans mb-2">
                  <span className="text-ink-600/60">
                    {event.availableSeats > 0 ? `${event.availableSeats} seats left` : 'Fully booked'}
                  </span>
                  <span className="font-mono text-ink-600/60">
                    {event.registrationCount}/{event.maxParticipants}
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className={`progress-fill ${fillPct >= 100 ? 'bg-crimson' : fillPct >= 75 ? 'bg-amber-500' : 'bg-sage'}`}
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
                {event.waitlistCount > 0 && (
                  <p className="text-xs text-amber-600 font-sans mt-1">+{event.waitlistCount} on waitlist</p>
                )}
              </div>

              {isAuthenticated ? (
                isRegistered ? (
                  <button
                    onClick={() => cancelMutation.mutate()}
                    disabled={cancelMutation.isPending}
                    className="w-full py-3 rounded-xl border border-crimson/30 text-crimson font-sans font-medium hover:bg-crimson/5 transition-colors disabled:opacity-50 mb-3"
                  >
                    {cancelMutation.isPending ? 'Cancelling...' : '✓ Registered — Cancel'}
                  </button>
                ) : isWaitlisted ? (
                  <button
                    onClick={() => cancelMutation.mutate()}
                    disabled={cancelMutation.isPending}
                    className="w-full py-3 rounded-xl border border-amber-400/40 text-amber-600 font-sans font-medium hover:bg-amber-50 transition-colors disabled:opacity-50 mb-3"
                  >
                    {cancelMutation.isPending ? 'Removing...' : '⏳ On Waitlist — Leave'}
                  </button>
                ) : canRegister ? (
                  <button
                    onClick={() => registerMutation.mutate()}
                    disabled={registerMutation.isPending}
                    className="w-full btn-gold py-3 rounded-xl text-base mb-3"
                  >
                    {registerMutation.isPending ? 'Processing...' :
                      event.status === 'FULL' ? 'Join Waitlist' : 'Register Now →'}
                  </button>
                ) : (
                  <div className="bg-parchment-100 rounded-xl p-3 text-center text-ink-600/50 text-sm font-sans mb-3">
                    {isCompleted ? 'Event Completed' : isPastDeadline ? 'Registration Closed' : 'Unavailable'}
                  </div>
                )
              ) : (
                <Link to="/login" className="w-full btn-gold py-3 rounded-xl text-base text-center block mb-3">
                  Sign in to Register
                </Link>
              )}

              {isCompleted && isAuthenticated && isRegistered && (
                <div className="border-t border-ink-900/8 pt-3">
                  <p className="text-xs text-ink-600/50 font-sans mb-2">Rate this event:</p>
                  <StarRating value={rating} onChange={(v) => {
                    setRating(v)
                    ratingMutation.mutate(v)
                  }} />
                </div>
              )}

              {isHost && (
                <div className="border-t border-ink-900/8 pt-3 mt-3 space-y-2">
                  <Link to={`/events/${id}/analytics`} className="btn-outline w-full text-center text-sm block py-2">
                    📊 View Analytics
                  </Link>
                  <Link to={`/events/${id}/edit`} className="btn-ghost w-full text-center text-sm block py-2">
                    ✏️ Edit Event
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}