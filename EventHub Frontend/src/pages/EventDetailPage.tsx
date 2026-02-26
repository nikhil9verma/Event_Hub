import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useState } from 'react'
import type { Key } from 'react'
import toast from 'react-hot-toast'
import { eventsApi } from '../api/Endpoints'
import { useAuthStore } from '../store/authStore'
import { getImageUrl } from '../components/event/EventCard'

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
    queryFn: () => eventsApi.getEvent(Number(id)).then((r: any) => r.data.data ?? null),
    refetchInterval: 10000,
  })

  const { data: commentsData } = useQuery({
    queryKey: ['comments', Number(id)],
    queryFn: () => eventsApi.getComments(Number(id)).then((r: any) => r.data.data ?? null),
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

  if (isLoading) return <div className="page-container py-12"><div className="skeleton h-80 rounded-2xl" /></div>
  if (!event) return null

  const fillPct = Math.min(100, (event.registrationCount / event.maxParticipants) * 100)
  const isRegistered = event.currentUserRegistrationStatus === 'REGISTERED'
  const isWaitlisted = event.currentUserRegistrationStatus === 'WAITLIST'
  const isPastDeadline = new Date() > new Date(event.registrationDeadline)
  const isCompleted = event.status === 'COMPLETED'
  const isSuspended = event.status === 'SUSPENDED'
  const canRegister = !isSuspended && !isCompleted && !isPastDeadline
  const isHost = user?.id === event.hostId || user?.role === 'SUPER_ADMIN'

  return (
    <div className="animate-fade-in">
      {/* Hero poster */}
      <div className="relative h-72 md:h-96 w-full bg-ink-900" style={{ backgroundImage: `url(${getImageUrl(event.posterUrl)})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="absolute inset-0 bg-ink-900/60 backdrop-blur-[1px]" />
        <div className="absolute inset-0 flex flex-col justify-end p-8">
          <div className="page-container">
            <h1 className="font-serif text-3xl md:text-4xl text-white max-w-3xl leading-tight">{event.title}</h1>
          </div>
        </div>
      </div>

      <div className="page-container py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Event Info Card */}
            <div className="card p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex gap-3"><span>📅</span><div><p className="text-xs text-ink-600/50 uppercase">Date</p><p className="text-sm font-medium">{format(new Date(event.eventDate), 'EEEE, MMM d, yyyy')}</p></div></div>
                <div className="flex gap-3"><span>📍</span><div><p className="text-xs text-ink-600/50 uppercase">Venue</p><p className="text-sm font-medium">{event.venue}</p></div></div>
              </div>
            </div>

            {/* Discussion/Comments Section */}
            <div className="card p-6">
              <h2 className="section-title mb-4">Attendee Discussion</h2>
              
              {/* Comment Input: Show if Registered and event not Suspended */}
              {isAuthenticated && isRegistered && !isSuspended ? (
                <div className="mb-6 space-y-3">
                  <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="Ask a question or share your thoughts..."
                    rows={3}
                    className="input-field resize-none text-sm"
                  />
                  <button
                    onClick={() => commentMutation.mutate()}
                    disabled={!comment.trim() || commentMutation.isPending}
                    className="btn-primary text-sm py-2"
                  >
                    {commentMutation.isPending ? 'Posting...' : 'Post Message'}
                  </button>
                </div>
              ) : (
                !isRegistered && !isSuspended && (
                  <p className="text-ink-600/50 text-sm italic mb-6">
                    Only registered attendees can participate in the discussion.
                  </p>
                )
              )}

              {/* Comments List */}
              <div className="space-y-4">
                {commentsData?.content?.map((c: any) => (
                  <div key={c.id} className="flex gap-3 pb-4 border-b border-ink-900/5 last:border-0">
                    <div className="w-8 h-8 bg-ink-900 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-gold text-xs font-serif font-bold">{c.userName[0]?.toUpperCase()}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-sans font-medium text-sm text-ink-900">{c.userName}</span>
                        <span className="text-xs text-ink-600/40">{format(new Date(c.createdAt), 'MMM d, h:mm a')}</span>
                      </div>
                      <p className="text-ink-700 font-sans text-sm">{c.message}</p>
                    </div>
                  </div>
                ))}
                {commentsData?.content?.length === 0 && <p className="text-ink-600/40 text-sm italic">No messages yet.</p>}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            <div className="card p-5 sticky top-24">
              <div className="mb-4">
                <div className="progress-bar mb-2">
                  <div className={`progress-fill ${fillPct >= 100 ? 'bg-crimson' : 'bg-sage'}`} style={{ width: `${fillPct}%` }} />
                </div>
                <p className="text-xs text-ink-600/60 text-center">{event.registrationCount}/{event.maxParticipants} Registered</p>
              </div>

              {isAuthenticated ? (
                isRegistered ? (
                  <button onClick={() => cancelMutation.mutate()} className="w-full py-3 rounded-xl border border-crimson text-crimson hover:bg-crimson/5 transition-colors mb-3">
                    ✓ Registered — Cancel
                  </button>
                ) : isWaitlisted ? (
                  <button onClick={() => cancelMutation.mutate()} className="w-full py-3 rounded-xl border border-amber-500 text-amber-600 mb-3">
                    ⏳ Waitlisted — Leave
                  </button>
                ) : canRegister ? (
                  <button onClick={() => registerMutation.mutate()} className="w-full btn-gold py-3 rounded-xl mb-3">
                    {event.status === 'FULL' ? 'Join Waitlist' : 'Register Now →'}
                  </button>
                ) : <div className="p-3 text-center text-ink-600/50 text-sm">{isCompleted ? 'Event Completed' : 'Closed'}</div>
              ) : (
                <Link to="/login" className="w-full btn-gold py-3 rounded-xl text-center block mb-3">Sign in to Register</Link>
              )}

              {/* Rating Section: Keep restricted to Completed Events */}
              {isCompleted && isAuthenticated && isRegistered && (
                <div className="border-t border-ink-900/8 pt-3">
                  <p className="text-xs text-ink-600/50 mb-2">Rate your experience:</p>
                  <StarRating value={rating} onChange={(v) => { setRating(v); ratingMutation.mutate(v); }} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}