import React, { useEffect, useState, useRef } from 'react';
import {
  Download, Trophy, X, Clock, Check, FileText, Upload,
  ChevronDown, ChevronUp, Car, Save, Trash2, AlertCircle,
} from 'lucide-react';
import {
  getAllJapanBids, exportJapanBids, updateJapanBid,
  createJapanPurchase, getAllJapanPurchases, updateJapanPurchase,
  uploadJapanDocument, deleteJapanDocument, resolveImageUrl,
} from '../../services/api';
import { toDateInputValue } from '../../utils/dates';

const fmt  = (n) => n != null && n !== 0 ? Number(n).toLocaleString() : '—';
const date = (d) => d ? new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '—';

const FIELD_DEFS = [
  { key: 'pro_invoice_no',     label: 'Pro-Invoice No.',       type: 'text'   },
  { key: 'file_code',          label: 'File Code',             type: 'text'   },
  { key: 'destination',        label: 'Destination',           type: 'text'   },
  { key: 'bid_price',          label: 'Bid Price (¥)',         type: 'number' },
  { key: 'auction_fee',        label: 'Auction Fee (¥)',       type: 'number' },
  { key: 'auction_commission', label: 'Auction Commission (¥)',type: 'number' },
  { key: 'transportation',     label: 'Transportation (¥)',    type: 'number' },
  { key: 'loading_custom',     label: 'Loading/Custom (¥)',    type: 'number' },
  { key: 'commission',         label: 'Commission (¥)',        type: 'number' },
  { key: 'tax_10pct',          label: 'Tax 10% (¥)',           type: 'number' },
  { key: 'radiation_photos',   label: 'Radiation & Photos (¥)',type: 'number' },
  { key: 'custom_fee',         label: 'Custom (¥)',            type: 'number' },
  { key: 'freight',            label: 'Freight (¥)',           type: 'number' },
  { key: 'recycle',            label: 'Recycle (¥)',           type: 'number' },
  { key: 'total',              label: 'TOTAL (¥)',             type: 'number' },
  { key: 'shipping_company',   label: 'Shipping Company',      type: 'text'   },
  { key: 'etd',                label: 'ETD',                   type: 'date'   },
  { key: 'ship_name',          label: 'Ship Name',             type: 'text'   },
  { key: 'eta',                label: 'ETA',                   type: 'date'   },
  { key: 'route',              label: 'Route',                 type: 'text'   },
  { key: 'result_of_inspection',label:'Result of Inspection',  type: 'text'   },
  { key: 'remarks',            label: 'Remarks',               type: 'text'   },
  { key: 'bl_status',          label: 'BL Status',             type: 'text'   },
];

function PurchaseEditor({ purchase, onSaved }) {
  const [form,    setForm]    = useState({});
  const [saving,  setSaving]  = useState(false);
  const [docs,    setDocs]    = useState(purchase.documents || []);
  const [uploading,setUploading]=useState(false);
  const [saved,   setSaved]   = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    const init = {};
    FIELD_DEFS.forEach(({ key, type }) => {
      const raw = purchase[key];
      if (raw == null || raw === '') {
        init[key] = '';
      } else if (type === 'date') {
        init[key] = toDateInputValue(raw);
      } else if (type === 'number') {
        init[key] = raw;
      } else {
        init[key] = String(raw);
      }
    });
    setForm(init);
    setDocs(purchase.documents || []);
  }, [purchase]);

  const handleSave = async () => {
    setSaving(true); setSaved(false);
    try {
      await updateJapanPurchase(purchase.id, { ...purchase, ...form });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      onSaved?.();
    } catch (e) { alert(e.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('document', file);
    fd.append('type', 'other');
    fd.append('name', file.name);
    setUploading(true);
    try {
      const res = await uploadJapanDocument(purchase.id, fd);
      setDocs(d => [...d, res.data]);
    } catch (err) { alert('Upload failed'); }
    finally { setUploading(false); fileRef.current.value = ''; }
  };

  const handleDeleteDoc = async (docId) => {
    if (!confirm('Delete this document?')) return;
    await deleteJapanDocument(purchase.id, docId);
    setDocs(d => d.filter(doc => doc.id !== docId));
  };

  return (
    <div className="p-5 space-y-6" style={{ borderTop: '1px solid var(--ae-glass-border)' }}>
      <div>
        <p className="text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--ae-ink-faint)' }}>Account Details (fill all fields)</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {FIELD_DEFS.map(f => (
            <div key={f.key}>
              <label className="label text-xs">{f.label}</label>
              <input
                type={f.type}
                className="input-field text-xs"
                value={form[f.key] || ''}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <button onClick={handleSave} disabled={saving}
          className="btn-gold mt-4 text-sm gap-2 disabled:opacity-50">
          {saved ? <><Check size={14} /> Saved!</> : <><Save size={14} /> {saving ? 'Saving…' : 'Save Details'}</>}
        </button>
      </div>

      <div>
        <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--ae-ink-faint)' }}>Documents</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {docs.map(doc => (
            <div key={doc.id} className="liquid-glass rounded-xl px-3 py-2 flex items-center gap-2">
              <FileText size={12} style={{ color: 'var(--ae-ink-faint)' }} />
              <a href={resolveImageUrl(doc.file_path)} target="_blank" rel="noopener noreferrer"
                className="text-xs transition-colors hover:opacity-70" style={{ color: 'var(--ae-ink-muted)' }}>{doc.name}</a>
              <button onClick={() => handleDeleteDoc(doc.id)} className="ml-1 hover:text-red-500" style={{ color: 'var(--ae-ink-faint)' }}>
                <Trash2 size={11} />
              </button>
            </div>
          ))}
          {docs.length === 0 && <p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>No documents yet</p>}
        </div>
        <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="btn-ghost text-xs gap-1.5 disabled:opacity-50">
          <Upload size={12} /> {uploading ? 'Uploading…' : 'Upload Document'}
        </button>
        <p className="text-xs mt-1" style={{ color: 'var(--ae-ink-faint)' }}>PDF, JPEG, PNG, Word — user will be emailed when you upload.</p>
      </div>
    </div>
  );
}

function BidRow({ bid, onUpdate }) {
  const [loading,  setLoading]  = useState(false);
  const [creating, setCreating] = useState(false);
  const [confirm,  setConfirm]  = useState(null);

  const mark = async (status) => {
    setLoading(true); setConfirm(null);
    try {
      await updateJapanBid(bid.id, { status });
      onUpdate?.();
    } catch (e) { alert(e.response?.data?.message || 'Error'); }
    finally { setLoading(false); }
  };

  const markWon = async () => {
    setCreating(true); setConfirm(null);
    try {
      await updateJapanBid(bid.id, { status: 'won' });
      await createJapanPurchase({ bid_id: bid.id });
      onUpdate?.();
    } catch (e) { alert(e.response?.data?.message || 'Error'); }
    finally { setCreating(false); }
  };

  const statusColor = bid.status === 'won' ? '#34d399' : bid.status === 'lost' ? '#f87171' : '#fbbf24';

  return (
    <tr className="transition-colors hover:bg-black/[0.02]" style={{ borderBottom: '1px solid var(--ae-glass-border)' }}>
      <td className="py-3 px-4">
        <p className="text-sm font-medium" style={{ color: 'var(--ae-ink)' }}>{bid.user_name}</p>
        <p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>{bid.user_email}</p>
        {bid.user_phone && <p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>{bid.user_phone}</p>}
      </td>
      <td className="py-3 px-4">
        <p className="text-sm" style={{ color: 'var(--ae-ink)' }}>{bid.make} {bid.model}</p>
        <p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>Chassis: {bid.chassis || '—'}</p>
        <p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>Lot: {bid.lot_number || '—'} · {bid.auction_house}</p>
      </td>
      <td className="py-3 px-4">
        <p className="font-semibold" style={{ color: 'var(--ae-ink)' }}>¥{fmt(bid.amount)}</p>
        {bid.start_price > 0 && <p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>Start: ¥{fmt(bid.start_price)}</p>}
      </td>
      <td className="py-3 px-4">
        <span className="text-xs font-medium capitalize" style={{ color: statusColor }}>{bid.status}</span>
        <p className="text-xs mt-0.5" style={{ color: 'var(--ae-ink-faint)' }}>{date(bid.created_at)}</p>
      </td>
      <td className="py-3 px-4 min-w-[160px]">
        {confirm === 'won' && (
          <div className="space-y-1.5">
            <p className="text-xs leading-tight" style={{ color: 'var(--ae-ink-muted)' }}>Mark as Won + create purchase?</p>
            <div className="flex gap-2">
              <button onClick={markWon} disabled={creating}
                className="text-xs font-semibold text-green-600 hover:text-green-500 disabled:opacity-40">
                {creating ? 'Processing…' : 'Yes, confirm'}
              </button>
              <button onClick={() => setConfirm(null)} className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>Cancel</button>
            </div>
          </div>
        )}
        {confirm === 'lost' && (
          <div className="space-y-1.5">
            <p className="text-xs leading-tight" style={{ color: 'var(--ae-ink-muted)' }}>Mark this bid as Lost?</p>
            <div className="flex gap-2">
              <button onClick={() => mark('lost')} disabled={loading}
                className="text-xs font-semibold text-red-500 hover:text-red-400 disabled:opacity-40">
                {loading ? 'Saving…' : 'Yes, confirm'}
              </button>
              <button onClick={() => setConfirm(null)} className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>Cancel</button>
            </div>
          </div>
        )}

        {!confirm && bid.status === 'pending' && (
          <div className="flex flex-col gap-1.5">
            <button onClick={() => setConfirm('won')}
              className="btn-ghost text-xs gap-1.5 text-green-400 hover:bg-green-400/10">
              <Trophy size={11} /> Mark Won
            </button>
            <button onClick={() => setConfirm('lost')}
              className="btn-ghost text-xs gap-1.5 text-red-400 hover:bg-red-400/10">
              <X size={11} /> Mark Lost
            </button>
          </div>
        )}
        {!confirm && bid.status !== 'pending' && (
          <button onClick={() => mark('pending')} disabled={loading}
            className="btn-ghost text-xs gap-1 disabled:opacity-40"
            style={{ color: 'var(--ae-ink-faint)' }}>
            <Clock size={11} /> Reset
          </button>
        )}
      </td>
    </tr>
  );
}

function PurchaseRow({ purchase, onSaved }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr className="cursor-pointer transition-colors hover:bg-black/[0.02]"
        style={{ borderBottom: '1px solid var(--ae-glass-border)' }}
        onClick={() => setOpen(o=>!o)}>
        <td className="py-3 px-4">
          <p className="text-sm font-medium" style={{ color: 'var(--ae-ink)' }}>{purchase.user_name}</p>
          <p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>{purchase.user_email}</p>
        </td>
        <td className="py-3 px-4">
          <p className="text-sm" style={{ color: 'var(--ae-ink)' }}>{purchase.make} {purchase.model} {purchase.year}</p>
          <p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>Chassis: {purchase.chassis || '—'} · Lot: {purchase.lot_number || '—'}</p>
        </td>
        <td className="py-3 px-4">
          <p className="text-sm" style={{ color: 'var(--ae-ink)' }}>{purchase.file_code || '—'}</p>
        </td>
        <td className="py-3 px-4">
          <p className="font-semibold" style={{ color: 'var(--ae-ink)' }}>{purchase.total > 0 ? `¥${fmt(purchase.total)}` : '—'}</p>
        </td>
        <td className="py-3 px-4">
          <span className="text-xs" style={{ color: 'var(--ae-ink-muted)' }}>{purchase.bl_status || 'Pending'}</span>
          <p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>{purchase.doc_count || 0} docs</p>
        </td>
        <td className="py-3 px-4 text-right">
          {open
            ? <ChevronUp size={14} className="inline" style={{ color: 'var(--ae-ink-faint)' }} />
            : <ChevronDown size={14} className="inline" style={{ color: 'var(--ae-ink-faint)' }} />}
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={6} style={{ background: 'var(--ae-glass-bg)' }}>
            <PurchaseEditor purchase={purchase} onSaved={onSaved} />
          </td>
        </tr>
      )}
    </>
  );
}

export default function AdminJapanBids() {
  const [tab,       setTab]       = useState('bids');
  const [bids,      setBids]      = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState('pending');
  const [exporting, setExporting] = useState(false);

  const loadBids = async () => {
    setLoading(true);
    try {
      const res = await getAllJapanBids({ limit: 200 });
      setBids(res.data.bids || []);
    } catch { } finally { setLoading(false); }
  };

  const loadPurchases = async () => {
    setLoading(true);
    try {
      const res = await getAllJapanPurchases({ limit: 200 });
      const withDocs = await Promise.all(
        (res.data.purchases || []).map(p =>
          fetch(`/api/japan/purchases/${p.id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }).then(r => r.json()).catch(() => p)
        )
      );
      setPurchases(withDocs);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => {
    if (tab === 'bids') loadBids();
    else loadPurchases();
  }, [tab]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await exportJapanBids(filter !== 'all' ? { status: filter } : {});
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `nipponbid-bids-${Date.now()}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Export failed'); } finally { setExporting(false); }
  };

  const filteredBids = filter === 'all' ? bids : bids.filter(b => b.status === filter);

  return (
    <div data-theme="light" className="min-h-screen py-20 px-4" style={{ background: 'var(--ae-canvas)' }}>
      <div className="max-w-7xl mx-auto">

        <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: 'var(--ae-red)' }}>Admin</p>
            <h1 className="section-title">Japan Auction Bids</h1>
          </div>
          {tab === 'bids' && (
            <button onClick={handleExport} disabled={exporting}
              className="btn-ghost text-sm gap-2 disabled:opacity-40">
              <Download size={14} /> {exporting ? 'Exporting…' : 'Export Excel'}
            </button>
          )}
        </div>

        <div className="flex gap-1 mb-6 liquid-glass rounded-full p-1 w-fit">
          {[
            { id: 'bids',      label: `Bids (${bids.length})` },
            { id: 'purchases', label: `Purchases (${purchases.length})` },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="px-5 py-2 rounded-full text-sm font-medium transition-all"
              style={{ background: tab===t.id ? '#b7102a' : 'transparent', color: tab===t.id ? '#fff' : 'var(--ae-ink-muted)' }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'bids' && (
          <>
            <div className="flex gap-2 mb-5 flex-wrap">
              {[
                { id: 'pending', label: 'Pending', activeStyle: { background:'rgba(251,191,36,0.15)', color:'#fbbf24', boxShadow:'inset 0 0 0 1px rgba(251,191,36,0.30)' } },
                { id: 'won',     label: 'Won',     activeStyle: { background:'rgba(52,211,153,0.15)', color:'#34d399', boxShadow:'inset 0 0 0 1px rgba(52,211,153,0.30)' } },
                { id: 'lost',    label: 'Lost',    activeStyle: { background:'rgba(225,29,44,0.15)',  color:'#f87171', boxShadow:'inset 0 0 0 1px rgba(225,29,44,0.30)'  } },
                { id: 'all',     label: 'All',     activeStyle: { background:'rgba(0,0,0,0.08)',color:'var(--ae-ink)',    boxShadow:'inset 0 0 0 1px rgba(0,0,0,0.15)' } },
              ].map(({ id, label, activeStyle }) => (
                <button key={id} onClick={() => setFilter(id)}
                  className="btn-ghost text-xs capitalize"
                  style={filter === id ? activeStyle : {}}>
                  {label} ({id === 'all' ? bids.length : bids.filter(b => b.status === id).length})
                </button>
              ))}
            </div>

            {loading ? (
              <div className="card p-8 text-center" style={{ color: 'var(--ae-ink-faint)' }}>Loading bids…</div>
            ) : filteredBids.length === 0 ? (
              <div className="card p-12 text-center">
                <AlertCircle size={32} className="mx-auto mb-3" style={{ color: 'var(--ae-ink-faint)' }} />
                <p className="text-sm" style={{ color: 'var(--ae-ink-faint)' }}>No {filter === 'all' ? '' : filter} bids yet</p>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--ae-glass-border)' }}>
                        {['Customer','Car','Bid Amount','Status','Actions'].map(h => (
                          <th key={h} className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--ae-ink-faint)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBids.map(bid => (
                        <BidRow key={bid.id} bid={bid} onUpdate={loadBids} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'purchases' && (
          loading ? (
            <div className="card p-8 text-center" style={{ color: 'var(--ae-ink-faint)' }}>Loading purchases…</div>
          ) : purchases.length === 0 ? (
            <div className="card p-12 text-center">
              <Car size={32} className="mx-auto mb-3" style={{ color: 'var(--ae-ink-faint)' }} />
              <p className="text-sm" style={{ color: 'var(--ae-ink-faint)' }}>No purchases yet. Mark a bid as Won to create one.</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--ae-glass-border)' }}>
                      {['Customer','Car','File Code','Total','BL Status',''].map(h => (
                        <th key={h} className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--ae-ink-faint)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map(p => (
                      <PurchaseRow key={p.id} purchase={p} onSaved={loadPurchases} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
