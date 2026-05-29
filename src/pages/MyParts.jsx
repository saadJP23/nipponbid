import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, Download, Globe, Factory, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { getMyParts, exportMyParts } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const STATUSES = ['pending', 'processing', 'ordered', 'shipped', 'delivered', 'cancelled'];

export default function MyParts() {
  const [parts, setParts] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setLoading(true);
    getMyParts({ status: statusFilter || undefined, type: typeFilter || undefined, page, limit: 12 })
      .then(r => { setParts(r.data.parts || []); setTotal(r.data.total); setPages(r.data.pages); })
      .finally(() => setLoading(false));
  }, [statusFilter, typeFilter, page]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data } = await exportMyParts();
      const url = URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a');
      a.href = url; a.download = `nipponbid-parts-${Date.now()}.xlsx`; a.click();
      URL.revokeObjectURL(url);
      toast.success('Export downloaded!');
    } catch { toast.error('Export failed'); } finally { setExporting(false); }
  };

  return (
    <div data-theme="light" style={{ background: 'var(--ae-canvas)', minHeight: '100%' }} className="page-container">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--ae-ink)' }}>My Parts Orders</h1>
          <p className="text-gray-500 mt-1">{total} order{total !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExport} disabled={exporting} className="btn-outline-gold text-sm">
            <Download size={15} />
            {exporting ? 'Exporting...' : 'Export Excel'}
          </button>
          <Link to="/parts" className="btn-gold text-sm">+ New Order</Link>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        {[['', 'All Types'], ['online', 'Online'], ['manufacturer', 'Manufacturer']].map(([val, lbl]) => (
          <button key={val} onClick={() => { setTypeFilter(val); setPage(1); }}
            className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1"
            style={typeFilter === val
              ? { background: 'rgba(183,16,42,0.08)', borderColor: 'rgba(183,16,42,0.30)', color: 'var(--ae-red)' }
              : { borderColor: 'var(--ae-glass-border)', color: 'var(--ae-ink-muted)' }}>
            {val === 'online' && <Globe size={11} />}{val === 'manufacturer' && <Factory size={11} />}{lbl}
          </button>
        ))}
        <div className="w-px h-6 self-center mx-1" style={{ background: 'var(--ae-glass-border)' }} />
        <button onClick={() => { setStatusFilter(''); setPage(1); }}
          className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
          style={!statusFilter
            ? { background: 'rgba(183,16,42,0.08)', borderColor: 'rgba(183,16,42,0.30)', color: 'var(--ae-red)' }
            : { borderColor: 'var(--ae-glass-border)', color: 'var(--ae-ink-muted)' }}>All Status</button>
        {STATUSES.map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className="px-3 py-1.5 rounded-full text-xs font-medium border capitalize transition-all"
            style={statusFilter === s
              ? { background: 'rgba(183,16,42,0.08)', borderColor: 'rgba(183,16,42,0.30)', color: 'var(--ae-red)' }
              : { borderColor: 'var(--ae-glass-border)', color: 'var(--ae-ink-muted)' }}>{s}</button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>
      ) : parts.length === 0 ? (
        <div className="card text-center py-20">
          <Wrench size={48} className="text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400 font-medium">No parts orders</p>
          <Link to="/parts" className="btn-gold mt-5">Order Parts</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {parts.map(p => (
            <div key={p.id} className="card p-4 flex items-start gap-4">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${p.type === 'online' ? 'bg-blue-500/10' : 'bg-orange-500/10'}`}>
                {p.type === 'online' ? <Globe size={16} className="text-blue-400" /> : <Factory size={16} className="text-orange-400" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <p className="text-white font-semibold">{p.part_name}</p>
                    <p className="text-gray-500 text-xs capitalize">{p.type === 'online' ? `${p.platform_name || 'Online'} · Qty: ${p.quantity}` : `${p.car_make} ${p.car_model} ${p.car_year || ''} · Chassis: ${p.chassis_number || '—'}`}</p>
                  </div>
                  <StatusBadge status={p.status} type="parts" />
                </div>

                {p.part_description && <p className="text-gray-600 text-xs mt-1 truncate">{p.part_description}</p>}

                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  <div>
                    <span className="text-xs text-gray-600">Bid Price</span>
                    <p className="text-gold-500 font-bold text-sm">¥{Number(p.bid_price).toLocaleString()}</p>
                  </div>
                  {p.final_price && (
                    <div>
                      <span className="text-xs text-gray-600">Final Price</span>
                      <p className="text-emerald-400 font-semibold text-sm">¥{Number(p.final_price).toLocaleString()}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-xs text-gray-600">Ordered</span>
                    <p className="text-gray-400 text-xs">{format(new Date(p.created_at), 'MMM d, yyyy')}</p>
                  </div>
                  {p.tracking_number && (
                    <div>
                      <span className="text-xs text-gray-600">Tracking</span>
                      <p className="text-gray-400 text-xs font-medium">{p.tracking_number}</p>
                    </div>
                  )}
                  {p.platform_link && (
                    <a href={p.platform_link} target="_blank" rel="noreferrer" className="text-blue-400 text-xs flex items-center gap-1 hover:text-blue-300">
                      <ExternalLink size={11} /> View Listing
                    </a>
                  )}
                </div>

                {p.admin_note && (
                  <p className="text-xs mt-2 px-3 py-1.5 rounded-lg" style={{ color: 'var(--ae-ink-muted)', background: 'var(--ae-glass-bg)' }}>Note: {p.admin_note}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-ghost disabled:opacity-30"><ChevronLeft size={16} /></button>
          <span className="text-gray-400 text-sm">Page {page} of {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="btn-ghost disabled:opacity-30"><ChevronRight size={16} /></button>
        </div>
      )}
    </div>
  );
}
