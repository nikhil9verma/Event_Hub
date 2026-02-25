import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { notificationsApi } from '../../api/Endpoints'
import toast from 'react-hot-toast'
import type { Notification } from '../../types'

interface NotificationPanelProps {
  onClose: () => void
}

export default function NotificationPanel({ onClose }: NotificationPanelProps) {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getNotifications().then((r: { data: { data: any } }) => r.data.data??null),
  })

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] })
      toast.success('All marked as read')
    },
  })

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] })
    },
  })

  const notifications: Notification[] = data?.content ?? []
  const unread = notifications.filter(n => !n.read).length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-ink-900/8 flex items-center justify-between">
        <div>
          <h2 className="font-serif text-xl text-ink-900">Notifications</h2>
          {unread > 0 && (
            <p className="text-xs text-ink-600/50 font-sans">{unread} unread</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <button
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
              className="text-xs text-gold font-sans hover:text-gold-dark transition-colors"
            >
              Mark all read
            </button>
          )}
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ink-900/8 transition-colors text-ink-600">
            ✕
          </button>
        </div>
      </div>

      {/* Notifications list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-16 rounded-xl" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-ink-600/30">
            <span className="text-5xl">🔔</span>
            <p className="font-sans text-sm">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-ink-900/5">
            {notifications.map((notif: Notification) => (
              <div
                key={notif.id}
                onClick={() => !notif.read && markReadMutation.mutate(notif.id)}
                className={`px-5 py-4 cursor-pointer transition-colors hover:bg-parchment-100 ${
                  !notif.read ? 'bg-gold/5 border-l-2 border-gold' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${notif.read ? 'bg-transparent' : 'bg-gold'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-sans font-medium text-sm text-ink-900 mb-0.5 leading-tight">
                      {notif.title}
                    </p>
                    <p className="font-sans text-xs text-ink-600/60 leading-relaxed">
                      {notif.message}
                    </p>
                    <p className="text-[11px] text-ink-600/30 font-sans mt-1.5 font-mono">
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}