import { useState } from 'react'

export default function AddTeammateModal({ isOpen, onClose, onAdd, isPending, slotsLeft }: any) {
  const [emails, setEmails] = useState<string[]>([''])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const validEmails = emails.filter(e => e.trim() !== '')
    if (validEmails.length > 0) onAdd(validEmails)
  }

  const updateEmail = (index: number, val: string) => {
    const newEmails = [...emails];
    newEmails[index] = val;
    setEmails(newEmails);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col">
        <div className="p-6 border-b border-ink-900/5 bg-ink-50/50">
          <h2 className="font-serif text-xl text-ink-900 mb-1">Invite New Teammates</h2>
          <p className="text-xs text-ink-500 font-sans">You have room for {slotsLeft} more {slotsLeft === 1 ? 'member' : 'members'} in your team.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="max-h-48 overflow-y-auto pr-1 space-y-3">
            {emails.map((email, idx) => (
              <div key={idx} className="relative">
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => updateEmail(idx, e.target.value)}
                  placeholder="friend@university.edu" 
                  required
                  className="w-full px-4 py-2.5 border border-ink-200 rounded-xl text-sm focus:ring-2 focus:ring-gold/50 outline-none transition-all"
                />
              </div>
            ))}
          </div>
          
          {emails.length < slotsLeft && (
            <button 
              type="button" 
              onClick={() => setEmails([...emails, ''])} 
              className="text-xs text-gold font-bold uppercase tracking-widest hover:text-gold/80 transition-colors"
            >
              + Add Another Slot
            </button>
          )}

          <div className="flex gap-3 mt-6 pt-4 border-t border-ink-900/5">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-ink-50 rounded-xl font-bold text-ink-600 text-sm hover:bg-ink-100 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isPending} className="flex-1 py-3 btn-gold rounded-xl text-sm shadow-sm">
              {isPending ? 'Sending Invitations...' : 'Send Invites'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}