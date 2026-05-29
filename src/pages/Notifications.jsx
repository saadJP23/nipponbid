import React, { useEffect, useState } from 'react';
import { Bell, Check, Trash2, BellOff } from 'lucide-react';
import { getNotifications, markRead, markAllRead, deleteNotification } from '../services/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const TYPE_COLORS = { bid: 'text-gold-400 bg-gold-500/10', purchase: 'text-emerald-400 bg-emerald-500/10', document: 'text-blue-400 bg-blue-500/10', parts: 'text-orange-400 bg-orange-500/10', general: 'text-gray-400 bg-gray-500/10' };
const TYPE_ICONS = { bid: '🔨', purchase: '🚗', document: '📄', parts: '🔧', general: '🔔' };

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getNotifications({ limit: 50 }).then(r => {
      setNotifications(r.data.notifications || []);
      setUnread(r.data.unread || 0);
      setTotal(r.data.total || 0);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleRead = async (id) => {
    await markRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnread(u => Math.max(0, u - 1));
  };

  const handleReadAll = async () => {
    await markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnread(0);
    toast.success('All notifications marked as read');
  };

  const handleDelete = async (id) => {
    await deleteNotification(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    setTotal(t => t - 1);
  };

  return (
    <div className="page-container max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Bell size={22} className="text-gold-500" /> Notifications</h1>
          <p className="text-gray-500 mt-1">{unread} unread · {total} total</p>
        </div>
        {unread > 0 && (
          <button onClick={handleReadAll} className="btn-ghost text-sm"><Check size={14} /> Mark all read</button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
      ) : notifications.length === 0 ? (
        <div className="card text-center py-20">
          <BellOff size={48} className="text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400 font-medium">No notifications yet</p>
          <p className="text-gray-600 text-sm mt-1">We'll notify you about bid updates, purchases, and documents</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${!n.is_read ? 'bg-dark-300 border-gold-500/10' : 'bg-dark-200 border-transparent'}`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base ${TYPE_COLORS[n.type] || TYPE_COLORS.general}`}>
                {TYPE_ICONS[n.type] || '🔔'}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`font-semibold text-sm ${!n.is_read ? 'text-white' : 'text-gray-300'}`}>{n.title}</p>
                  <span className="text-gray-600 text-xs shrink-0">{format(new Date(n.created_at), 'MMM d, h:mm a')}</span>
                </div>
                <p className="text-gray-500 text-sm mt-0.5">{n.message}</p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {!n.is_read && (
                  <button onClick={() => handleRead(n.id)} className="p-1.5 rounded-lg text-gray-600 hover:text-gold-400 hover:bg-gold-500/10 transition-colors" title="Mark as read">
                    <Check size={14} />
                  </button>
                )}
                <button onClick={() => handleDelete(n.id)} className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Delete">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
