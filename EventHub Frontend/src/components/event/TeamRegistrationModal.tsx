import { useForm, useFieldArray } from 'react-hook-form'
import { useAuthStore } from '../../store/authStore'
import { Event } from '../../types'
import { useEffect } from 'react'

interface TeamRegistrationModalProps {
  event: Event
  isOpen: boolean
  onClose: () => void
  onSubmitTeam: (teamData: { teamName: string; teamMembers: { email: string }[] }) => void
  isPending: boolean
}

interface FormValues {
  teamName: string 
  teamMembers: { email: string }[]
}

export default function TeamRegistrationModal({ event, isOpen, onClose, onSubmitTeam, isPending }: TeamRegistrationModalProps) {
  const { user } = useAuthStore()
  
  // FIXED: Ensure these values never drop below 0 to prevent "RangeError: Invalid array length"
  const maxExtraMembers = Math.max(0, (event?.maxTeamSize || 1) - 1)
  const minExtraMembers = Math.max(0, (event?.minTeamSize || 1) - 1)

  const { register, handleSubmit, control, formState: { errors }, reset } = useForm<FormValues>({
    defaultValues: {
      teamName: '', 
      teamMembers: Array(maxExtraMembers).fill({ email: '' })
    }
  })

  const { fields } = useFieldArray({
    control,
    name: "teamMembers"
  })

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      reset({ 
        teamName: '', 
        teamMembers: Array(maxExtraMembers).fill({ email: '' }) 
      })
    }
  }, [isOpen, maxExtraMembers, reset])

  if (!isOpen) return null

  const handleFormSubmit = (data: FormValues) => {
    // Filter out completely empty optional rows before sending to backend
    const validMembers = data.teamMembers.filter(member => member.email.trim() !== '')
    
    onSubmitTeam({ 
      teamName: data.teamName, 
      teamMembers: validMembers 
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-ink-900/5 flex justify-between items-center bg-ink-50/50 shrink-0">
          <div>
            <h2 className="font-serif text-2xl text-ink-900">Register Team</h2>
            <p className="text-sm text-ink-600 font-sans mt-1">
              {event?.minTeamSize === event?.maxTeamSize 
                ? `This event requires a team of exactly ${event?.maxTeamSize || 1}.` 
                : `This event requires a team of ${event?.minTeamSize || 1} to ${event?.maxTeamSize || 1} members.`}
            </p>
          </div>
          <button onClick={onClose} className="text-ink-600 hover:text-crimson transition-colors font-bold text-xl">✕</button>
        </div>

        {/* Form Body (Scrollable) */}
        <div className="p-6 overflow-y-auto flex-1">
          <form id="team-form" onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            
            {/* Team Name Input */}
            <div className="p-4 border border-ink-900/10 rounded-xl">
              <label className="block text-sm font-bold text-ink-900 mb-2">
                Team Name <span className="text-crimson">*</span>
              </label>
              <input 
                {...register('teamName', { required: "Team name is required" })} 
                placeholder="e.g. The Code Fathers"
                className="input-field py-2 text-sm w-full border border-ink-200 focus:ring-2 focus:ring-gold/50 outline-none rounded-lg px-3"
              />
              {errors.teamName && (
                <p className="text-crimson text-xs mt-1">{errors.teamName.message}</p>
              )}
            </div>

            {/* ─── INVITATION EXPLANATION BANNER ─── */}
            <div className="bg-blue-50/80 p-3.5 rounded-xl border border-blue-100 flex gap-3 text-blue-800 shadow-sm">
              <span className="text-lg">📧</span> 
              <div className="text-xs leading-relaxed font-medium">
                We will send invitations to these emails. <br/>
                <span className="text-blue-600/80 font-normal">Make sure they already have an EventHub account, or the invitation will fail.</span>
              </div>
            </div>

            {/* Slot 1: The Leader (Read Only) */}
            <div className="p-4 border-2 border-gold/30 bg-gold/5 rounded-xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gold mb-3 flex items-center gap-2">
                👑 Team Leader (You)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 opacity-70 cursor-not-allowed">
                <input value={user?.name || ''} disabled className="input-field py-2 text-sm bg-white w-full border border-ink-200 rounded-lg px-3" />
                <input value={user?.email || ''} disabled className="input-field py-2 text-sm bg-white w-full border border-ink-200 rounded-lg px-3" />
              </div>
            </div>

            {/* Teammate Slots */}
            {fields.map((item, index) => {
              const isRequired = index < minExtraMembers;
              
              return (
                <div key={item.id} className="p-4 border border-ink-900/10 rounded-xl relative">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900/60 mb-3 flex items-center gap-2">
                    👤 Teammate {index + 2}
                    {!isRequired && <span className="badge border bg-ink-50 text-[10px] lowercase normal-case">Optional</span>}
                  </h3>
                  
                  <div>
                    <input 
                      {...register(`teamMembers.${index}.email`, { 
                        required: isRequired ? "Email is required" : false,
                        pattern: { value: /^\S+@\S+$/i, message: "Invalid email" }
                      })} 
                      placeholder="Teammate's Email Address"
                      className="input-field py-2 text-sm w-full border border-ink-200 focus:ring-2 focus:ring-gold/50 outline-none rounded-lg px-3"
                    />
                    {errors.teamMembers?.[index]?.email && (
                      <p className="text-crimson text-xs mt-1">{errors.teamMembers[index]?.email?.message}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-ink-900/5 bg-ink-50/50 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button 
            type="submit" 
            form="team-form"
            disabled={isPending} 
            className="btn-gold px-8 flex items-center gap-2"
          >
            {isPending ? 'Sending Invites...' : 'Send Invitations →'}
          </button>
        </div>

      </div>
    </div>
  )
}