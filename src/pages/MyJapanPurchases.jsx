import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Car, Download, FileText, Trophy, Clock, X, ExternalLink,
  ChevronDown, ChevronUp, Package,
} from 'lucide-react';
import { getMyJapanPurchases, getMyJapanBids, downloadAccountExcel, resolveImageUrl } from '../services/api';

const fmt = (n) => n != null && n !== 0 ? Number(n).toLocaleString() : '—';
const date = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

function FinRow({ label, value, bold }) {
  if (!value && value !== 0) return null;
  return (
    <div className={`flex items-center justify-between py-1.5 ${bold ? 'font-semibold' : ''}`} style={{ borderBottom: '1px solid var(--ae-glass-border)' }}>
      <span className="text-xs" style={{ color: 'var(--ae-ink-muted)' }}>{label}</span>
      <span className="text-xs" style={{ color: bold ? 'var(--ae-ink)' : 'var(--ae-ink-muted)' }}>
        {typeof value === 'number' ? `¥${Number(value).toLocaleString()}` : value}
      </span>
    </div>
  );
}

function PurchaseCard({ purchase }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="card overflow-hidden" style={{ borderRadius: '1.25rem' }}>
      <button className="w-full text-left p-5 flex items-start gap-4" onClick={() => setOpen(o => !o)}>
        <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 flex items-center justify-center" style={{ background: 'var(--ae-glass-bg)' }}>
          {purchase.image_url ? (
            <img src={resolveImageUrl(purchase.image_url.split(',')[0].trim())} alt="" className="w-full h-full object-cover" onError={e => e.target.style.display='none'} />
          ) : (
            <Car size={20} style={{ color: 'var(--ae-ink-faint)' }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Trophy size={13} className="text-yellow-500" />
            <h3 className="font-semibold text-sm" style={{ color: 'var(--ae-ink)' }}>{purchase.make} {purchase.model} {purchase.year}</h3>
            {purchase.bl_status && (
              <span className="liquid-glass rounded-full px-2 py-0.5 text-xs text-green-600">{purchase.bl_status}</span>
            )}
          </div>
          <p className="text-xs mb-1" style={{ color: 'var(--ae-ink-muted)' }}>Chassis: {purchase.chassis || '—'} · Lot: {purchase.lot_number || '—'}</p>
          <p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>{purchase.auction_house} · {date(purchase.auction_date)}</p>
        </div>
        <div className="text-right shrink-0">
          {purchase.total > 0 && (
            <p style={{ fontFamily: 'var(--ae-font-heading)', fontStyle: 'italic', fontSize: '1.1rem', color: 'var(--ae-red)' }}>
              ¥{fmt(purchase.total)}
            </p>
          )}
          <p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>Total</p>
          {open
            ? <ChevronUp size={14} className="mt-2 ml-auto" style={{ color: 'var(--ae-ink-faint)' }} />
            : <ChevronDown size={14} className="mt-2 ml-auto" style={{ color: 'var(--ae-ink-faint)' }} />}
        </div>
      </button>

      {open && (
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6" style={{ borderTop: '1px solid var(--ae-glass-border)' }}>

          <div>
            <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--ae-ink-faint)' }}>Cost Breakdown</p>
            <FinRow label="Bid Price"          value={purchase.bid_price} />
            <FinRow label="Auction Fee"        value={purchase.auction_fee} />
            <FinRow label="Auction Commission" value={purchase.auction_commission} />
            <FinRow label="Transportation"     value={purchase.transportation} />
            <FinRow label="Loading / Customs"  value={purchase.loading_custom} />
            <FinRow label="Commission"         value={purchase.commission} />
            <FinRow label="Tax (10%)"          value={purchase.tax_10pct} />
            <FinRow label="Radiation & Photos" value={purchase.radiation_photos} />
            <FinRow label="Custom"             value={purchase.custom_fee} />
            <FinRow label="Freight"            value={purchase.freight} />
            <FinRow label="Recycle"            value={purchase.recycle} />
            <FinRow label="TOTAL"              value={purchase.total} bold />
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--ae-ink-faint)' }}>Shipping</p>
              {[
                { label: 'Destination',         value: purchase.destination },
                { label: 'Pro-Invoice No.',     value: purchase.pro_invoice_no },
                { label: 'File Code',           value: purchase.file_code },
                { label: 'Ship Name',           value: purchase.ship_name },
                { label: 'ETD',                 value: date(purchase.etd) },
                { label: 'ETA',                 value: date(purchase.eta) },
                { label: 'Route',               value: purchase.route },
                { label: 'Inspection Result',   value: purchase.result_of_inspection },
                { label: 'Remarks',             value: purchase.remarks },
                { label: 'BL Status',           value: purchase.bl_status },
              ].filter(r => r.value && r.value !== '—').map(({ label, value }) => (
                <div key={label} className="flex gap-2 py-1" style={{ borderBottom: '1px solid var(--ae-glass-border)' }}>
                  <span className="text-xs w-36 shrink-0" style={{ color: 'var(--ae-ink-muted)' }}>{label}</span>
                  <span className="text-xs flex-1" style={{ color: 'var(--ae-ink)' }}>{value}</span>
                </div>
              ))}
            </div>

            {purchase.documents?.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--ae-ink-faint)' }}>Documents</p>
                <div className="space-y-2">
                  {purchase.documents.map(doc => (
                    <a key={doc.id} href={doc.file_path} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-black/[0.03] transition-colors group">
                      <FileText size={14} className="shrink-0" style={{ color: 'var(--ae-ink-faint)' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs truncate" style={{ color: 'var(--ae-ink-muted)' }}>{doc.name}</p>
                        <p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>{doc.type} · {date(doc.uploaded_at)}</p>
                      </div>
                      <ExternalLink size={11} className="shrink-0" style={{ color: 'var(--ae-ink-faint)' }} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BidCard({ bid }) {
  const statusColor = bid.status === 'pending' ? '#d97706' : bid.status === 'won' ? '#059669' : '#E11D2C';
  const StatusIcon  = bid.status === 'pending' ? Clock : bid.status === 'won' ? Trophy : X;
  return (
    <Link to={`/japanese-auctions/${bid.pid}`}
      className="card flex items-center gap-4 p-4 hover:bg-black/[0.02] transition-colors" style={{ borderRadius: '1rem' }}>
      <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 flex items-center justify-center" style={{ background: 'var(--ae-glass-bg)' }}>
        {bid.image_url
          ? <img src={resolveImageUrl(bid.image_url)} alt="" className="w-full h-full object-cover" onError={e=>e.target.style.display='none'} />
          : <Car size={18} className="m-auto" style={{ color: 'var(--ae-ink-faint)' }} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--ae-ink)' }}>{bid.make} {bid.model} {bid.year}</p>
        <p className="text-xs" style={{ color: 'var(--ae-ink-muted)' }}>{bid.auction_house} · Lot {bid.lot_number}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold" style={{ color: 'var(--ae-ink)' }}>¥{Number(bid.amount).toLocaleString()}</p>
        <div className="flex items-center gap-1 justify-end mt-0.5">
          <StatusIcon size={10} style={{ color: statusColor }} />
          <span className="text-xs capitalize" style={{ color: statusColor }}>{bid.status}</span>
        </div>
      </div>
    </Link>
  );
}

export default function MyJapanPurchases() {
  const [purchases, setPurchases] = useState([]);
  const [bids,      setBids]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState('purchases');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getMyJapanPurchases().catch(() => ({ data: [] })),
      getMyJapanBids().catch(() => ({ data: [] })),
    ]).then(([pRes, bRes]) => {
      const purchasePids = new Set((pRes.data || []).map(p => p.pid));
      setPurchases(pRes.data || []);
      setBids((bRes.data || []).filter(b => !purchasePids.has(b.pid) || b.status !== 'won'));
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!purchases.length) return;
    Promise.all(
      purchases.map(p =>
        fetch(`/api/japan/purchases/${p.id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }).then(r => r.json()).catch(() => null)
      )
    ).then(details => {
      setPurchases(prev => prev.map((p, i) => details[i] ? { ...p, documents: details[i].documents || [] } : p));
    });
  }, [purchases.length]);

  const handleDownload = async () => {
    setExporting(true);
    try {
      const res = await downloadAccountExcel();
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `nipponbid-account-${new Date().toISOString().slice(0,10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { alert('Export failed') } finally { setExporting(false); }
  };

  return (
    <div data-theme="light" className="py-20 px-4" style={{ background: 'var(--ae-canvas)', minHeight: '100%' }}>
      <div className="max-w-5xl mx-auto">

        <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: 'var(--ae-red)' }}>Japan Auctions</p>
            <h1 className="section-title">My Purchases & Bids</h1>
          </div>
          <button onClick={handleDownload} disabled={exporting || !purchases.length}
            className="btn-ghost text-sm gap-2 disabled:opacity-40">
            <Download size={14} />
            {exporting ? 'Exporting…' : 'Download Account Excel'}
          </button>
        </div>

        <div className="flex gap-1 mb-6 rounded-full p-1 w-fit" style={{ background: 'var(--ae-glass-bg)', border: '1px solid var(--ae-glass-border)' }}>
          {[
            { id: 'purchases', label: `Purchases (${purchases.length})` },
            { id: 'bids',      label: `All Bids (${bids.length})` },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="px-5 py-2 rounded-full text-sm font-medium transition-all"
              style={tab === t.id
                ? { background: 'var(--ae-red)', color: '#fff' }
                : { color: 'var(--ae-ink-muted)' }}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="card skeleton h-24 rounded-2xl" />)}
          </div>
        ) : tab === 'purchases' ? (
          purchases.length === 0 ? (
            <div className="text-center py-24">
              <Package size={40} className="mx-auto mb-4" style={{ color: 'var(--ae-ink-faint)' }} />
              <p className="text-sm" style={{ color: 'var(--ae-ink-muted)' }}>No purchases yet</p>
              <Link to="/japanese-auctions" className="btn-gold text-sm mt-6 inline-flex">Browse Cars</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {purchases.map(p => <PurchaseCard key={p.id} purchase={p} />)}
            </div>
          )
        ) : (
          bids.length === 0 ? (
            <div className="text-center py-24">
              <Car size={40} className="mx-auto mb-4" style={{ color: 'var(--ae-ink-faint)' }} />
              <p className="text-sm" style={{ color: 'var(--ae-ink-muted)' }}>No bids placed yet</p>
              <Link to="/japanese-auctions" className="btn-gold text-sm mt-6 inline-flex">Browse Cars</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {bids.map(b => <BidCard key={b.id} bid={b} />)}
            </div>
          )
        )}
      </div>
    </div>
  );
}
