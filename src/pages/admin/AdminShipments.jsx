import React, { useState, useEffect, useRef } from 'react';
import {
  Ship, Plus, Edit2, FileText, Trash2, Upload, X, Check,
  ChevronDown, ChevronUp, Paperclip,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getAllShipments, createShipment, updateShipment,
  getBLRequests, createBLRequest, updateBLRequest,
  uploadShipmentDoc, uploadBLDoc,
  getAdminOthers, createAdminOther, updateAdminOther, deleteAdminOther, resolveImageUrl,
} from '../../services/api';
import { format } from 'date-fns';
import { toDateInputValue } from '../../utils/dates';

const SHIP_STATUSES = ['pending', 'departed', 'arrived', 'delivered'];
const BL_STATUSES   = ['pending', 'consigned', 'completed'];
const OTHER_CATS    = ['general', 'customs', 'inspection', 'insurance', 'legal', 'finance', 'other'];

const statusBadge = (s) => {
  const colors = {
    pending: 'badge-gray', departed: 'badge-blue', arrived: 'badge-green',
    delivered: 'badge-gold', consigned: 'badge-blue', completed: 'badge-green',
  };
  return <span className={colors[s] || 'badge-gray'}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Pending'}</span>;
};

const BLANK_SHIP = {
  file_code: '', bl_code: '', ship_name: '', shipping_company: '', voyage: '',
  port_of_loading: '', port_of_discharge: '', etd: '', eta: '', status: 'pending', notes: '',
};
const BLANK_BL = {
  purchase_id: '', file_code: '', chassis_number: '', shipping_company: '', ship_name: '',
  voyage: '', eto: '', eta: '', port_of_loading: '', port_of_discharge: '',
};
const BLANK_OTHER = { title: '', category: 'general', description: '' };

function AttachDoc({ label, currentPath, currentName, onUpload, uploading }) {
  const ref = useRef();
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {currentPath ? (
        <a href={currentPath} target="_blank" rel="noreferrer"
          className="flex items-center gap-1.5 text-xs hover:opacity-80 transition-opacity"
          style={{ color: '#60a5fa' }}>
          <FileText size={13} /> {currentName || 'View File'}
        </a>
      ) : (
        <span className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>No file attached</span>
      )}
      <button type="button" onClick={() => ref.current.click()}
        disabled={uploading}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        style={{ background: 'var(--ae-glass-bg)', color: 'var(--ae-ink-muted)', border: '1px solid var(--ae-glass-border)' }}>
        <Upload size={11} /> {uploading ? 'Uploading…' : currentPath ? 'Replace' : 'Attach File'}
      </button>
      <input ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
        onChange={e => e.target.files[0] && onUpload(e.target.files[0])} />
    </div>
  );
}

export default function AdminShipments() {
  const [tab, setTab]           = useState('vessels');
  const [shipments, setShipments] = useState([]);
  const [blRequests, setBLRequests] = useState([]);
  const [others, setOthers]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(BLANK_SHIP);
  const [blForm, setBLForm]     = useState(BLANK_BL);
  const [showBLForm, setShowBLForm] = useState(false);
  const [editingBL, setEditingBL]   = useState(null);
  const [otherForm, setOtherForm]   = useState(BLANK_OTHER);
  const [otherFile, setOtherFile]   = useState(null);
  const [showOtherForm, setShowOtherForm] = useState(false);
  const [editingOther, setEditingOther]   = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading]   = useState({});
  const [formFile,   setFormFile]   = useState(null);
  const [blFormFile, setBlFormFile] = useState(null);
  const shipFileRef = useRef();
  const blFileRef   = useRef();

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, bl, oth] = await Promise.all([getAllShipments(), getBLRequests(), getAdminOthers()]);
      setShipments(s.data);
      setBLRequests(bl.data);
      setOthers(oth.data);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  
  const openAdd  = () => { setEditing(null); setForm(BLANK_SHIP); setFormFile(null); setShowForm(true); };
  const openEdit = (s) => {
    setEditing(s.id);
    setForm({ ...BLANK_SHIP, ...s, etd: toDateInputValue(s.etd), eta: toDateInputValue(s.eta) });
    setFormFile(null);
    setShowForm(true);
  };
  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      let id = editing;
      if (editing) {
        await updateShipment(editing, form);
      } else {
        const { data } = await createShipment(form);
        id = data.id;
      }
      if (formFile && id) {
        const fd = new FormData(); fd.append('file', formFile);
        await uploadShipmentDoc(id, fd);
      }
      toast.success(editing ? 'Vessel updated' : 'Vessel created');
      setShowForm(false); setFormFile(null); loadAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };
  const handleShipUpload = async (id, file) => {
    setUploading(u => ({ ...u, [`ship-${id}`]: true }));
    try {
      const fd = new FormData(); fd.append('file', file);
      await uploadShipmentDoc(id, fd);
      toast.success('File replaced');
      loadAll();
    } catch { toast.error('Upload failed'); }
    finally { setUploading(u => ({ ...u, [`ship-${id}`]: false })); }
  };

  
  const openAddBL  = () => { setEditingBL(null); setBLForm(BLANK_BL); setBlFormFile(null); setShowBLForm(true); };
  const openEditBL = (b) => {
    setEditingBL(b.id);
    setBLForm({ ...BLANK_BL, ...b, eto: toDateInputValue(b.eto), eta: toDateInputValue(b.eta) });
    setBlFormFile(null);
    setShowBLForm(true);
  };
  const handleBLSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      let id = editingBL;
      if (editingBL) {
        await updateBLRequest(editingBL, blForm);
      } else {
        const { data } = await createBLRequest(blForm);
        id = data.id;
      }
      if (blFormFile && id) {
        const fd = new FormData(); fd.append('file', blFormFile);
        await uploadBLDoc(id, fd);
      }
      toast.success(editingBL ? 'BL updated' : 'BL request created');
      setShowBLForm(false); setBlFormFile(null); loadAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };
  const handleBLUpload = async (id, file) => {
    setUploading(u => ({ ...u, [`bl-${id}`]: true }));
    try {
      const fd = new FormData(); fd.append('file', file);
      await uploadBLDoc(id, fd);
      toast.success('File replaced');
      loadAll();
    } catch { toast.error('Upload failed'); }
    finally { setUploading(u => ({ ...u, [`bl-${id}`]: false })); }
  };

  
  const openAddOther  = () => { setEditingOther(null); setOtherForm(BLANK_OTHER); setOtherFile(null); setShowOtherForm(true); };
  const openEditOther = (o) => { setEditingOther(o.id); setOtherForm({ title: o.title, category: o.category, description: o.description || '' }); setOtherFile(null); setShowOtherForm(true); };
  const handleOtherSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('title', otherForm.title);
      fd.append('category', otherForm.category);
      fd.append('description', otherForm.description);
      if (otherFile) fd.append('file', otherFile);
      if (editingOther) await updateAdminOther(editingOther, fd);
      else await createAdminOther(fd);
      toast.success(editingOther ? 'Updated' : 'Record created');
      setShowOtherForm(false); loadAll();
    } catch { toast.error('Failed'); }
    finally { setSubmitting(false); }
  };
  const handleDeleteOther = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    try { await deleteAdminOther(id); toast.success('Deleted'); loadAll(); }
    catch { toast.error('Failed'); }
  };

  const f  = (k) => ({ value: form[k]   || '', onChange: e => setForm(p   => ({ ...p,   [k]: e.target.value })) });
  const bf = (k) => ({ value: blForm[k] || '', onChange: e => setBLForm(p => ({ ...p,   [k]: e.target.value })) });
  const of = (k) => ({ value: otherForm[k] || '', onChange: e => setOtherForm(p => ({ ...p, [k]: e.target.value })) });

  const L = ({ children }) => (
    <label className="block mb-1 text-xs font-medium" style={{ color: 'var(--ae-ink-faint)' }}>{children}</label>
  );

  return (
    <div data-theme="light" style={{ background: 'var(--ae-canvas)', minHeight: '100vh' }} className="px-4 py-10">
      <div className="max-w-7xl mx-auto">

        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--ae-ink)' }}>Shipments</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--ae-ink-muted)' }}>Manage vessels, BL requests, and admin records</p>
          </div>
          <button
            onClick={tab === 'vessels' ? openAdd : tab === 'bl' ? openAddBL : openAddOther}
            className="btn-gold flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {tab === 'vessels' ? 'Add Vessel' : tab === 'bl' ? 'New BL Request' : 'New Record'}
          </button>
        </div>

        <div className="flex gap-1 p-1 rounded-xl w-fit mb-6" style={{ background: 'var(--ae-glass-bg)' }}>
          {[['vessels', 'Vessels'], ['bl', 'BL Requests'], ['others', 'Others']].map(([val, label]) => (
            <button key={val} onClick={() => setTab(val)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all`}
              style={{ background: tab === val ? '#b7102a' : 'transparent', color: tab === val ? '#fff' : 'var(--ae-ink-muted)' }}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'vessels' && showForm && (
          <div className="card p-6 mb-6">
            <h2 className="font-semibold mb-4" style={{ color: 'var(--ae-ink)' }}>{editing ? 'Edit Vessel' : 'New Vessel'}</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div><L>File Code</L><input className="input-field" {...f('file_code')} /></div>
              <div><L>BL Code</L><input className="input-field" {...f('bl_code')} /></div>
              <div><L>Ship Name</L><input className="input-field" {...f('ship_name')} /></div>
              <div><L>Shipping Company</L><input className="input-field" {...f('shipping_company')} /></div>
              <div><L>Voyage</L><input className="input-field" {...f('voyage')} /></div>
              <div>
                <L>Status</L>
                <select className="select-field" {...f('status')}>
                  {SHIP_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div><L>Port of Loading</L><input className="input-field" {...f('port_of_loading')} /></div>
              <div><L>Port of Discharge</L><input className="input-field" {...f('port_of_discharge')} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><L>ETD</L><input type="datetime-local" className="input-field" {...f('etd')} /></div>
                <div><L>ETA</L><input type="datetime-local" className="input-field" {...f('eta')} /></div>
              </div>
              <div className="sm:col-span-2 lg:col-span-3"><L>Notes</L><textarea className="input-field" rows={2} {...f('notes')} /></div>

              <div className="sm:col-span-2 lg:col-span-3">
                <L>Attach Document (PDF, JPG, PNG)</L>
                <div className="flex items-center gap-3 flex-wrap mt-1">
                  {editing && form.document_path && !formFile && (
                    <a href={resolveImageUrl(form.document_path)} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg hover:opacity-80 transition-opacity"
                      style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)' }}>
                      <FileText size={12} /> {form.document_name || 'Current File'} — click to view
                    </a>
                  )}
                  <label className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ background: 'var(--ae-glass-bg)', color: formFile ? '#34d399' : 'var(--ae-ink-muted)', border: `1px solid ${formFile ? 'rgba(52,211,153,0.3)' : 'var(--ae-glass-border)'}` }}>
                    <Upload size={14} />
                    {formFile ? formFile.name : editing && form.document_path ? 'Replace file' : 'Choose file to attach'}
                    <input ref={shipFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                      onChange={e => setFormFile(e.target.files[0] || null)} />
                  </label>
                  {formFile && (
                    <button type="button" onClick={() => { setFormFile(null); if (shipFileRef.current) shipFileRef.current.value = ''; }}
                      className="text-xs hover:opacity-70 transition-opacity" style={{ color: '#f87171' }}>
                      <X size={12} className="inline mr-0.5" /> Remove
                    </button>
                  )}
                </div>
              </div>

              <div className="sm:col-span-2 lg:col-span-3 flex gap-3 justify-end">
                <button type="button" onClick={() => { setShowForm(false); setFormFile(null); }} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-gold">
                  {submitting ? 'Saving…' : formFile ? 'Save & Upload' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        )}

        {tab === 'bl' && showBLForm && (
          <div className="card p-6 mb-6">
            <h2 className="font-semibold mb-4" style={{ color: 'var(--ae-ink)' }}>{editingBL ? 'Edit BL Request' : 'New BL Request'}</h2>
            <form onSubmit={handleBLSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div><L>Purchase ID</L><input className="input-field" {...bf('purchase_id')} /></div>
              <div><L>File Code</L><input className="input-field" {...bf('file_code')} /></div>
              <div><L>Chassis Number</L><input className="input-field" {...bf('chassis_number')} /></div>
              <div><L>Shipping Company</L><input className="input-field" {...bf('shipping_company')} /></div>
              <div><L>Ship Name</L><input className="input-field" {...bf('ship_name')} /></div>
              <div><L>Voyage</L><input className="input-field" {...bf('voyage')} /></div>
              <div><L>Port of Loading</L><input className="input-field" {...bf('port_of_loading')} /></div>
              <div><L>Port of Discharge</L><input className="input-field" {...bf('port_of_discharge')} /></div>
              <div><L>ETO</L><input type="datetime-local" className="input-field" {...bf('eto')} /></div>
              <div><L>ETA</L><input type="datetime-local" className="input-field" {...bf('eta')} /></div>
              {editingBL && (
                <div>
                  <L>Status</L>
                  <select className="select-field" {...bf('status')}>
                    {BL_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
              )}

              <div className="sm:col-span-2 lg:col-span-3">
                <L>Attach Document (PDF, JPG, PNG)</L>
                <div className="flex items-center gap-3 flex-wrap mt-1">
                  {editingBL && blForm.document_path && !blFormFile && (
                    <a href={resolveImageUrl(blForm.document_path)} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg hover:opacity-80 transition-opacity"
                      style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)' }}>
                      <FileText size={12} /> {blForm.document_name || 'Current File'} — click to view
                    </a>
                  )}
                  <label className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ background: 'var(--ae-glass-bg)', color: blFormFile ? '#34d399' : 'var(--ae-ink-muted)', border: `1px solid ${blFormFile ? 'rgba(52,211,153,0.3)' : 'var(--ae-glass-border)'}` }}>
                    <Upload size={14} />
                    {blFormFile ? blFormFile.name : editingBL && blForm.document_path ? 'Replace file' : 'Choose file to attach'}
                    <input ref={blFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                      onChange={e => setBlFormFile(e.target.files[0] || null)} />
                  </label>
                  {blFormFile && (
                    <button type="button" onClick={() => { setBlFormFile(null); if (blFileRef.current) blFileRef.current.value = ''; }}
                      className="text-xs hover:opacity-70 transition-opacity" style={{ color: '#f87171' }}>
                      <X size={12} className="inline mr-0.5" /> Remove
                    </button>
                  )}
                </div>
              </div>

              <div className="sm:col-span-2 lg:col-span-3 flex gap-3 justify-end">
                <button type="button" onClick={() => { setShowBLForm(false); setBlFormFile(null); }} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-gold">
                  {submitting ? 'Saving…' : blFormFile ? 'Save & Upload' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        )}

        {tab === 'others' && showOtherForm && (
          <div className="card p-6 mb-6">
            <h2 className="font-semibold mb-4" style={{ color: 'var(--ae-ink)' }}>{editingOther ? 'Edit Record' : 'New Admin Record'}</h2>
            <form onSubmit={handleOtherSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <L>Title *</L>
                <input className="input-field" placeholder="Record title" required {...of('title')} />
              </div>
              <div>
                <L>Category</L>
                <select className="select-field" {...of('category')}>
                  {OTHER_CATS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <L>Description / Notes</L>
                <textarea className="input-field" rows={3} placeholder="Internal notes…" {...of('description')} />
              </div>
              <div className="sm:col-span-2">
                <L>Attach File (PDF, JPG, PNG)</L>
                <div className="flex items-center gap-3 flex-wrap mt-1">
                  <label className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ background: 'var(--ae-glass-bg)', color: 'var(--ae-ink-muted)', border: '1px solid var(--ae-glass-border)' }}>
                    <Paperclip size={14} />
                    {otherFile ? otherFile.name : 'Choose file'}
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                      onChange={e => setOtherFile(e.target.files[0] || null)} />
                  </label>
                  {otherFile && (
                    <button type="button" onClick={() => setOtherFile(null)} className="text-xs hover:opacity-70" style={{ color: '#f87171' }}>
                      <X size={12} className="inline" /> Remove
                    </button>
                  )}
                </div>
              </div>
              <div className="sm:col-span-2 flex gap-3 justify-end">
                <button type="button" onClick={() => setShowOtherForm(false)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-gold">{submitting ? 'Saving…' : 'Save Record'}</button>
              </div>
            </form>
          </div>
        )}

        {tab === 'vessels' && (
          loading ? <div className="text-center py-16" style={{ color: 'var(--ae-ink-muted)' }}>Loading…</div> : (
            <div className="space-y-3">
              {shipments.length === 0 && (
                <div className="card p-16 text-center" style={{ color: 'var(--ae-ink-faint)' }}>No vessels</div>
              )}
              {shipments.map(s => (
                <div key={s.id} className="card p-5">
                  <div className="flex items-start gap-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 min-w-0">
                      <div>
                        <p className="text-xs mb-0.5" style={{ color: 'var(--ae-ink-faint)' }}>Ship</p>
                        <p className="font-semibold text-sm" style={{ color: 'var(--ae-ink)' }}>{s.ship_name || '—'}</p>
                        <p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>{s.shipping_company || ''}</p>
                      </div>
                      <div>
                        <p className="text-xs mb-0.5" style={{ color: 'var(--ae-ink-faint)' }}>File / BL</p>
                        <p className="font-mono text-sm" style={{ color: 'var(--ae-red)' }}>{s.file_code || '—'}</p>
                        <p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>{s.bl_code || ''}</p>
                      </div>
                      <div>
                        <p className="text-xs mb-0.5" style={{ color: 'var(--ae-ink-faint)' }}>ETD → ETA</p>
                        <p className="text-sm" style={{ color: 'var(--ae-ink)' }}>
                          {s.etd ? format(new Date(s.etd), 'dd MMM yy') : '—'} → {s.eta ? format(new Date(s.eta), 'dd MMM yy') : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs mb-0.5" style={{ color: 'var(--ae-ink-faint)' }}>Route</p>
                        <p className="text-sm" style={{ color: 'var(--ae-ink-muted)' }}>
                          {s.port_of_loading || '—'} → {s.port_of_discharge || '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {statusBadge(s.status)}
                      <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:opacity-70 transition-opacity" style={{ color: 'var(--ae-ink-faint)' }}>
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--ae-glass-border)' }}>
                    <AttachDoc
                      currentPath={s.document_path}
                      currentName={s.document_name}
                      uploading={uploading[`ship-${s.id}`]}
                      onUpload={(file) => handleShipUpload(s.id, file)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'bl' && (
          loading ? <div className="text-center py-16" style={{ color: 'var(--ae-ink-muted)' }}>Loading…</div> : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase" style={{ borderColor: 'var(--ae-glass-border)', color: 'var(--ae-ink-faint)' }}>
                    <th className="px-4 py-3 text-left">Client</th>
                    <th className="px-4 py-3 text-left">File Code</th>
                    <th className="px-4 py-3 text-left">Chassis</th>
                    <th className="px-4 py-3 text-left">Ship</th>
                    <th className="px-4 py-3 text-left">ETO → ETA</th>
                    <th className="px-4 py-3 text-left">Attachment</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-center">Edit</th>
                  </tr>
                </thead>
                <tbody>
                  {blRequests.map(b => (
                    <tr key={b.id} className="border-b hover:bg-black/[0.02] transition-colors" style={{ borderColor: 'var(--ae-glass-border)' }}>
                      <td className="px-4 py-3">
                        <p style={{ color: 'var(--ae-ink)' }}>{b.user_name}</p>
                        <p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>{b.user_country}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--ae-red)' }}>{b.file_code || '—'}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--ae-ink-muted)' }}>{b.chassis_number || '—'}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--ae-ink-muted)' }}>{b.ship_name || '—'}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--ae-ink-muted)' }}>
                        {b.eto ? format(new Date(b.eto), 'dd MMM yy') : '—'} → {b.eta ? format(new Date(b.eta), 'dd MMM yy') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <AttachDoc
                          currentPath={b.document_path}
                          currentName={b.document_name}
                          uploading={uploading[`bl-${b.id}`]}
                          onUpload={(file) => handleBLUpload(b.id, file)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className={{ pending: 'badge-orange', consigned: 'badge-blue', completed: 'badge-green' }[b.status] || 'badge-gray'}>
                          {b.status || 'pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => openEditBL(b)} className="hover:opacity-70 transition-opacity" style={{ color: 'var(--ae-ink-faint)' }}>
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!blRequests.length && (
                    <tr><td colSpan={8} className="text-center py-12" style={{ color: 'var(--ae-ink-faint)' }}>No BL requests</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )
        )}

        {tab === 'others' && (
          loading ? <div className="text-center py-16" style={{ color: 'var(--ae-ink-muted)' }}>Loading…</div> : (
            <div className="space-y-3">
              {others.length === 0 && (
                <div className="card p-16 text-center" style={{ color: 'var(--ae-ink-faint)' }}>No records yet. Add internal documents, notes, or files here.</div>
              )}
              {others.map(o => (
                <div key={o.id} className="card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm" style={{ color: 'var(--ae-ink)' }}>{o.title}</p>
                        <span className="badge-gray text-xs capitalize">{o.category}</span>
                      </div>
                      {o.description && (
                        <p className="text-xs mt-1" style={{ color: 'var(--ae-ink-muted)' }}>{o.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>
                          {format(new Date(o.created_at), 'dd MMM yyyy, h:mm a')}
                        </p>
                        {o.file_path && (
                          <a href={resolveImageUrl(o.file_path)} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1 text-xs hover:opacity-80 transition-opacity"
                            style={{ color: '#60a5fa' }}>
                            <FileText size={11} /> {o.file_name || 'View File'}
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => openEditOther(o)} className="p-1.5 rounded-lg hover:opacity-70 transition-opacity" style={{ color: 'var(--ae-ink-faint)' }}>
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDeleteOther(o.id)} className="p-1.5 rounded-lg hover:opacity-70 transition-opacity" style={{ color: '#f87171' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

      </div>
    </div>
  );
}
