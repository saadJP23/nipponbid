import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Car, FileText, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { getMyPurchases } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { format } from 'date-fns';

export default function MyPurchases() {
  const [purchases, setPurchases] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getMyPurchases({ page, limit: 10 })
      .then(r => { setPurchases(r.data.purchases || []); setTotal(r.data.total); setPages(r.data.pages); })
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="page-container">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">My Purchases</h1>
        <p className="text-gray-500 mt-1">{total} vehicle{total !== 1 ? 's' : ''} purchased</p>
      </div>

      {loading ? (
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}</div>
      ) : purchases.length === 0 ? (
        <div className="card text-center py-20">
          <ShoppingBag size={48} className="text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400 font-medium">No purchases yet</p>
          <p className="text-gray-600 text-sm mt-1">Win a bid to see your purchases here</p>
          <Link to="/auctions" className="btn-gold mt-5">Browse Cars</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {purchases.map(p => (
            <Link key={p.id} to={`/my-purchases/${p.id}`}>
              <div className="card-hover p-5 flex flex-col sm:flex-row gap-4">
                {p.car_image ? (
                  <img src={p.car_image} alt="" className="w-full sm:w-28 h-24 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-full sm:w-28 h-24 rounded-xl bg-dark-400 flex items-center justify-center shrink-0">
                    <Car size={28} className="text-gray-600" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="text-white font-semibold text-lg">{p.year} {p.make} {p.model}</h3>
                      <p className="text-gray-500 text-sm">Chassis: {p.chassis_number || '—'} · Lot: {p.lot_number || '—'}</p>
                    </div>
                    <StatusBadge status={p.shipping_status} type="shipping" />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                    <div>
                      <p className="text-xs text-gray-600">Final Price</p>
                      <p className="text-gold-500 font-bold">¥{Number(p.final_amount).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Total (incl. fees)</p>
                      <p className="text-white font-semibold">¥{Number(p.total_amount || p.final_amount).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Documents</p>
                      <p className="text-white font-medium flex items-center gap-1"><FileText size={13} className="text-gold-500" /> {p.doc_count}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Purchased</p>
                      <p className="text-gray-400 text-sm">{format(new Date(p.purchased_at), 'MMM d, yyyy')}</p>
                    </div>
                  </div>

                  {p.tracking_number && (
                    <p className="text-xs text-gray-500 bg-dark-400 px-3 py-1.5 rounded-lg inline-block">
                      Tracking: {p.tracking_number}
                    </p>
                  )}
                </div>

                <div className="flex items-center text-gold-500">
                  <ArrowRight size={18} />
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
