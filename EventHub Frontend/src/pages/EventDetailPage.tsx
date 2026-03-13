import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { eventsApi } from '../api/Endpoints'
import { useAuthStore } from '../store/authStore'
import { getImageUrl } from '../components/event/EventCard'
import type { Event } from '../types'
import TeamRegistrationModal from '../components/event/TeamRegistrationModal'

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
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuthStore()
  const queryClient = useQueryClient()
  const [comment, setComment] = useState('')
  const [rating, setRating] = useState(0)

  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false)

  const { data: event, isLoading } = useQuery<Event>({
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
    mutationFn: (teamData?: any) => eventsApi.register(Number(id), teamData),
    onSuccess: (res: any) => {
      const status = res.data.data.status
      toast.success(status === 'REGISTERED' ? '🎉 Registered!' : '⏳ Added to waitlist')
      setIsTeamModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['event', Number(id)] })
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Registration failed'
      toast.error(msg, { duration: 5000 })
    },
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

  const deleteMutation = useMutation({
    mutationFn: () => eventsApi.deleteEvent(Number(id)),
    onSuccess: () => {
      toast.success('Event deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['events'] })
      navigate('/')
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to delete event'),
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
  const isTeamEvent = event.maxTeamSize > 1

  const handleRegisterClick = () => {
    if (isTeamEvent) {
      setIsTeamModalOpen(true)
    } else {
      registerMutation.mutate(undefined) // ✅ FIX: Pass undefined
    }
  }

  const sortedStages = event.stages ? [...event.stages].sort((a, b) => new Date(a.stageDate).getTime() - new Date(b.stageDate).getTime()) : []

  // ─── GOOGLE CALENDAR LINK GENERATOR ───
  const generateGCalLink = () => {
    const startStr = new Date(event.eventDate).toISOString().replace(/-|:|\.\d+/g, '')
    const endStr = event.eventEndTime ? new Date(event.eventEndTime).toISOString().replace(/-|:|\.\d+/g, '') : startStr
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${startStr}/${endStr}&details=${encodeURIComponent(event.description)}&location=${encodeURIComponent(event.venue)}`
  }

  return (
    <div className="animate-fade-in">
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
            <div className="card p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex gap-3 items-start">
                  <span className="text-xl">📅</span>
                  <div>
                    <p className="text-xs text-ink-600/50 uppercase font-bold tracking-wider">Event Date</p>
                    <p className="text-sm font-medium">{format(new Date(event.eventDate), 'EEEE, MMM d, yyyy')}</p>
                    <p className="text-xs text-ink-600 mt-1">{format(new Date(event.eventDate), 'h:mm a')} {event.eventEndTime && `- ${format(new Date(event.eventEndTime), 'h:mm a')}`}</p>
                    
                    <a 
                      href={generateGCalLink()} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-block mt-3 text-[10px] font-bold uppercase tracking-wider bg-ink-900/5 hover:bg-ink-900/10 text-ink-900 py-1.5 px-3 rounded-md transition-colors"
                    >
                      + Google Calendar
                    </a>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="text-xl">📍</span>
                  <div>
                    <p className="text-xs text-ink-600/50 uppercase font-bold tracking-wider">Venue</p>
                    <p className="text-sm font-medium">{event.venue}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h2 className="section-title mb-4 border-b border-ink-900/5 pb-2">About this Event</h2>
              <div className="text-ink-700 font-sans text-sm leading-relaxed whitespace-pre-wrap">
                {event.description}
              </div>
            </div>

            {event.prizes && (
              <div className="card p-6 bg-gold/5 border border-gold/20">
                <h2 className="section-title mb-4 flex items-center gap-2"><span>🏆</span> Rewards & Prizes</h2>
                <div className="text-ink-800 font-sans text-sm leading-relaxed whitespace-pre-wrap">{event.prizes}</div>
              </div>
            )}

            {sortedStages.length > 0 && (
              <div className="card p-6">
                <h2 className="section-title mb-6 border-b border-ink-900/5 pb-2">Event Timeline</h2>
                <div className="relative border-l-2 border-gold/30 ml-3 space-y-8 pb-4">
                  {sortedStages.map((stage, idx) => (
                    <div key={stage.id || idx} className="relative pl-6">
                      <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-gold border-4 border-white shadow-sm" />
                      <p className="text-xs font-bold uppercase tracking-wider text-ink-600/60 mb-1">{format(new Date(stage.stageDate), 'MMM d, h:mm a')}</p>
                      <h3 className="font-serif text-lg text-ink-900">{stage.title}</h3>
                      {stage.description && <p className="text-sm text-ink-700 font-sans mt-1">{stage.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="card p-6">
              <h2 className="section-title mb-4">Attendee Discussion</h2>
              {isAuthenticated ? (
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
                 (
                  <p className="text-ink-600/50 text-sm italic mb-6">
                    You need to create an account for this.
                  </p>
                )
              )}
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

          <div className="space-y-5">
            <div className="card p-5 sticky top-24">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-ink-900/5">
                <span className="text-sm text-ink-600">Event Type</span>
                <span className="font-medium text-sm px-2 py-1 bg-ink-50 rounded-md">
                  {isTeamEvent 
                    ? (event.minTeamSize === event.maxTeamSize ? `Team of ${event.maxTeamSize}` : `Team of ${event.minTeamSize} - ${event.maxTeamSize}`) 
                    : 'Solo Event 👤'}
                </span>
              </div>

              <div className="mb-4">
                <div className="progress-bar mb-2">
                  <div className={`progress-fill ${fillPct >= 100 ? 'bg-crimson' : 'bg-sage'}`} style={{ width: `${fillPct}%` }} />
                </div>
                <p className="text-xs text-ink-600/60 text-center">
                  {event.registrationCount}/{event.maxParticipants} {isTeamEvent ? 'Teams' : 'Registered'}
                </p>
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
                  <button 
                    onClick={handleRegisterClick} 
                    disabled={registerMutation.isPending}
                    className="w-full btn-gold py-3 rounded-xl mb-3"
                  >
                    {registerMutation.isPending ? 'Processing...' : (event.status === 'FULL' ? 'Join Waitlist' : (isTeamEvent ? 'Register Team →' : 'Register Now →'))}
                  </button>
                ) : <div className="p-3 text-center text-ink-600/50 text-sm">{isCompleted ? 'Event Completed' : 'Closed'}</div>
              ) : (
                <Link to="/login" className="w-full btn-gold py-3 rounded-xl text-center block mb-3">Sign in to Register</Link>
              )}

              {isCompleted && isAuthenticated && isRegistered && (
                <div className="border-t border-ink-900/8 pt-3 mt-3">
                  <p className="text-xs text-ink-600/50 mb-2">Rate your experience:</p>
                  <StarRating value={rating} onChange={(v) => { setRating(v); ratingMutation.mutate(v); }} />
                </div>
              )}

              {event.contactEmail && (
                <div className="mt-4 pt-4 border-t border-ink-900/5 text-center">
                  <p className="text-xs text-ink-600/50 mb-1">Questions?</p>
                  <a href={`mailto:${event.contactEmail}`} className="text-sm text-gold hover:text-gold/80 font-medium">✉️ Contact Organizer</a>
                </div>
              )}

              {isHost && (
                <div className="border-t border-ink-900/8 pt-4 mt-4 space-y-3">
                  <Link to={`/events/${event.id}/edit`} className="w-full py-3 rounded-xl border border-ink-900/10 bg-ink-50/50 text-ink-900 hover:bg-ink-100 transition-colors font-medium text-sm flex items-center justify-center gap-2">✏️ Edit Event Details</Link>
                  <button onClick={() => window.confirm('Delete?') && deleteMutation.mutate()} disabled={deleteMutation.isPending} className="w-full py-3 rounded-xl border border-crimson/10 text-crimson hover:bg-crimson/5 font-medium text-sm flex items-center justify-center gap-2">🗑️ Delete Event</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <TeamRegistrationModal 
        event={event}
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        onSubmitTeam={(data) => registerMutation.mutate(data)}
        isPending={registerMutation.isPending}
      />
    </div>
  )
}