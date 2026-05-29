import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gavel, Car, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { getMyBids } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { format } from 'date-fns';

const STATUSES = ['pending', 'approved', 'rejected', 'won', 'lost'];

export default function MyBids() {
  const [bids, setBids] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    getMyBids({ status: statusFilter || undefined, page, limit: 15 })
      .then(r => { setBids(r.data.bids || []); setTotal(r.data.total); setPages(r.data.pages); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [statusFilter, page]);

  return (
    <div data-theme="light" style={{ background: 'var(--ae-canvas)', minHeight: '100%' }} className="page-container">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--ae-ink)' }}>My Bids</h1>
          <p className="text-gray-500 mt-1">{total} total bid{total !== 1 ? 's' : ''}</p>
        </div>
        <Link to="/auctions" className="btn-outline-gold text-sm">Browse Cars</Link>
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        <button
          onClick={() => { setStatusFilter(''); setPage(1); }}
          className="px-4 py-1.5 rounded-full text-sm font-medium border transition-all"
          style={!statusFilter
            ? { background: 'rgba(183,16,42,0.08)', borderColor: 'rgba(183,16,42,0.30)', color: 'var(--ae-red)' }
            : { borderColor: 'var(--ae-glass-border)', color: 'var(--ae-ink-muted)' }}
        >
          All
        </button>
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className="px-4 py-1.5 rounded-full text-sm font-medium border transition-all capitalize"
            style={statusFilter === s
              ? { background: 'rgba(183,16,42,0.08)', borderColor: 'rgba(183,16,42,0.30)', color: 'var(--ae-red)' }
              : { borderColor: 'var(--ae-glass-border)', color: 'var(--ae-ink-muted)' }}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
      ) : bids.length === 0 ? (
        <div className="text-center py-20 card">
          <Gavel size={48} className="text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400 font-medium">No bids found</p>
          <p className="text-gray-600 text-sm mt-1">
            {statusFilter ? `No ${statusFilter} bids` : 'You haven\'t placed any bids yet'}
          </p>
          <Link to="/auctions" className="btn-gold mt-5">Browse Auctions</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {bids.map(bid => (
            <Link key={bid.id} to={`/cars/${bid.car_id}`}>
              <div className="card-hover p-4 flex items-center gap-4">
                {bid.car_image ? (
                  <img src={bid.car_image} alt="" className="w-20 h-16 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-20 h-16 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--ae-glass-bg)' }}>
                    <Car size={22} className="text-gray-600" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold" style={{ color: 'var(--ae-ink)' }}>{bid.year} {bid.make} {bid.model}</p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {bid.auction_name && `${bid.auction_name} · `}Lot #{bid.lot_number || '—'}
                      </p>
                    </div>
                    <StatusBadge status={bid.status} type="bid" />
                  </div>

                  <div className="flex items-center gap-4 mt-2">
                    <div>
                      <span className="text-xs text-gray-600">Bid Amount</span>
                      <p className="text-gold-500 font-bold text-sm">¥{Number(bid.amount).toLocaleString()}</p>
                    </div>
                    {bid.auction_date && (
                      <div>
                        <span className="text-xs text-gray-600">Auction Date</span>
                        <p className="text-gray-400 text-sm">{format(new Date(bid.auction_date), 'MMM d, yyyy')}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-xs text-gray-600">Placed</span>
                      <p className="text-gray-400 text-sm">{format(new Date(bid.created_at), 'MMM d, yyyy')}</p>
                    </div>
                  </div>

                  {bid.admin_note && (
                    <p className="text-xs mt-1.5 px-3 py-1.5 rounded-lg" style={{ color: 'var(--ae-ink-muted)', background: 'var(--ae-glass-bg)' }}>
                      Note: {bid.admin_note}
                    </p>
                  )}
                </div>
              </div>
            </Link>
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
