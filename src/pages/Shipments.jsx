import React, { useState, useEffect } from 'react';
import { Ship, Search, MapPin, Calendar, FileText, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { getMyShipments } from '../services/api';
import { format } from 'date-fns';

const shipStatusBadge = (s) => {
  const map = { pending: 'badge-gray', departed: 'badge-blue', arrived: 'badge-green', delivered: 'badge-gold' };
  return <span className={map[s] || 'badge-gray'}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Pending'}</span>;
};

const blBadge = (s) => {
  const map = { pending: 'badge-orange', consigned: 'badge-blue', completed: 'badge-green' };
  return <span className={map[s] || 'badge-gray'}>{s || 'N/A'}</span>;
};

export default function Shipments() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ ship_name: '', file_code: '', bl_code: '', chassis_number: '', etd_from: '', eta_from: '' });

  const load = async (p = page) => {
    setLoading(true);
    try {
      const { data } = await getMyShipments({ ...filters, page: p, limit: 15 });
      setShipments(data.shipments);
      setTotal(data.total);
    } catch { toast.error('Failed to load shipments'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(1); setPage(1); }, []);

  const handleSearch = (e) => { e.preventDefault(); setPage(1); load(1); };

  const F = ({ label, children }) => (
    <div>
      <p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>{label}</p>
      <p style={{ color: 'var(--ae-ink)' }}>{children}</p>
    </div>
  );

  return (
    <div data-theme="light" style={{ background: 'var(--ae-canvas)', minHeight: '100%' }}>
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--ae-ink)' }}>My Shipments</h1>
          <p className="mt-1" style={{ color: 'var(--ae-ink-muted)' }}>Track your vehicles at sea and in transit</p>
        </div>

        <form onSubmit={handleSearch} className="card p-4 mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <input className="input-field text-sm" placeholder="Ship Name" value={filters.ship_name} onChange={e => setFilters({ ...filters, ship_name: e.target.value })} />
          <input className="input-field text-sm" placeholder="File Code" value={filters.file_code} onChange={e => setFilters({ ...filters, file_code: e.target.value })} />
          <input className="input-field text-sm" placeholder="BL Code" value={filters.bl_code} onChange={e => setFilters({ ...filters, bl_code: e.target.value })} />
          <input className="input-field text-sm" placeholder="Chassis No." value={filters.chassis_number} onChange={e => setFilters({ ...filters, chassis_number: e.target.value })} />
          <input type="date" className="input-field text-sm" placeholder="ETD From" value={filters.etd_from} onChange={e => setFilters({ ...filters, etd_from: e.target.value })} />
          <input type="date" className="input-field text-sm" placeholder="ETA From" value={filters.eta_from} onChange={e => setFilters({ ...filters, eta_from: e.target.value })} />
          <button type="submit" className="btn-gold col-span-2 sm:col-span-3 lg:col-span-6 flex items-center justify-center gap-2">
            <Search className="w-4 h-4" /> Search
          </button>
        </form>

        {loading ? (
          <div className="text-center py-20" style={{ color: 'var(--ae-ink-muted)' }}>Loading...</div>
        ) : shipments.length === 0 ? (
          <div className="card p-16 text-center">
            <Ship className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--ae-ink-faint)' }} />
            <p style={{ color: 'var(--ae-ink-muted)' }}>No shipments found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {shipments.map(s => (
              <div key={s.purchase_id} className="card p-5 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-sm font-semibold" style={{ color: 'var(--ae-red)' }}>{s.file_code || '—'}</span>
                      {s.bl_code && <span className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>BL: {s.bl_code}</span>}
                      {shipStatusBadge(s.ship_status)}
                    </div>
                    <h3 className="font-semibold text-lg" style={{ color: 'var(--ae-ink)' }}>
                      {s.year} {s.make} {s.model}
                    </h3>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--ae-ink-muted)' }}>{s.chassis_number} · {s.lot_number || '—'} · {s.grade || '—'}</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm min-w-[300px]">
                    <div>
                      <p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>Ship</p>
                      <p style={{ color: 'var(--ae-ink)' }}>{s.ship_name || '—'}</p>
                      {s.shipping_company && <p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>{s.shipping_company}</p>}
                    </div>
                    <div>
                      <p className="text-xs flex items-center gap-1" style={{ color: 'var(--ae-ink-faint)' }}><Calendar className="w-3 h-3" />ETD</p>
                      <p style={{ color: 'var(--ae-ink)' }}>{s.etd ? format(new Date(s.etd), 'dd MMM yy') : '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs flex items-center gap-1" style={{ color: 'var(--ae-ink-faint)' }}><Calendar className="w-3 h-3" />ETA</p>
                      <p className="font-medium" style={{ color: 'var(--ae-ink)' }}>{s.eta ? format(new Date(s.eta), 'dd MMM yy') : '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs flex items-center gap-1" style={{ color: 'var(--ae-ink-faint)' }}><MapPin className="w-3 h-3" />From</p>
                      <p style={{ color: 'var(--ae-ink)' }}>{s.port_of_loading || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs flex items-center gap-1" style={{ color: 'var(--ae-ink-faint)' }}><MapPin className="w-3 h-3" />To</p>
                      <p style={{ color: 'var(--ae-ink)' }}>{s.port_of_discharge || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>BL Status</p>
                      {blBadge(s.bl_status)}
                    </div>
                  </div>
                </div>

                {(s.vessel_doc_path || s.bl_doc_path) && (
                  <div className="mt-4 pt-4 flex items-center gap-4 flex-wrap" style={{ borderTop: '1px solid var(--ae-glass-border)' }}>
                    <p className="text-xs uppercase tracking-widest shrink-0" style={{ color: 'var(--ae-ink-faint)' }}>Documents</p>
                    {s.vessel_doc_path && (
                      <a href={s.vessel_doc_path} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs hover:opacity-80 transition-opacity" style={{ color: '#2563eb' }}>
                        <FileText size={12} />{s.vessel_doc_name || 'Shipping Document'}<ExternalLink size={10} />
                      </a>
                    )}
                    {s.bl_doc_path && (
                      <a href={s.bl_doc_path} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs hover:opacity-80 transition-opacity" style={{ color: '#059669' }}>
                        <FileText size={12} />{s.bl_doc_name || 'BL Document'}<ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {total > 15 && (
          <div className="flex justify-center gap-2 mt-6">
            <button disabled={page === 1} onClick={() => { setPage(p => p - 1); load(page - 1); }} className="btn-ghost disabled:opacity-40">Prev</button>
            <span className="text-sm self-center" style={{ color: 'var(--ae-ink-muted)' }}>{page} / {Math.ceil(total / 15)}</span>
            <button disabled={page >= Math.ceil(total / 15)} onClick={() => { setPage(p => p + 1); load(page + 1); }} className="btn-ghost disabled:opacity-40">Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
