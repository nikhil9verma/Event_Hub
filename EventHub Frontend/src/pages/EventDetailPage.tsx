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
import AddTeammateModal from '../components/event/AddTeammateModal'

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
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false)

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

  // ─── STATUS CHECKS ───
  const isCrowdEvent = event?.requiresRegistration === false;
  const fillPct = Math.min(100, ((event?.registrationCount || 0) / Math.max(1, event?.maxParticipants || 1)) * 100)
  const isRegistered = event?.currentUserRegistrationStatus === 'REGISTERED'
  const isWaitlisted = event?.currentUserRegistrationStatus === 'WAITLIST'
  const isPendingInvite = event?.currentUserRegistrationStatus === 'PENDING_INVITATION'
  const isIncomplete = event?.currentUserRegistrationStatus === 'INCOMPLETE'
  
  const isPastDeadline = event ? new Date() > new Date(event.registrationDeadline) : false
  const isCompleted = event?.status === 'COMPLETED'
  const isSuspended = event?.status === 'SUSPENDED'
  const canRegister = !isSuspended && !isCompleted && !isPastDeadline
  
  const isHost = user?.id === event?.hostId || user?.role === 'SUPER_ADMIN'
  const isTeamEvent = event ? event.maxTeamSize > 1 && !isCrowdEvent : false

  // ─── FETCH TEAM DATA (Skip for Crowd Events) ───
  const { data: myTeam } = useQuery({
    queryKey: ['event-team', Number(id)],
    queryFn: () => eventsApi.getMyTeam(Number(id)).then(r => r.data.data),
    enabled: !!id && (isRegistered || isWaitlisted || isPendingInvite || isIncomplete) && isTeamEvent && !isCrowdEvent,
  })

  const leaderName = myTeam?.members?.find((m: any) => m.status !== 'PENDING_INVITATION')?.name || 'A teammate';

  // ─── MUTATIONS ───
  const registerMutation = useMutation({
    mutationFn: (teamData?: any) => eventsApi.register(Number(id), teamData),
    onSuccess: (res: any) => {
      const status = res.data.data.status
      toast.success(status === 'INCOMPLETE' ? 'Team created! Awaiting invites.' : status === 'REGISTERED' ? '🎉 Registered!' : '⏳ Added to waitlist')
      setIsTeamModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['event', Number(id)] })
      if (isTeamEvent) queryClient.invalidateQueries({ queryKey: ['event-team', Number(id)] })
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Registration failed'),
  })

  const acceptMutation = useMutation({
    mutationFn: () => eventsApi.acceptInvite(Number(id)),
    onSuccess: () => {
      toast.success('Registration Confirmed! 🎉')
      queryClient.invalidateQueries({ queryKey: ['event', Number(id)] })
      queryClient.invalidateQueries({ queryKey: ['event-team', Number(id)] })
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to confirm'),
  })

  const declineMutation = useMutation({
    mutationFn: () => eventsApi.declineInvite(Number(id)),
    onSuccess: () => {
      toast.success('Invitation rejected')
      queryClient.invalidateQueries({ queryKey: ['event', Number(id)] })
      queryClient.invalidateQueries({ queryKey: ['event-team', Number(id)] })
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to reject invite'),
  })

  const addMemberMutation = useMutation({
    mutationFn: (emails: string[]) => eventsApi.addTeamMembers(Number(id), emails),
    onSuccess: () => {
      toast.success('Invites sent successfully!')
      setIsAddMemberOpen(false)
      queryClient.invalidateQueries({ queryKey: ['event-team', Number(id)] })
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to send invites'),
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

  const handleRegisterClick = () => {
    if (isTeamEvent) {
      setIsTeamModalOpen(true)
    } else {
      registerMutation.mutate(undefined)
    }
  }

  const sortedStages = event.stages ? [...event.stages].sort((a, b) => new Date(a.stageDate).getTime() - new Date(b.stageDate).getTime()) : []

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
          
          {/* ─── LEFT COLUMN (DETAILS) ─── */}
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
                <p className="text-ink-600/50 text-sm italic mb-6">
                  You need to create an account for this.
                </p>
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

          {/* ─── RIGHT COLUMN (REGISTRATION & ACTIONS) ─── */}
          <div className="space-y-5">
            <div className="card p-5 sticky top-24">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-ink-900/5">
                <span className="text-sm text-ink-600">Event Type</span>
                <span className={`font-medium text-sm px-2 py-1 rounded-md ${isCrowdEvent ? 'bg-indigo-50 text-indigo-700' : 'bg-ink-50'}`}>
                  {isCrowdEvent ? 'Crowd Event 📢' : isTeamEvent 
                    ? (event.minTeamSize === event.maxTeamSize ? `Team of ${event.maxTeamSize}` : `Team of ${event.minTeamSize} - ${event.maxTeamSize}`) 
                    : 'Solo Event 👤'}
                </span>
              </div>

              {!isCrowdEvent && (
                <div className="mb-6">
                  <div className="progress-bar mb-2">
                    <div className={`progress-fill ${fillPct >= 100 ? 'bg-crimson' : 'bg-sage'}`} style={{ width: `${fillPct}%` }} />
                  </div>
                  <p className="text-xs text-ink-600/60 text-center">
                    {event.registrationCount}/{event.maxParticipants} {isTeamEvent ? 'Teams' : 'Registered'}
                  </p>
                </div>
              )}

              {/* ─── SMART REGISTRATION BUTTON LOGIC ─── */}
              {isCrowdEvent ? (
                <div className="bg-indigo-50 text-indigo-800 p-6 rounded-2xl border border-indigo-200 text-center shadow-sm">
                  <span className="text-4xl block mb-3">📢</span>
                  <h3 className="font-bold text-xl mb-1">Open Event!</h3>
                  <p className="text-sm text-indigo-600">
                    This is a crowd event. No formal registration is required. Just mark your calendar and show up!
                  </p>
                </div>
              ) : !isAuthenticated ? (
                <Link to="/login" className="btn-primary w-full py-3 rounded-xl flex items-center justify-center gap-2">
                  Log in to Register
                </Link>
              ) : isPendingInvite ? (
                <div className="bg-blue-50 text-blue-800 p-6 rounded-2xl border border-blue-200 text-center shadow-sm">
                  <span className="text-3xl block mb-2">👋</span>
                  <h3 className="font-bold text-lg">You have been invited!</h3>
                  <p className="text-sm mt-1 mb-4 text-blue-700">
                    <span className="font-bold">{leaderName}</span> wants you to join <br/>
                    <span className="font-bold text-blue-900">"{myTeam?.teamName || 'their team'}"</span>
                  </p>
                  
                  <div className="flex flex-col gap-2.5">
                    <button 
                      onClick={() => acceptMutation.mutate()}
                      disabled={acceptMutation.isPending || declineMutation.isPending}
                      className="w-full bg-blue-600 text-white px-4 py-3 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                    >
                      {acceptMutation.isPending ? 'Confirming...' : 'Accept & Register'}
                    </button>
                    <button 
                      onClick={() => {
                        if (window.confirm('Are you sure you want to reject this team invitation?')) {
                          declineMutation.mutate()
                        }
                      }}
                      disabled={acceptMutation.isPending || declineMutation.isPending}
                      className="w-full bg-white text-red-600 border border-red-200 px-4 py-3 rounded-xl font-bold text-sm hover:bg-red-50 hover:border-red-300 transition-colors"
                    >
                      {declineMutation.isPending ? 'Rejecting...' : 'Reject Invitation'}
                    </button>
                  </div>
                </div>
              ) : isRegistered || isWaitlisted || isIncomplete ? (
                <div className={`p-6 rounded-2xl border text-center ${
                  isRegistered ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                  isIncomplete ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-sm' : 
                  'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  <span className="text-3xl block mb-2">{isRegistered ? '🎉' : isIncomplete ? '⚠️' : '⏳'}</span>
                  
                  <h3 className="font-bold text-lg">
                    {isRegistered ? 'You are registered!' : 
                     isIncomplete ? 'Action Required: Incomplete Team' : 
                     'You are on the waitlist!'}
                  </h3>
                  
                  <p className="text-xs mt-1">
                    {isIncomplete 
                      ? `Your team needs at least ${event.minTeamSize} members to secure a spot. Wait for pending invites to accept, or add more members below!` 
                      : 'Check "My Registrations" for details.'}
                  </p>
                  
                  {/* ─── TEAM MANAGEMENT WIDGET ─── */}
                  {isTeamEvent && myTeam && (
                    <div className="mt-5 text-left bg-white rounded-xl border border-ink-900/10 overflow-hidden shadow-sm">
                      <div className="bg-ink-50/80 px-4 py-3 border-b border-ink-900/5 flex justify-between items-center">
                        <span className="font-bold text-ink-900 text-sm">{myTeam.teamName}</span>
                        <span className="text-xs font-bold bg-ink-200/50 px-2 py-0.5 rounded text-ink-600">
                          {myTeam.members.filter((m:any) => m.status !== 'PENDING_INVITATION').length} / {event.minTeamSize} Min Required
                        </span>
                      </div>
                      
                      <ul className="px-4 py-2 space-y-2">
                        {myTeam.members.map((m: any, idx: number) => {
                          const isPending = m.status === 'PENDING_INVITATION';
                          return (
                            <li key={idx} className={`flex justify-between items-center text-sm py-2 border-b border-ink-900/5 last:border-0 ${isPending ? 'opacity-60' : ''}`}>
                              <div className="flex flex-col">
                                <span className="text-ink-900 font-bold truncate max-w-[140px] flex items-center gap-1.5">
                                  {!isPending && <span className="text-emerald-500 text-[10px]">🔒</span>}
                                  {m.name}
                                </span>
                                {isPending && <span className="text-[10px] text-ink-500">{m.email}</span>}
                              </div>
                              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${
                                m.status === 'REGISTERED' ? 'bg-emerald-100 text-emerald-700' : 
                                m.status === 'PENDING_INVITATION' ? 'bg-blue-100 text-blue-700 border border-blue-200 border-dashed' : 
                                m.status === 'INCOMPLETE' ? 'bg-amber-100 text-amber-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                                {isPending ? 'Invited' : m.status === 'INCOMPLETE' ? 'Confirmed' : m.status.replace('_', ' ')}
                              </span>
                            </li>
                          )
                        })}
                      </ul>

                      {myTeam.members.length < event.maxTeamSize && (
                        <div className="px-4 pb-4 pt-2 border-t border-ink-900/5 mt-2 bg-ink-50/30">
                          <button onClick={() => setIsAddMemberOpen(true)} className="w-full py-2 border-2 border-dashed border-ink-200 text-ink-600 rounded-lg text-xs font-bold hover:border-gold hover:text-gold hover:bg-gold/5 transition-colors">
                            + Invite Additional Member
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : !canRegister ? (
                <button disabled className="w-full py-3 bg-ink-100 text-ink-500 rounded-xl font-bold cursor-not-allowed">
                  {isCompleted ? 'Event Completed' : isSuspended ? 'Event Suspended' : 'Registration Closed'}
                </button>
              ) : (
                <button 
                  onClick={handleRegisterClick} 
                  disabled={registerMutation.isPending}
                  className="btn-gold w-full py-3 rounded-xl shadow-sm text-ink-900 font-bold flex items-center justify-center gap-2 transition-transform hover:-translate-y-0.5"
                >
                  {registerMutation.isPending ? 'Processing...' : isTeamEvent ? 'Register Team' : 'Register Now'}
                </button>
              )}

              {event.contactEmail && (
                <div className="mt-6 pt-4 border-t border-ink-900/5 text-center">
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

      <AddTeammateModal 
        isOpen={isAddMemberOpen} 
        onClose={() => setIsAddMemberOpen(false)} 
        onAdd={(emails: string[]) => addMemberMutation.mutate(emails)} 
        isPending={addMemberMutation.isPending}
        slotsLeft={event.maxTeamSize - (myTeam?.members?.length || 0)}
      />
    </div>
  )
}