import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { eventsApi } from '../../api/Endpoints'
import type { Event } from '../../types'

interface Props {
  event: Event | null
  onClose: () => void
}

export default function DeleteEventModal({ event, onClose }: Props) {
  const [confirmText, setConfirmText] = useState('')
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: (id: number) => eventsApi.deleteEvent(id),
    onSuccess: () => {
      toast.success('Event deleted successfully')
      // Refresh the specific list of the host's events
      queryClient.invalidateQueries({ queryKey: ['myEvents'] }) 
      // Also refresh global events just in case
      queryClient.invalidateQueries({ queryKey: ['events'] }) 
      setConfirmText('')
      onClose()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete event')
    }
  })

  // If no event is selected, don't render the modal
  if (!event) return null

  // The button is only enabled if the typed text perfectly matches the title
  const isMatch = confirmText === event.title

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-ink-800 border border-ink-700 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in">
        
        <h3 className="text-xl font-serif text-white mb-4 flex items-center gap-2">
          <span className="text-crimson">⚠️</span> Delete Event
        </h3>
        
        <p className="text-red-400 font-sans text-sm mb-4 leading-relaxed">
          Are you sure you want to delete the <strong className="text-white font-bold">{event.title}</strong> event? This action is permanent and cannot be undone.
        </p>
        
        <p className="text-red-400 font-sans text-xs mb-2">
          Please type <strong className="text-white">{event.title}</strong> to confirm.
        </p>
        
        <input 
          type="text" 
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="w-full bg-ink-900 border border-ink-700 rounded-lg px-4 py-3 text-white focus:border-crimson focus:outline-none mb-6 font-sans transition-colors"
          placeholder={event.title}
        />
        
        <div className="flex justify-end gap-3">
          <button 
            onClick={() => {
              setConfirmText('')
              onClose()
            }}
            disabled={deleteMutation.isPending}
            className="btn-outline px-5 py-2.5 text-sm rounded-xl"
          >
            Cancel
          </button>
          
          <button 
            onClick={() => deleteMutation.mutate(event.id)}
            disabled={!isMatch || deleteMutation.isPending}
            className={`px-5 py-2.5 text-sm rounded-xl font-semibold transition-all ${
              isMatch 
                ? 'bg-crimson text-white hover:bg-red-700 shadow-lg' 
                : 'bg-ink-700 text-ink-400 cursor-not-allowed'
            }`}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
          </button>
        </div>

      </div>
    </div>
  )
}