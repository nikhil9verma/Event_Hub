import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { eventsApi } from '../api/Endpoints'
import { useRef, useState, useEffect } from 'react'
import { getImageUrl } from '../components/event/EventCard'

const schema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string()
    .min(20, 'Description must be at least 20 characters')
    .max(2000, 'Description cannot exceed 2000 characters'),
  eventDate: z.string().min(1, 'Event date is required'),
  venue: z.string().min(3, 'Venue is required'),
  category: z.string().min(1, 'Category is required'),
  maxParticipants: z.coerce.number().min(1).max(10000),
  registrationDeadline: z.string().min(1, 'Registration deadline is required'),

  // THE FIX: Use z.any() to prevent Zod from blocking the form when the checkbox is off
  reminderHours: z.any(),
})
type EventFormInput = z.input<typeof schema>
type EventForm = z.output<typeof schema>

const CATEGORIES = ['Technology', 'Arts & Culture', 'Sports', 'Academic', 'Social', 'Career', 'Health', 'Other']

export default function CreateEventPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const queryClient = useQueryClient()
  const isEditing = !!id

  // Poster — shown as hero on event detail page
  const [posterFile, setPosterFile] = useState<File | null>(null)
  const [posterPreview, setPosterPreview] = useState<string>('')
  const posterRef = useRef<HTMLInputElement>(null)

  // Card image — shown as thumbnail on event listing cards
  const [cardFile, setCardFile] = useState<File | null>(null)
  const [cardPreview, setCardPreview] = useState<string>('')
  const cardRef = useRef<HTMLInputElement>(null)

  // Reminder Email Toggle State
  const [enableReminder, setEnableReminder] = useState(true)

  const { data: existingEvent } = useQuery({
    queryKey: ['event', Number(id)],
    queryFn: () => eventsApi.getEvent(Number(id)).then((r: { data: { data: any } }) => r.data.data ?? null),
    enabled: isEditing,
  })

  // Set the toggle correctly if editing an existing event
  useEffect(() => {
    if (existingEvent) {
      setEnableReminder(existingEvent.reminderHours != null && existingEvent.reminderHours > 0)
    }
  }, [existingEvent])

  const { register, handleSubmit, formState: { errors } } = useForm<EventFormInput, any, EventForm>({
    resolver: zodResolver(schema),
    values: existingEvent ? {
      title: existingEvent.title,
      description: existingEvent.description,
      eventDate: existingEvent.eventDate.slice(0, 16),
      venue: existingEvent.venue,
      category: existingEvent.category,
      maxParticipants: existingEvent.maxParticipants,
      registrationDeadline: existingEvent.registrationDeadline.slice(0, 16),
      reminderHours: existingEvent.reminderHours,
    } : undefined,
  })

  const createMutation = useMutation({
    mutationFn: async (data: EventForm) => {
      const payload = {
        ...data,
        eventDate: data.eventDate + ':00',
        registrationDeadline: data.registrationDeadline + ':00',
        // Send null if they disabled the reminder
        reminderHours: enableReminder ? Number(data.reminderHours) : null,
      }
      const res = isEditing
        ? await eventsApi.updateEvent(Number(id), payload)
        : await eventsApi.createEvent(payload)

      const eventId = res.data.data.id
      if (posterFile && eventId) await eventsApi.uploadPoster(eventId, posterFile)
      if (cardFile && eventId) await eventsApi.uploadCardImage(eventId, cardFile)
      return res
    },
    onSuccess: (res) => {
      toast.success(isEditing ? 'Event updated!' : 'Event created! 🎉')
      queryClient.invalidateQueries({ queryKey: ['events'] })
      navigate(`/events/${res.data.data.id}`)
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.response?.data?.data
      toast.error(typeof msg === 'object' ? Object.values(msg).join(', ') : msg || 'Failed to save event')
    },
  })

  return (
    <div className="page-container py-10 max-w-3xl animate-fade-in">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-ink-900">
          {isEditing ? 'Edit Event' : 'Create New Event'}
        </h1>
        <p className="text-ink-600/60 font-sans text-sm mt-1">
          {isEditing ? 'Update your event details below.' : 'Fill in the details to publish your event.'}
        </p>
      </div>

      <form onSubmit={handleSubmit(data => createMutation.mutate(data))} className="space-y-6">

        {/* ── Images ─────────────────────────────────────────────────────── */}
        <div className="card p-5 space-y-5">
          <h2 className="font-serif text-lg">Event Images</h2>

          {/* Hero poster — shown on event detail page */}
          <div>
            <label className="label mb-2 block">
              Detail Page Hero Image
              <span className="text-ink-600/40 font-sans font-normal text-xs ml-2">
                (full-width banner on the event page)
              </span>
            </label>
            <div
              onClick={() => posterRef.current?.click()}
              className="border-2 border-dashed border-ink-900/15 rounded-xl overflow-hidden cursor-pointer hover:border-gold/50 transition-colors"
            >
              {posterPreview || existingEvent?.posterUrl ? (
                <img
                  src={posterPreview || getImageUrl(existingEvent?.posterUrl) || ''}
                  alt="Poster preview"
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="h-48 flex flex-col items-center justify-center gap-2 text-ink-600/40">
                  <span className="text-4xl">🖼</span>
                  <span className="font-sans text-sm">Click to upload hero image</span>
                  <span className="text-xs">JPEG, PNG, WebP up to 10MB</span>
                </div>
              )}
            </div>
            <input
              ref={posterRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) { setPosterFile(file); setPosterPreview(URL.createObjectURL(file)) }
              }}
            />
            {posterPreview && (
              <button
                type="button"
                onClick={() => { setPosterFile(null); setPosterPreview('') }}
                className="text-xs text-crimson/70 hover:text-crimson font-sans mt-1"
              >
                ✕ Remove
              </button>
            )}
          </div>

          {/* Card thumbnail — shown on event listing cards */}
          <div>
            <label className="label mb-2 block">
              Event Card Thumbnail
              <span className="text-ink-600/40 font-sans font-normal text-xs ml-2">
                (shown on listing cards — if omitted, hero image is used)
              </span>
            </label>
            <div
              onClick={() => cardRef.current?.click()}
              className="border-2 border-dashed border-ink-900/15 rounded-xl overflow-hidden cursor-pointer hover:border-gold/50 transition-colors"
            >
              {cardPreview || existingEvent?.cardImageUrl ? (
                <img
                  src={cardPreview || getImageUrl(existingEvent?.cardImageUrl) || ''}
                  alt="Card thumbnail preview"
                  className="w-full h-32 object-cover"
                />
              ) : (
                <div className="h-32 flex flex-col items-center justify-center gap-2 text-ink-600/40">
                  <span className="text-4xl">🃏</span>
                  <span className="font-sans text-sm">Click to upload card thumbnail</span>
                  <span className="text-xs">JPEG, PNG, WebP up to 10MB</span>
                </div>
              )}
            </div>
            <input
              ref={cardRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) { setCardFile(file); setCardPreview(URL.createObjectURL(file)) }
              }}
            />
            {cardPreview && (
              <button
                type="button"
                onClick={() => { setCardFile(null); setCardPreview('') }}
                className="text-xs text-crimson/70 hover:text-crimson font-sans mt-1"
              >
                ✕ Remove
              </button>
            )}
          </div>
        </div>

        {/* ── Event Details ───────────────────────────────────────────────── */}
        <div className="card p-5 space-y-4">
          <h2 className="font-serif text-lg">Event Details</h2>

          <div>
            <label className="label">Event Title</label>
            <input {...register('title')} className="input-field" placeholder="What's the event called?" />
            {errors.title && <p className="text-crimson text-xs mt-1 font-sans">{errors.title.message as string}</p>}
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              {...register('description')}
              rows={5}
              className="input-field resize-none"
              placeholder="Describe your event in detail — what attendees can expect, what to bring, etc."
            />
            {errors.description && <p className="text-crimson text-xs mt-1 font-sans">{errors.description.message as string}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Category</label>
              <select {...register('category')} className="input-field bg-white">
                <option value="">Select a category</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.category && <p className="text-crimson text-xs mt-1 font-sans">{errors.category.message as string}</p>}
            </div>
            <div>
              <label className="label">Venue</label>
              <input {...register('venue')} className="input-field" placeholder="e.g. Main Auditorium, Block B" />
              {errors.venue && <p className="text-crimson text-xs mt-1 font-sans">{errors.venue.message as string}</p>}
            </div>
          </div>
        </div>

        {/* ── Logistics ───────────────────────────────────────────────────── */}
        <div className="card p-5 space-y-4">
          <h2 className="font-serif text-lg">Logistics</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Event Date & Time</label>
              <input {...register('eventDate')} type="datetime-local" className="input-field" />
              {errors.eventDate && <p className="text-crimson text-xs mt-1 font-sans">{errors.eventDate.message as string}</p>}
            </div>
            <div>
              <label className="label">Registration Deadline</label>
              <input {...register('registrationDeadline')} type="datetime-local" className="input-field" />
              {errors.registrationDeadline && <p className="text-crimson text-xs mt-1 font-sans">{errors.registrationDeadline.message as string}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Max Participants</label>
              <input {...register('maxParticipants')} type="number" min={1} className="input-field" placeholder="100" />
              {errors.maxParticipants && <p className="text-crimson text-xs mt-1 font-sans">{errors.maxParticipants.message as string}</p>}
            </div>

            {/* EMAIL REMINDER TOGGLE BLOCK */}
            <div>
              <label className="flex items-center gap-2 mb-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={enableReminder}
                  onChange={e => setEnableReminder(e.target.checked)}
                  className="w-4 h-4 accent-gold rounded border-ink-900/20 cursor-pointer"
                />
                <span className="label !mb-0 group-hover:text-ink-900 transition-colors">Send Email Reminder</span>
              </label>

              {enableReminder ? (
                <>
                  <div className="flex items-center gap-3">
                    <input {...register('reminderHours')} type="number" min={1} max={72} className="input-field max-w-[120px]" placeholder="2" />
                    <span className="text-sm text-ink-600/60 font-sans">hours before event</span>
                  </div>
                  {errors.reminderHours && <p className="text-crimson text-xs mt-1 font-sans">{errors.reminderHours.message as string}</p>}
                </>
              ) : (
                <p className="text-xs text-ink-600/40 font-sans mt-1">
                  Attendees will not receive an automated reminder.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate(-1)} className="btn-outline">
            Cancel
          </button>
          <button type="submit" disabled={createMutation.isPending} className="btn-gold px-8">
            {createMutation.isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Publish Event →'}
          </button>
        </div>
      </form>
    </div>
  )
}