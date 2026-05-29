import React, { useEffect, useState } from 'react';
import { ShoppingBag, Upload, Truck, FileText, X, Plus } from 'lucide-react';
import { getAllPurchases, updateShipping, uploadDocument, createPurchase, getAllBids } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const DOC_TYPES = ['auction_sheet','export_certificate','bill_of_lading','inspection_report','deregistration','customs_clearance','other'];
const DOC_LABELS = { auction_sheet:'Auction Sheet', export_certificate:'Export Certificate', bill_of_lading:'Bill of Lading', inspection_report:'Inspection Report', deregistration:'Deregistration', customs_clearance:'Customs Clearance', other:'Other' };
const SHIPPING_STATUSES = ['processing','in_transit','at_port','customs','delivered'];

export default function AdminPurchases() {
  const [purchases, setPurchases] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [shippingModal, setShippingModal] = useState(null);
  const [docModal, setDocModal] = useState(null);
  const [shippingForm, setShippingForm] = useState({ shipping_status:'', tracking_number:'', vessel_name:'', eta:'' });
  const [docForm, setDocForm] = useState({ type:'auction_sheet', name:'' });
  const [docFile, setDocFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    getAllPurchases({ page, limit: 12 }).then(r => {
      setPurchases(r.data.purchases || []);
      setTotal(r.data.total || 0);
      setPages(r.data.pages || 1);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page]);

  const openShipping = (p) => {
    setShippingForm({ shipping_status: p.shipping_status, tracking_number: p.tracking_number || '', vessel_name: p.vessel_name || '', eta: p.eta ? p.eta.slice(0, 16) : '' });
    setShippingModal(p);
  };

  const handleShippingSave = async () => {
    setSaving(true);
    try {
      await updateShipping(shippingModal.id, shippingForm);
      toast.success('Shipping updated!');
      setShippingModal(null);
      load();
    } catch { toast.error('Failed to update shipping'); } finally { setSaving(false); }
  };

  const handleDocUpload = async () => {
    if (!docFile) return toast.error('Select a file first');
    setSaving(true);
    const fd = new FormData();
    fd.append('document', docFile);
    fd.append('type', docForm.type);
    fd.append('name', docForm.name || docFile.name);
    try {
      await uploadDocument(docModal.id, fd);
      toast.success('Document uploaded!');
      setDocModal(null);
      setDocFile(null);
    } catch { toast.error('Upload failed'); } finally { setSaving(false); }
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Manage Purchases</h1>
          <p className="text-gray-500 mt-1">{total} purchase{total !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}</div>
      ) : purchases.length === 0 ? (
        <div className="card text-center py-20"><ShoppingBag size={48} className="text-gray-700 mx-auto mb-4" /><p className="text-gray-400">No purchases yet</p></div>
      ) : (
        <div className="space-y-4">
          {purchases.map(p => (
            <div key={p.id} className="card p-5 flex flex-col sm:flex-row gap-4">
              {p.car_image ? <img src={p.car_image} alt="" className="w-full sm:w-24 h-20 rounded-xl object-cover shrink-0" /> : (
                <div className="w-full sm:w-24 h-20 rounded-xl bg-dark-400 flex items-center justify-center shrink-0"><ShoppingBag size={24} className="text-gray-600" /></div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-white font-semibold">{p.make} {p.model} {p.year}</p>
                    <p className="text-gray-500 text-sm">{p.user_name} · {p.user_country || 'Unknown'}</p>
                    <p className="text-gray-600 text-xs">{p.user_email}</p>
                  </div>
                  <StatusBadge status={p.shipping_status} type="shipping" />
                </div>
                <div className="flex gap-4 text-sm flex-wrap">
                  <span className="text-gold-500 font-bold">¥{Number(p.final_amount).toLocaleString()}</span>
                  <span className="text-gray-500">{p.doc_count} docs</span>
                  {p.tracking_number && <span className="text-gray-500">Tracking: {p.tracking_number}</span>}
                  <span className="text-gray-600 text-xs">{format(new Date(p.purchased_at), 'MMM d, yyyy')}</span>
                </div>
              </div>

              <div className="flex gap-2 shrink-0 flex-wrap sm:flex-col">
                <button onClick={() => openShipping(p)} className="btn-ghost text-xs flex items-center gap-1.5 px-3 py-2">
                  <Truck size={13} /> Shipping
                </button>
                <button onClick={() => setDocModal(p)} className="btn-ghost text-xs flex items-center gap-1.5 px-3 py-2">
                  <Upload size={13} /> Document
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-ghost disabled:opacity-30 text-sm">← Prev</button>
          <span className="text-gray-400 text-sm">Page {page} of {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="btn-ghost disabled:opacity-30 text-sm">Next →</button>
        </div>
      )}

      {shippingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShippingModal(null)} />
          <div className="relative card p-6 w-full max-w-md">
            <h3 className="text-white font-bold mb-4">Update Shipping Status</h3>
            <p className="text-gray-400 text-sm mb-4">{shippingModal.make} {shippingModal.model} · {shippingModal.user_name}</p>
            <div className="space-y-4">
              <div>
                <label className="label">Status</label>
                <select value={shippingForm.shipping_status} onChange={e => setShippingForm(f => ({ ...f, shipping_status: e.target.value }))} className="select-field">
                  {SHIPPING_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())}</option>)}
                </select>
              </div>
              <div><label className="label">Tracking Number</label><input type="text" value={shippingForm.tracking_number} onChange={e => setShippingForm(f => ({ ...f, tracking_number: e.target.value }))} placeholder="TKX12345678" className="input-field" /></div>
              <div><label className="label">Vessel Name</label><input type="text" value={shippingForm.vessel_name} onChange={e => setShippingForm(f => ({ ...f, vessel_name: e.target.value }))} placeholder="MV Pioneer" className="input-field" /></div>
              <div><label className="label">ETA</label><input type="datetime-local" value={shippingForm.eta} onChange={e => setShippingForm(f => ({ ...f, eta: e.target.value }))} className="input-field" /></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShippingModal(null)} className="btn-ghost flex-1 justify-center">Cancel</button>
              <button onClick={handleShippingSave} disabled={saving} className="btn-gold flex-1 justify-center">{saving ? '...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {docModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDocModal(null)} />
          <div className="relative card p-6 w-full max-w-md">
            <h3 className="text-white font-bold mb-4">Upload Document</h3>
            <p className="text-gray-400 text-sm mb-4">{docModal.make} {docModal.model} · {docModal.user_name}</p>
            <div className="space-y-4">
              <div>
                <label className="label">Document Type</label>
                <select value={docForm.type} onChange={e => setDocForm(f => ({ ...f, type: e.target.value }))} className="select-field">
                  {DOC_TYPES.map(t => <option key={t} value={t}>{DOC_LABELS[t]}</option>)}
                </select>
              </div>
              <div><label className="label">Document Name</label><input type="text" value={docForm.name} onChange={e => setDocForm(f => ({ ...f, name: e.target.value }))} placeholder="Leave blank to use filename" className="input-field" /></div>
              <div>
                <label className="label">File (PDF or Image)</label>
                <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${docFile ? 'border-gold-500/30 bg-gold-500/5' : 'border-white/10 hover:border-white/20'}`}>
                  <input type="file" accept=".pdf,image/*" onChange={e => setDocFile(e.target.files[0])} className="hidden" id="docInput" />
                  <label htmlFor="docInput" className="cursor-pointer">
                    {docFile ? (
                      <div>
                        <FileText size={22} className="text-gold-400 mx-auto mb-1" />
                        <p className="text-gold-400 text-sm">{docFile.name}</p>
                      </div>
                    ) : (
                      <div>
                        <Upload size={22} className="text-gray-600 mx-auto mb-1" />
                        <p className="text-gray-500 text-sm">Click to select file</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setDocModal(null); setDocFile(null); }} className="btn-ghost flex-1 justify-center">Cancel</button>
              <button onClick={handleDocUpload} disabled={saving || !docFile} className="btn-gold flex-1 justify-center">{saving ? '...' : 'Upload'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
