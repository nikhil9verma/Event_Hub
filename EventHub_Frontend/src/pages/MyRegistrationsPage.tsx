import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { eventsApi } from '../api/Endpoints'
import EventCard from '../components/event/EventCard'
import EventCardSkeleton from '../components/event/EventCardSkeleton'
import toast from 'react-hot-toast'

export default function MyRegistrationsPage() {
  const queryClient = useQueryClient()

  const { data: events, isLoading, isError } = useQuery({
    queryKey: ['my-registrations'],
    queryFn: async () => {
      try {
        const r = await eventsApi.getMyRegistrations();
        return r.data.data?.content || r.data.data || [];
      } catch (error) {
        console.error("Failed to fetch registrations:", error);
        return [];
      }
    },
  })

  // ─── DATA SORTING ───
  const safeEvents = events || [];
  
  const pendingInvites = safeEvents.filter((item: any) => {
    const eventData = item.event || item;
    return eventData.currentUserRegistrationStatus === 'PENDING_INVITATION';
  });

  const activeRegistrations = safeEvents.filter((item: any) => {
    const eventData = item.event || item;
    return eventData.currentUserRegistrationStatus !== 'PENDING_INVITATION';
  });

  const showEmptyState = isError || (!isLoading && safeEvents.length === 0);

  return (
    <div className="page-container py-10 animate-fade-in">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-ink-900 mb-2">My Registrations</h1>
        <p className="text-ink-600 font-sans text-sm">
          Keep track of all the events you are attending or waitlisted for.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => <EventCardSkeleton key={i} />)}
        </div>
      ) : showEmptyState ? (
        <div className="card p-12 text-center flex flex-col items-center justify-center border border-dashed border-ink-900/20 bg-ink-50/50">
          <div className="text-5xl mb-4">🎫</div>
          <h3 className="font-serif text-xl text-ink-900 mb-2">No registrations yet</h3>
          <p className="text-ink-600/60 font-sans text-sm mb-6 max-w-sm">
            You haven't registered for any upcoming events. Discover what's happening on campus and secure your spot!
          </p>
          <Link to="/" className="btn-gold px-6 py-2.5">
            Explore Events
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          
          {/* ─── PENDING INVITATIONS SECTION ─── */}
          {pendingInvites.length > 0 && (
            <section>
              <h2 className="font-serif text-xl text-ink-900 mb-4 flex items-center gap-2">
                Action Required
                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full">
                  {pendingInvites.length}
                </span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingInvites.map((item: any) => {
                  const eventData = item.event || item;
                  return (
                    <div key={eventData.id} className="bg-blue-50/50 border border-blue-200 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-100 px-2 py-1 rounded">Invitation</span>
                        <h3 className="font-serif text-lg font-bold text-ink-900 mt-2 mb-1">Confirm Team Spot</h3>
                        <p className="text-sm text-ink-600">You've been invited to join a team for <span className="font-bold text-blue-700">"{eventData.title}"</span>.</p>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Link 
                          to={`/events/${eventData.id}`} 
                          className="flex-1 sm:flex-none text-center bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-700 transition-colors"
                        >
                          View & Confirm
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* ─── ACTIVE REGISTRATIONS SECTION ─── */}
          {activeRegistrations.length > 0 && (
            <section>
              {pendingInvites.length > 0 && <h2 className="font-serif text-xl text-ink-900 mb-4">My Events</h2>}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {activeRegistrations.map((item: any) => {
                  const eventData = item.event || item;
                  return <EventCard key={eventData.id || Math.random()} event={eventData} />
                })}
              </div>
            </section>
          )}
          
        </div>
      )}
    </div>
  )
}