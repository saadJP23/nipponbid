import React, { useEffect, useState } from 'react';
import { Gavel, CheckCircle, XCircle, Trophy, ChevronLeft, ChevronRight } from 'lucide-react';
import { getAllBids, updateBid } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const STATUSES = ['pending', 'approved', 'rejected', 'won', 'lost'];

export default function AdminBids() {
  const [bids, setBids] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [actionModal, setActionModal] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    getAllBids({ status: statusFilter || undefined, page, limit: 15 })
      .then(r => { setBids(r.data.bids || []); setTotal(r.data.total); setPages(r.data.pages); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter, page]);

  const handleAction = async (newStatus) => {
    if (!actionModal) return;
    setSubmitting(true);
    try {
      await updateBid(actionModal.id, { status: newStatus, admin_note: adminNote });
      toast.success(`Bid ${newStatus}`);
      setActionModal(null);
      setAdminNote('');
      load();
    } catch { toast.error('Action failed'); } finally { setSubmitting(false); }
  };

  return (
    <div data-theme="light" style={{ background: 'var(--ae-canvas)', minHeight: '100vh' }}>
      <div className="page-container">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--ae-ink)' }}>Manage Bids</h1>
            <p className="mt-1" style={{ color: 'var(--ae-ink-muted)' }}>{total} bid{total !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap mb-6">
          <button onClick={() => { setStatusFilter(''); setPage(1); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${!statusFilter ? 'bg-gold-500/10 border-gold-500/30 text-gold-400' : 'text-gray-500'}`}
            style={!statusFilter ? {} : { borderColor: 'var(--ae-glass-border)' }}>All</button>
          {STATUSES.map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border capitalize transition-all ${statusFilter === s ? 'bg-gold-500/10 border-gold-500/30 text-gold-400' : 'text-gray-500'}`}
              style={statusFilter === s ? {} : { borderColor: 'var(--ae-glass-border)' }}>{s}</button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
        ) : bids.length === 0 ? (
          <div className="card text-center py-20">
            <Gavel size={48} className="mx-auto mb-4" style={{ color: 'var(--ae-ink-faint)' }} />
            <p style={{ color: 'var(--ae-ink-muted)' }}>No {statusFilter} bids</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bids.map(bid => (
              <div key={bid.id} className="card p-4 flex items-center gap-4">
                {bid.car_image ? (
                  <img src={bid.car_image} alt="" className="w-20 h-14 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-20 h-14 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'var(--ae-glass-bg)', color: 'var(--ae-ink-faint)' }}>
                    <Gavel size={20} />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="font-semibold" style={{ color: 'var(--ae-ink)' }}>{bid.year} {bid.make} {bid.model}</p>
                      <p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>{bid.auction_name} · Lot #{bid.lot_number || '—'}</p>
                    </div>
                    <StatusBadge status={bid.status} type="bid" />
                  </div>
                  <div className="flex gap-4 mt-1.5 flex-wrap text-sm">
                    <span className="font-bold" style={{ color: 'var(--ae-red)' }}>¥{Number(bid.amount).toLocaleString()}</span>
                    <span style={{ color: 'var(--ae-ink-muted)' }}>{bid.user_name} ({bid.user_country || 'Unknown'})</span>
                    <span className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>{bid.user_email}</span>
                    <span className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>{format(new Date(bid.created_at), 'MMM d, yyyy HH:mm')}</span>
                  </div>
                  {bid.admin_note && (
                    <p className="text-xs mt-1 px-2 py-1 rounded"
                      style={{ color: 'var(--ae-ink-muted)', background: 'var(--ae-glass-bg)' }}>
                      Note: {bid.admin_note}
                    </p>
                  )}
                </div>

                {bid.status === 'pending' && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => setActionModal(bid)} className="btn-gold text-xs px-3 py-1.5">Review</button>
                  </div>
                )}
                {bid.status === 'approved' && (
                  <button onClick={() => setActionModal(bid)} className="btn-outline-gold text-xs px-3 py-1.5 shrink-0">Mark Won/Lost</button>
                )}
              </div>
            ))}
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-ghost disabled:opacity-30"><ChevronLeft size={16} /></button>
            <span className="text-sm" style={{ color: 'var(--ae-ink-muted)' }}>Page {page} of {pages}</span>
            <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="btn-ghost disabled:opacity-30"><ChevronRight size={16} /></button>
          </div>
        )}

        {actionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActionModal(null)} />
            <div className="relative card p-6 w-full max-w-md animate-fade-up">
              <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--ae-ink)' }}>Update Bid Status</h3>
              <p className="text-sm mb-4" style={{ color: 'var(--ae-ink-muted)' }}>
                {actionModal.make} {actionModal.model} · ¥{Number(actionModal.amount).toLocaleString()} · {actionModal.user_name}
              </p>
              <div className="mb-4">
                <label className="label">Admin Note (optional)</label>
                <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} rows={2} placeholder="Reason or additional info..." className="input-field resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {actionModal.status === 'pending' ? (
                  <>
                    <button onClick={() => handleAction('approved')} disabled={submitting} className="btn-gold justify-center"><CheckCircle size={14} /> Approve</button>
                    <button onClick={() => handleAction('rejected')} disabled={submitting} className="py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all text-sm font-medium flex items-center justify-center gap-1"><XCircle size={14} /> Reject</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleAction('won')} disabled={submitting} className="btn-gold justify-center"><Trophy size={14} /> Won</button>
                    <button onClick={() => handleAction('lost')} disabled={submitting} className="py-2.5 rounded-xl border border-gray-300/50 bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all text-sm font-medium flex items-center justify-center gap-1"><XCircle size={14} /> Lost</button>
                  </>
                )}
              </div>
              <button onClick={() => setActionModal(null)} className="btn-ghost w-full justify-center mt-2">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
