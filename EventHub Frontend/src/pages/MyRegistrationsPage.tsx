import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { eventsApi } from '../api/Endpoints'
import EventCard from '../components/event/EventCard'
import EventCardSkeleton from '../components/event/EventCardSkeleton'
import { Event } from '../types'

export default function MyRegistrationsPage() {
  const { data: events, isLoading, isError } = useQuery({
    queryKey: ['my-registrations'],
    queryFn: async () => {
      try {
        const r = await eventsApi.getMyRegistrations();
        // Log to console so you can inspect the exact data coming from Spring Boot
        console.log("My Registrations API Response:", r.data); 
        
        // Extract the array, defaulting to an empty array if anything goes wrong
        return r.data.data?.content || r.data.data || [];
      } catch (error) {
        console.error("Failed to fetch registrations:", error);
        return [];
      }
    },
  })

  // Safe check: If it's loading, show skeleton. 
  // If it's an error OR events is null/undefined OR events is empty, show the "No registrations" card.
  const showEmptyState = isError || !events || events.length === 0;

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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {events.map((item: any) => {
            // Safely extract the event, whether it's wrapped in a Registration object or returned flat
            const eventData = item.event ? item.event : item;
            
            // Render the card
            return <EventCard key={eventData.id || Math.random()} event={eventData} />
          })}
        </div>
      )}
    </div>
  )
}