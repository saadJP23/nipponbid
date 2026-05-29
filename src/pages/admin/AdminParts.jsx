import React, { useEffect, useState } from 'react';
import { Package, Download, Globe, Factory, ChevronLeft, ChevronRight, ExternalLink, X } from 'lucide-react';
import { getAllParts, updatePart, exportAllParts } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const STATUSES = ['pending', 'processing', 'ordered', 'shipped', 'delivered', 'cancelled'];

export default function AdminParts() {
  const [parts, setParts] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [typeFilter, setTypeFilter] = useState('');
  const [actionModal, setActionModal] = useState(null);
  const [updateForm, setUpdateForm] = useState({ status: '', final_price: '', tracking_number: '', admin_note: '' });
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = () => {
    setLoading(true);
    getAllParts({ status: statusFilter || undefined, type: typeFilter || undefined, page, limit: 12 })
      .then(r => { setParts(r.data.parts || []); setTotal(r.data.total); setPages(r.data.pages); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter, typeFilter, page]);

  const openAction = (part) => {
    setUpdateForm({ status: part.status, final_price: part.final_price || '', tracking_number: part.tracking_number || '', admin_note: part.admin_note || '' });
    setActionModal(part);
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      await updatePart(actionModal.id, updateForm);
      toast.success('Parts order updated!');
      setActionModal(null);
      load();
    } catch { toast.error('Failed to update'); } finally { setSaving(false); }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data } = await exportAllParts();
      const url = URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a');
      a.href = url; a.download = `nipponbid-all-parts-${Date.now()}.xlsx`; a.click();
      URL.revokeObjectURL(url);
      toast.success('Exported!');
    } catch { toast.error('Export failed'); } finally { setExporting(false); }
  };

  const inactivePill = { borderColor: 'var(--ae-glass-border)', color: 'var(--ae-ink-muted)' };

  return (
    <div data-theme="light" style={{ background: 'var(--ae-canvas)', minHeight: '100vh' }}>
      <div className="page-container">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--ae-ink)' }}>Parts Orders</h1>
            <p className="mt-1" style={{ color: 'var(--ae-ink-muted)' }}>{total} order{total !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={handleExport} disabled={exporting} className="btn-outline-gold text-sm flex items-center gap-1.5">
            <Download size={14} />{exporting ? 'Exporting...' : 'Export All'}
          </button>
        </div>

        <div className="flex gap-2 flex-wrap mb-6">
          <button onClick={() => { setTypeFilter(''); setPage(1); }}
            className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
            style={!typeFilter ? { background: 'rgba(183,16,42,0.08)', borderColor: 'rgba(183,16,42,0.25)', color: '#b7102a' } : inactivePill}>All Types</button>
          <button onClick={() => { setTypeFilter('online'); setPage(1); }}
            className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1"
            style={typeFilter === 'online' ? { background: 'rgba(183,16,42,0.08)', borderColor: 'rgba(183,16,42,0.25)', color: '#b7102a' } : inactivePill}>
            <Globe size={11} /> Online</button>
          <button onClick={() => { setTypeFilter('manufacturer'); setPage(1); }}
            className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1"
            style={typeFilter === 'manufacturer' ? { background: 'rgba(183,16,42,0.08)', borderColor: 'rgba(183,16,42,0.25)', color: '#b7102a' } : inactivePill}>
            <Factory size={11} /> Manufacturer</button>
          <div className="w-px self-stretch mx-1" style={{ background: 'var(--ae-glass-border)' }} />
          <button onClick={() => { setStatusFilter(''); setPage(1); }}
            className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
            style={!statusFilter ? { background: 'var(--ae-glass-bg)', borderColor: 'var(--ae-glass-border)', color: 'var(--ae-ink)' } : inactivePill}>All</button>
          {STATUSES.map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
              className="px-3 py-1.5 rounded-full text-xs font-medium border capitalize transition-all"
              style={statusFilter === s ? { background: 'rgba(183,16,42,0.08)', borderColor: 'rgba(183,16,42,0.25)', color: '#b7102a' } : inactivePill}>{s}</button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>
        ) : parts.length === 0 ? (
          <div className="card text-center py-20">
            <Package size={48} className="mx-auto mb-4" style={{ color: 'var(--ae-ink-faint)' }} />
            <p style={{ color: 'var(--ae-ink-muted)' }}>No parts orders</p>
          </div>
        ) : (
          <div className="space-y-3">
            {parts.map(p => (
              <div key={p.id} className="card p-4 flex items-start gap-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${p.type === 'online' ? 'bg-blue-500/10' : 'bg-orange-500/10'}`}>
                  {p.type === 'online' ? <Globe size={16} className="text-blue-500" /> : <Factory size={16} className="text-orange-500" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <p className="font-semibold" style={{ color: 'var(--ae-ink)' }}>{p.part_name}</p>
                      <p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>{p.user_name} · {p.user_country || 'Unknown'} · {p.user_email}</p>
                    </div>
                    <StatusBadge status={p.status} type="parts" />
                  </div>
                  <p className="text-xs mb-1.5 capitalize" style={{ color: 'var(--ae-ink-muted)' }}>
                    {p.type === 'online' ? `Platform: ${p.platform_name || 'Online'}` : `Chassis: ${p.chassis_number} · ${p.car_make} ${p.car_model} ${p.car_year || ''}`}
                  </p>
                  <div className="flex gap-4 text-sm flex-wrap">
                    <span className="font-bold" style={{ color: 'var(--ae-red)' }}>¥{Number(p.bid_price).toLocaleString()}</span>
                    {p.final_price && <span className="text-emerald-600">Final: ¥{Number(p.final_price).toLocaleString()}</span>}
                    <span className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>Qty: {p.quantity}</span>
                    <span className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>{format(new Date(p.created_at), 'MMM d, yyyy')}</span>
                    {p.platform_link && (
                      <a href={p.platform_link} target="_blank" rel="noreferrer" className="text-blue-500 text-xs flex items-center gap-1 hover:text-blue-400"><ExternalLink size={11} /> Link</a>
                    )}
                  </div>
                </div>

                <button onClick={() => openAction(p)} className="btn-ghost text-xs px-3 py-2 shrink-0">Update</button>
              </div>
            ))}
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-ghost disabled:opacity-30 text-sm">← Prev</button>
            <span className="text-sm" style={{ color: 'var(--ae-ink-muted)' }}>Page {page} of {pages}</span>
            <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="btn-ghost disabled:opacity-30 text-sm">Next →</button>
          </div>
        )}

        {actionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActionModal(null)} />
            <div className="relative card p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold" style={{ color: 'var(--ae-ink)' }}>Update Parts Order</h3>
                <button onClick={() => setActionModal(null)} style={{ color: 'var(--ae-ink-faint)' }} className="hover:opacity-70"><X size={16} /></button>
              </div>
              <p className="text-sm mb-4" style={{ color: 'var(--ae-ink-muted)' }}>{actionModal.part_name} · {actionModal.user_name}</p>
              <div className="space-y-4">
                <div>
                  <label className="label">Status</label>
                  <select value={updateForm.status} onChange={e => setUpdateForm(f => ({ ...f, status: e.target.value }))} className="select-field">
                    {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
                <div><label className="label">Final Price (¥)</label><input type="number" value={updateForm.final_price} onChange={e => setUpdateForm(f => ({ ...f, final_price: e.target.value }))} placeholder="Final agreed price" className="input-field" /></div>
                <div><label className="label">Tracking Number</label><input type="text" value={updateForm.tracking_number} onChange={e => setUpdateForm(f => ({ ...f, tracking_number: e.target.value }))} placeholder="Shipping tracking" className="input-field" /></div>
                <div><label className="label">Admin Note</label><textarea value={updateForm.admin_note} onChange={e => setUpdateForm(f => ({ ...f, admin_note: e.target.value }))} rows={2} className="input-field resize-none" /></div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setActionModal(null)} className="btn-ghost flex-1 justify-center">Cancel</button>
                <button onClick={handleUpdate} disabled={saving} className="btn-gold flex-1 justify-center">{saving ? '...' : 'Save'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
