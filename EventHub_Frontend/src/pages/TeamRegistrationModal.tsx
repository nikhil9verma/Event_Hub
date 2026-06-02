import { useState } from 'react'
import type { Event } from '../types'

interface Props {
  event: Event
  isOpen: boolean
  onClose: () => void
  onSubmitTeam: (data: any) => void
  isPending: boolean
}

export default function TeamRegistrationModal({ event, isOpen, onClose, onSubmitTeam, isPending }: Props) {
  const [teamName, setTeamName] = useState('')
  const [emails, setEmails] = useState<string[]>(Array(event.minTeamSize - 1).fill(''))

  if (!isOpen) return null

  const handleAddMember = () => {
    if (emails.length + 1 < event.maxTeamSize) {
      setEmails([...emails, ''])
    }
  }

  const handleRemoveMember = (index: number) => {
    setEmails(emails.filter((_, i) => i !== index))
  }

  const updateEmail = (index: number, value: string) => {
    const newEmails = [...emails]
    newEmails[index] = value
    setEmails(newEmails)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Filter out empty rows
    const validEmails = emails.filter(e => e.trim() !== '')
    
    onSubmitTeam({
      teamName: teamName.trim(),
      teamMembers: validEmails.map(email => ({ email: email.trim() }))
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="bg-white rounded-2xl w-full max-w-lg relative z-10 shadow-2xl overflow-hidden animate-fade-in">
        <div className="px-6 py-5 border-b border-ink-900/5 flex justify-between items-center bg-ink-50/50">
          <div>
            <h2 className="font-serif text-xl text-ink-900">Register Team</h2>
            <p className="text-xs text-ink-500 font-sans mt-0.5">{event.title}</p>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-900 text-2xl transition-colors">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-600 mb-2">Team Name <span className="text-crimson">*</span></label>
            <input
              required
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g. The Code Fathers"
              className="w-full px-4 py-2.5 bg-white border border-ink-200 rounded-xl text-sm focus:ring-2 focus:ring-gold/50 focus:border-gold outline-none transition-all"
            />
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-end">
              <label className="block text-xs font-bold uppercase tracking-wider text-ink-600">Teammate Emails <span className="text-crimson">*</span></label>
              <span className="text-[10px] text-ink-400 bg-ink-50 px-2 py-1 rounded">Size: {emails.length + 1} / {event.maxTeamSize}</span>
            </div>
            
            <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-lg border border-amber-100 flex gap-2">
              <span className="text-sm">⚠️</span> 
              <span>All teammates must have an existing account on EventHub. We will verify these emails automatically.</span>
            </p>

            {emails.map((email, index) => (
              <div key={index} className="flex gap-2">
                <input
                  required={index < event.minTeamSize - 1} // Only required up to minTeamSize
                  type="email"
                  value={email}
                  onChange={(e) => updateEmail(index, e.target.value)}
                  placeholder={`Teammate ${index + 1} Email`}
                  className="w-full px-4 py-2 bg-white border border-ink-200 rounded-lg text-sm focus:ring-2 focus:ring-gold/50 focus:border-gold outline-none transition-all"
                />
                {index >= event.minTeamSize - 1 && (
                  <button type="button" onClick={() => handleRemoveMember(index)} className="px-3 text-crimson hover:bg-crimson/10 rounded-lg transition-colors">
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {emails.length + 1 < event.maxTeamSize && (
            <button
              type="button"
              onClick={handleAddMember}
              className="w-full py-2.5 border-2 border-dashed border-ink-200 text-ink-500 rounded-xl text-sm font-medium hover:border-gold hover:text-gold transition-colors mb-6"
            >
              + Add Another Teammate
            </button>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-ink-50 text-ink-600 rounded-xl text-sm font-medium hover:bg-ink-100 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isPending} className="flex-1 py-3 btn-gold rounded-xl text-sm">
              {isPending ? 'Verifying...' : 'Complete Registration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}