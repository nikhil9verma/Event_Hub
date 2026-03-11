import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
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
  venue: z.string().min(3, 'Venue is required'),
  category: z.string().min(1, 'Category is required'),
  maxParticipants: z.coerce.number().min(1).max(10000),
  eventDate: z.string().min(1, 'Event date is required'),
  eventEndTime: z.string().min(1, 'End time is required'), // Added
  registrationDeadline: z.string().min(1, 'Registration deadline is required'),
  reminderHours: z.coerce.number().min(1).max(72).optional().or(z.literal('')),
  
  contactEmail: z.string().email('Please provide a valid email').optional().or(z.literal('')),
  prizes: z.string().optional(),
  minTeamSize: z.coerce.number().min(1).optional().default(1),
  maxTeamSize: z.coerce.number().min(1).optional().default(1),
  
  stages: z.array(
    z.object({
      title: z.string().min(3, 'Stage title is required'),
      description: z.string().optional(),
      stageDate: z.string().min(1, 'Stage date is required'),
    })
  ).optional().default([]),
})
.refine((data) => new Date(data.registrationDeadline) < new Date(data.eventDate), {
  message: "Registration deadline must be before the event date",
  path: ["registrationDeadline"], 
})
.refine((data) => new Date(data.eventEndTime) > new Date(data.eventDate), {
  message: "End time must be after the start time",
  path: ["eventEndTime"],
})
.refine((data) => data.maxTeamSize >= data.minTeamSize, {
  message: "Max team size cannot be smaller than min size",
  path: ["maxTeamSize"],
});

type EventFormInput = z.input<typeof schema>
type EventForm = z.output<typeof schema>

const CATEGORIES = ['Technology', 'Arts & Culture', 'Sports', 'Academic', 'Social', 'Career', 'Health', 'Other']

export default function CreateEventPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const queryClient = useQueryClient()
  const isEditing = !!id

  const [posterFile, setPosterFile] = useState<File | null>(null)
  const [posterPreview, setPosterPreview] = useState<string>('')
  const posterRef = useRef<HTMLInputElement>(null)

  const [cardFile, setCardFile] = useState<File | null>(null)
  const [cardPreview, setCardPreview] = useState<string>('')
  const cardRef = useRef<HTMLInputElement>(null)

  const [enableReminder, setEnableReminder] = useState(false)
  const [isTeamEvent, setIsTeamEvent] = useState(false)

  const { data: existingEvent, isLoading: isEventLoading } = useQuery({
    queryKey: ['event', Number(id)],
    queryFn: () => eventsApi.getEvent(Number(id)).then((r: any) => r.data.data ?? null),
    enabled: isEditing,
  })

  useEffect(() => {
    if (existingEvent) {
      setEnableReminder(existingEvent.reminderHours != null && existingEvent.reminderHours > 0)
      setIsTeamEvent(existingEvent.maxTeamSize > 1)
    }
  }, [existingEvent])

  const { register, handleSubmit, control, formState: { errors } } = useForm<EventFormInput, any, EventForm>({
    resolver: zodResolver(schema),
    values: existingEvent ? {
      title: existingEvent.title,
      description: existingEvent.description,
      eventDate: existingEvent.eventDate ? existingEvent.eventDate.slice(0, 16) : '',
      eventEndTime: existingEvent.eventEndTime ? existingEvent.eventEndTime.slice(0, 16) : '',
      venue: existingEvent.venue,
      category: existingEvent.category,
      maxParticipants: existingEvent.maxParticipants,
      registrationDeadline: existingEvent.registrationDeadline ? existingEvent.registrationDeadline.slice(0, 16) : '',
      reminderHours: existingEvent.reminderHours || '', 
      contactEmail: existingEvent.contactEmail || '',
      prizes: existingEvent.prizes || '',
      minTeamSize: existingEvent.minTeamSize || 1,
      maxTeamSize: existingEvent.maxTeamSize || 1,
      stages: existingEvent.stages?.map((s: any) => ({
        ...s,
        stageDate: s.stageDate ? s.stageDate.slice(0, 16) : ''
      })) || []
    } : undefined,
  })

  const { fields: stageFields, append: appendStage, remove: removeStage } = useFieldArray({
    control,
    name: "stages"
  });

  const createMutation = useMutation({
    mutationFn: async (data: EventForm) => {
      const payload = {
        ...data,
        eventDate: data.eventDate.length === 16 ? data.eventDate + ':00' : data.eventDate,
        eventEndTime: data.eventEndTime.length === 16 ? data.eventEndTime + ':00' : data.eventEndTime,
        registrationDeadline: data.registrationDeadline.length === 16 ? data.registrationDeadline + ':00' : data.registrationDeadline,
        reminderHours: (enableReminder && data.reminderHours) ? Number(data.reminderHours) : null,
        minTeamSize: isTeamEvent ? data.minTeamSize : 1,
        maxTeamSize: isTeamEvent ? data.maxTeamSize : 1,
        stages: data.stages.map(stage => ({
          ...stage,
          stageDate: stage.stageDate.length === 16 ? stage.stageDate + ':00' : stage.stageDate
        }))
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
      toast.success(isEditing ? 'Changes saved successfully! 🎉' : 'Event created! 🎉')
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['event', Number(id)] }) 
      navigate(`/events/${res.data.data.id}`)
    },
    onError: (err: any) => {
      const responseData = err.response?.data;
      if (responseData?.data && typeof responseData.data === 'object' && !Array.isArray(responseData.data)) {
        const errorMessages = Object.values(responseData.data).join('\n');
        toast.error(`Error:\n${errorMessages}`, { duration: 5000 });
      } else {
        toast.error(responseData?.message || 'Failed to save event.');
      }
    },
  })

  if (isEditing && isEventLoading) {
    return <div className="page-container py-10 max-w-3xl"><div className="skeleton h-64 w-full rounded-2xl" /></div>
  }

  return (
    <div className="page-container py-10 max-w-3xl animate-fade-in">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-ink-900">{isEditing ? 'Edit Event' : 'Create New Event'}</h1>
      </div>

      <form onSubmit={handleSubmit((data) => createMutation.mutate(data), () => toast.error('Please fix errors in the form.'))} className="space-y-6">
        
        {/* Images */}
        <div className="card p-5 space-y-5">
          <h2 className="font-serif text-lg text-ink-900">Event Images</h2>
          <div>
            <div onClick={() => posterRef.current?.click()} className="group border-2 border-dashed border-ink-900/15 rounded-xl overflow-hidden cursor-pointer hover:border-gold/50 transition-colors relative">
              {posterPreview || existingEvent?.posterUrl ? (
                <>
                  <div className="absolute inset-x-0 top-0 bg-ink-900/60 py-2 text-center text-white text-xs font-medium z-10 opacity-90 group-hover:bg-ink-900/80 transition-all">Click to change hero image 📷</div>
                  <img src={posterPreview || getImageUrl(existingEvent?.posterUrl) || ''} alt="Poster" className="w-full h-48 object-cover group-hover:scale-[1.01] transition-transform" />
                </>
              ) : (
                <div className="h-48 flex flex-col items-center justify-center gap-2 text-ink-600/40">
                  <span className="text-4xl">🖼</span>
                  <span className="font-sans text-sm">Click to upload hero image</span>
                </div>
              )}
            </div>
            <input ref={posterRef} type="file" accept="image/*" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) { setPosterFile(file); setPosterPreview(URL.createObjectURL(file)) } }} />
          </div>
        </div>

        {/* Details */}
        <div className="card p-5 space-y-4">
          <h2 className="font-serif text-lg text-ink-900">Event Details</h2>
          <input {...register('title')} className="input-field" placeholder="Event Title" />
          {errors.title && <p className="text-crimson text-xs mt-1">{errors.title.message}</p>}
          
          <textarea {...register('description')} rows={5} className="input-field resize-none" placeholder="Description" />
          {errors.description && <p className="text-crimson text-xs mt-1">{errors.description.message}</p>}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <select {...register('category')} className="input-field bg-white">
              <option value="">Select a category</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input {...register('contactEmail')} type="email" className="input-field" placeholder="Contact Email (Optional)" />
          </div>
          <input {...register('venue')} className="input-field" placeholder="Venue" />
        </div>

        {/* Logistics */}
        <div className="card p-5 space-y-4">
          <h2 className="font-serif text-lg text-ink-900">Logistics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Starts At</label>
              <input {...register('eventDate')} type="datetime-local" className="input-field" />
              {errors.eventDate && <p className="text-crimson text-xs mt-1">{errors.eventDate.message}</p>}
            </div>
            <div>
              <label className="label">Ends At</label>
              <input {...register('eventEndTime')} type="datetime-local" className="input-field" />
              {errors.eventEndTime && <p className="text-crimson text-xs mt-1">{errors.eventEndTime.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Registration Deadline</label>
              <input {...register('registrationDeadline')} type="datetime-local" className="input-field" />
              {errors.registrationDeadline && <p className="text-crimson text-xs mt-1">{errors.registrationDeadline.message}</p>}
            </div>
            <div>
              <label className="label">Max Participants / Teams</label>
              <input {...register('maxParticipants')} type="number" className="input-field" />
            </div>
          </div>
        </div>

        {/* Team Requirements */}
        <div className="card p-5 space-y-4 border-l-4 border-gold">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg text-ink-900">Team Requirements</h2>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={isTeamEvent} onChange={e => setIsTeamEvent(e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-ink-900/20 rounded-full peer-checked:bg-gold transition-all after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
            </label>
          </div>
          {isTeamEvent && (
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-ink-900/5">
              <div>
                <label className="label">Min Team Size</label>
                <input {...register('minTeamSize')} type="number" className="input-field" />
                {errors.minTeamSize && <p className="text-crimson text-xs mt-1">{errors.minTeamSize.message}</p>}
              </div>
              <div>
                <label className="label">Max Team Size</label>
                <input {...register('maxTeamSize')} type="number" className="input-field" />
                {errors.maxTeamSize && <p className="text-crimson text-xs mt-1">{errors.maxTeamSize.message}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Prizes */}
        <div className="card p-5 space-y-4">
          <h2 className="font-serif text-lg text-ink-900">Rewards & Prizes</h2>
          <textarea {...register('prizes')} rows={3} className="input-field resize-none" placeholder="Describe the rewards..." />
        </div>

        {/* Timeline */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg text-ink-900">Event Timeline / Stages</h2>
            <button type="button" onClick={() => appendStage({ title: '', description: '', stageDate: '' })} className="btn-outline text-xs py-1.5 px-3">+ Add Stage</button>
          </div>
          <div className="space-y-4">
            {stageFields.map((field, index) => (
              <div key={field.id} className="p-4 border border-ink-900/10 rounded-xl relative bg-ink-50/30">
                <button type="button" onClick={() => removeStage(index)} className="absolute top-4 right-4 text-crimson font-bold text-sm">✕</button>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input {...register(`stages.${index}.title`)} className="input-field" placeholder="Stage Title" />
                  <input {...register(`stages.${index}.stageDate`)} type="datetime-local" className="input-field" />
                </div>
                <input {...register(`stages.${index}.description`)} className="input-field mt-3" placeholder="Stage Description (Optional)" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate(-1)} className="btn-outline">Cancel</button>
          <button type="submit" disabled={createMutation.isPending} className="btn-gold px-8 flex items-center gap-2">
            {createMutation.isPending ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : (isEditing ? 'Save Changes' : 'Publish Event →')}
          </button>
        </div>
      </form>
    </div>
  )
}