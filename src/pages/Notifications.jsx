import { useEffect, useState } from 'react'
import { getNotifications, markRead, markAllRead, deleteNotification } from '../services/api'
import { Bell, Check, Trash2, CheckCheck } from 'lucide-react'
import toast from 'react-hot-toast'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    getNotifications({ limit: 50 })
      .then(r => {
        setNotifications(r.data?.notifications || [])
        setUnread(r.data?.unread || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleMarkRead = async (id) => {
    try {
      await markRead(id)
      setNotifications(ns => ns.map(n => n.notification_id === id ? { ...n, is_read: true } : n))
      setUnread(u => Math.max(0, u - 1))
    } catch { toast.error('Failed') }
  }

  const handleMarkAll = async () => {
    try {
      await markAllRead()
      setNotifications(ns => ns.map(n => ({ ...n, is_read: true })))
      setUnread(0)
      toast.success('All marked as read')
    } catch { toast.error('Failed') }
  }

  const handleDelete = async (id) => {
    try {
      await deleteNotification(id)
      setNotifications(ns => ns.filter(n => n.notification_id !== id))
    } catch { toast.error('Failed') }
  }

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          {unread > 0 && <p className="page-subtitle">{unread} unread</p>}
        </div>
        {unread > 0 && (
          <button className="btn btn-secondary" onClick={handleMarkAll}>
            <CheckCheck size={15} /> Mark all read
          </button>
        )}
      </div>

      <div className="card divide-y divide-grey-100">
        {loading ? (
          <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-16 rounded" />)}</div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center">
            <Bell size={32} className="mx-auto text-grey-300 mb-3" />
            <p className="text-grey-500 text-sm">No notifications</p>
          </div>
        ) : notifications.map(n => (
          <div key={n.notification_id}
            className={`flex items-start gap-4 px-5 py-4 transition-colors ${!n.is_read ? 'bg-red-light/30' : 'hover:bg-grey-50'}`}>
            <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!n.is_read ? 'bg-red' : 'bg-transparent'}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${!n.is_read ? 'font-semibold text-navy' : 'text-grey-700'}`}>{n.message}</p>
              <p className="text-xs text-grey-400 mt-1">{fmtDate(n.created_at)}</p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              {!n.is_read && (
                <button className="btn-icon" title="Mark read" onClick={() => handleMarkRead(n.notification_id)}>
                  <Check size={14} />
                </button>
              )}
              <button className="btn-icon text-grey-400 hover:text-red" title="Delete" onClick={() => handleDelete(n.notification_id)}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
