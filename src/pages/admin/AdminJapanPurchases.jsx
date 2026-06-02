import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Car, Search, X, Save, ChevronLeft, ChevronRight,
  FileText, Upload, Trash2, ExternalLink, Download, Plus, Ship, Paperclip, ImagePlus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getAllJapanPurchases, updateJapanPurchase, deleteJapanPurchase,
  uploadJapanDocument, deleteJapanDocument, getJapanPurchase,
  getAdminUsers, createManualJapanPurchase, uploadJapanCarImages,
  getBLRequests, createBLRequest, updateBLRequest, uploadBLDoc,
  getShipmentByFileCode, createShipment, updateShipment, uploadShipmentDoc,
  getAdminOthers, createAdminOther, updateAdminOther, deleteAdminOther,
  resolveImageUrl,
} from '../../services/api';
import { format } from 'date-fns';
import { toDateInputValue } from '../../utils/dates';

const FIELDS = [
  { key: 'pro_invoice_no',      label: 'Pro-Invoice No.',       type: 'text',   col: 2 },
  { key: 'file_code',           label: 'File Code No',          type: 'text',   col: 2 },
  { key: 'destination',         label: 'Destination',           type: 'text',   col: 2 },
  { key: 'bid_price',           label: 'Bid Price (¥)',         type: 'number', col: 1 },
  { key: 'auction_fee',         label: 'Auction (¥)',           type: 'number', col: 1 },
  { key: 'auction_commission',  label: 'Auction Commission (¥)',type: 'number', col: 1 },
  { key: 'transportation',      label: 'Transportation (¥)',    type: 'number', col: 1 },
  { key: 'loading_custom',      label: 'Loading/Custom (¥)',    type: 'number', col: 1 },
  { key: 'commission',          label: 'Commission (¥)',        type: 'number', col: 1 },
  { key: 'tax_10pct',           label: 'Tax 10% (¥)',           type: 'number', col: 1, computed: true },
  { key: 'radiation_photos',    label: 'Radiation & Photos (¥)',type: 'number', col: 1 },
  { key: 'custom_fee',          label: 'Custom (¥)',            type: 'number', col: 1 },
  { key: 'freight',             label: 'Freight (¥)',           type: 'number', col: 1 },
  { key: 'recycle',             label: 'Recycle (¥)',           type: 'number', col: 1 },
  { key: 'total',               label: 'TOTAL (¥)',             type: 'number', col: 1, bold: true, computed: true },
  { key: 'shipping_company',    label: 'Shipping Company',      type: 'text',   col: 2 },
  { key: 'ship_name',           label: 'Ship Name',             type: 'text',   col: 2 },
  { key: 'etd',                 label: 'ETD',                   type: 'date',   col: 1 },
  { key: 'eta',                 label: 'ETA',                   type: 'date',   col: 1 },
  { key: 'route',               label: 'Route',                 type: 'text',   col: 2 },
  { key: 'result_of_inspection',label: 'Result of Inspection',  type: 'text',   col: 2 },
  { key: 'bl_status',           label: 'BL Status',             type: 'text',   col: 2 },
  { key: 'remarks',             label: 'Remarks',               type: 'textarea', col: 4 },
];

function computeTaxAndTotal(f) {
  const n = (k) => Number(f[k]) || 0;
  const taxBase = n('bid_price') + n('auction_fee') + n('transportation') +
                  n('loading_custom') + n('auction_commission') + n('commission');
  const tax   = Math.round(taxBase * 0.10);
  const total = taxBase + tax + n('recycle');
  return { tax_10pct: tax, total };
}

function useAutoCalc(form, setForm) {
  useEffect(() => {
    const { tax_10pct, total } = computeTaxAndTotal(form);
    setForm(p => {
      if (Number(p.tax_10pct) === tax_10pct && Number(p.total) === total) return p;
      return { ...p, tax_10pct, total };
    });
  }, [form.bid_price, form.auction_fee, form.transportation,
      form.loading_custom, form.auction_commission, form.commission, form.recycle]);
}

const fmt  = (n) => (n != null && n !== 0) ? `¥${Number(n).toLocaleString()}` : '—';
const date = (d) => d ? format(new Date(d), 'dd MMM yyyy') : '—';

const CAR_FIELDS = [
  { key: 'make',          label: 'Make',           type: 'text' },
  { key: 'model',         label: 'Model',          type: 'text' },
  { key: 'year',          label: 'Year',           type: 'number' },
  { key: 'chassis',       label: 'Chassis No.',    type: 'text' },
  { key: 'lot_number',    label: 'Lot Number',     type: 'text' },
  { key: 'auction_house', label: 'Auction Name',   type: 'text' },
  { key: 'auction_date',  label: 'Auction Date',   type: 'date' },
];

const BLANK_CREATE = {
  user_id: '',
  make: '', model: '', year: '', chassis: '', lot_number: '', auction_house: '', auction_date: '', image_url: '',
  pro_invoice_no: '', file_code: '', destination: '',
  bid_price: '', auction_fee: '', auction_commission: '', transportation: '', loading_custom: '',
  commission: '', tax_10pct: '', radiation_photos: '', custom_fee: '', freight: '', recycle: '', total: '',
  shipping_company: '', ship_name: '', etd: '', eta: '', route: '', result_of_inspection: '', bl_status: '', remarks: '',
};

function CreateDrawer({ users, onClose, onCreated }) {
  const [form,       setForm]       = useState(BLANK_CREATE);
  const [saving,     setSaving]     = useState(false);
  const [imgPreviews, setImgPreviews] = useState([]);
  const [imgUploading, setImgUploading] = useState(false);
  const imgInputRef = useRef();
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  useAutoCalc(form, setForm);

  const handleImageFiles = async (files) => {
    if (!files?.length) return;
    setImgUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach(f => fd.append('images', f));
      const { data } = await uploadJapanCarImages(fd);
      const newUrls = data.urls;
      const existingUrls = form.image_url ? form.image_url.split(',').filter(Boolean) : [];
      const combined = [...existingUrls, ...newUrls].join(',');
      set('image_url', combined);
      const previews = newUrls.map(url => ({ url, local: false }));
      setImgPreviews(prev => [...prev, ...previews]);
    } catch (err) { toast.error('Image upload failed'); }
    finally { setImgUploading(false); }
  };

  const removeImage = (index) => {
    const urls = form.image_url ? form.image_url.split(',').filter(Boolean) : [];
    urls.splice(index, 1);
    set('image_url', urls.join(','));
    setImgPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (!form.user_id) { toast.error('Please select a client'); return; }
    setSaving(true);
    try {
      await createManualJapanPurchase(form);
      toast.success('Purchase added successfully');
      onCreated();
      onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create purchase'); }
    finally { setSaving(false); }
  };

  const L = ({ children, bold }) => (
    <label className={`block mb-1 text-xs font-medium ${bold ? 'font-bold' : ''}`}
      style={{ color: bold ? 'var(--ae-ink)' : 'var(--ae-ink-faint)' }}>{children}</label>
  );

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-2xl overflow-y-auto flex flex-col" style={{ background: 'var(--ae-surface)', borderLeft: '1px solid var(--ae-glass-border)' }}>

        <div className="flex items-start justify-between px-6 py-5 border-b sticky top-0 z-10"
          style={{ background: 'var(--ae-surface)', borderColor: 'var(--ae-glass-border)' }}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'var(--ae-red)' }}>Manual Entry</p>
            <h2 className="font-bold text-lg" style={{ color: 'var(--ae-ink)' }}>Add Past Purchase</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ae-ink-faint)' }}>Create a purchase record without requiring a bid</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:opacity-70 mt-1" style={{ color: 'var(--ae-ink-faint)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-8 flex-1">

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--ae-ink-faint)' }}>Client</h3>
            <select className="select-field w-full" value={form.user_id} onChange={e => set('user_id', e.target.value)}>
              <option value="">— Select Client —</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
            </select>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--ae-ink-faint)' }}>Car Information</h3>
            <div className="grid grid-cols-2 gap-3">
              {CAR_FIELDS.map(({ key, label, type }) => (
                <div key={key}>
                  <L>{label}</L>
                  <input type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
                    className="input-field text-sm" value={form[key] || ''}
                    onChange={e => set(key, e.target.value)} />
                </div>
              ))}
            </div>

            <div className="mt-4">
              <L>Car Images</L>
              <input ref={imgInputRef} type="file" accept="image/*" multiple className="hidden"
                onChange={e => handleImageFiles(e.target.files)} />
              {imgPreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {imgPreviews.map((img, i) => (
                    <div key={i} className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '4/3' }}>
                      <img src={resolveImageUrl(img.url)} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 hover:bg-red-500 transition-colors"
                        style={{ color: '#fff' }}>
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button type="button" disabled={imgUploading}
                onClick={() => imgInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border-2 border-dashed w-full justify-center hover:opacity-80 transition-opacity disabled:opacity-50"
                style={{ borderColor: 'var(--ae-glass-border)', color: 'var(--ae-ink-faint)' }}>
                <ImagePlus size={16} />
                {imgUploading ? 'Uploading…' : imgPreviews.length > 0 ? 'Add More Images' : 'Upload Images'}
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--ae-ink-faint)' }}>Financial & Shipping Details</h3>
            <div className="grid grid-cols-4 gap-3">
              {FIELDS.map(({ key, label, type, col, bold, computed }) => (
                <div key={key} className={`col-span-${col}`}>
                  <L bold={bold}>{label}{computed && <span className="ml-1 text-xs opacity-50">(auto)</span>}</L>
                  {type === 'textarea' ? (
                    <textarea rows={3} className="input-field text-sm resize-none"
                      value={form[key] || ''}
                      onChange={e => set(key, e.target.value)} />
                  ) : (
                    <input type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
                      readOnly={computed}
                      className={`input-field text-sm ${bold ? 'font-bold' : ''}`}
                      style={computed ? { background: 'rgba(52,211,153,0.07)', color: '#34d399', cursor: 'default' } : {}}
                      value={form[key] ?? ''}
                      onChange={computed ? undefined : e => set(key, e.target.value)} />
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

        <div className="px-6 py-4 border-t flex gap-3 justify-end sticky bottom-0"
          style={{ background: 'var(--ae-surface)', borderColor: 'var(--ae-glass-border)' }}>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={handleCreate} disabled={saving} className="btn-gold gap-2 disabled:opacity-50">
            <Plus size={14} /> {saving ? 'Creating…' : 'Create Purchase'}
          </button>
        </div>
      </div>
    </div>
  );
}

const OTHER_CATS = ['general','customs','inspection','insurance','legal','finance','other'];
const BL_STATUSES_SHIP = ['pending','consigned','completed'];
const SHIP_STATUSES = ['pending','departed','arrived','delivered'];

function FileUploadBtn({ currentPath, currentName, onUpload, uploading }) {
  const ref = useRef();
  return (
    <div className="flex items-center gap-2 flex-wrap mt-1">
      {currentPath && (
        <a href={currentPath} target="_blank" rel="noreferrer"
          className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg hover:opacity-80"
          style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)' }}>
          <FileText size={11} /> {currentName || 'View File'}
        </a>
      )}
      <button type="button" onClick={() => ref.current?.click()} disabled={uploading}
        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
        style={{ background: 'var(--ae-glass-bg)', color: 'var(--ae-ink-muted)', border: '1px solid var(--ae-glass-border)' }}>
        <Upload size={11} /> {uploading ? 'Uploading…' : currentPath ? 'Replace' : 'Attach File'}
      </button>
      <input ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
        onChange={e => e.target.files[0] && onUpload(e.target.files[0])} />
    </div>
  );
}

function ShipmentTab({ purchase }) {
  const L = ({ children }) => (
    <label className="block mb-1 text-xs font-medium" style={{ color: 'var(--ae-ink-faint)' }}>{children}</label>
  );

  
  const [bl,        setBl]        = useState(null);
  const [blForm,    setBlForm]    = useState({});
  const [blSaving,  setBlSaving]  = useState(false);
  const [blUploading, setBlUploading] = useState(false);

  
  const [vessel,       setVessel]       = useState(null);
  const [vesselForm,   setVesselForm]   = useState({});
  const [vesselSaving, setVesselSaving] = useState(false);
  const [vesselUploading, setVesselUploading] = useState(false);

  
  const [others,       setOthers]      = useState([]);
  const [otherForm,    setOtherForm]   = useState({ title: '', category: 'general', description: '' });
  const [otherFile,    setOtherFile]   = useState(null);
  const [otherSaving,  setOtherSaving] = useState(false);
  const [showOtherForm, setShowOtherForm] = useState(false);

  const genFileCode = () => `FC-${purchase.id}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
  const genBLCode   = () => `BLC-${purchase.id}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;

  const loadBL = useCallback(async () => {
    try {
      const { data } = await getBLRequests({ purchase_id: purchase.id });
      const rec = Array.isArray(data) ? data[0] : null;
      setBl(rec || null);
      const autoFC = purchase.file_code || genFileCode();
      setBlForm(rec ? {
        file_code: rec.file_code || autoFC, chassis_number: rec.chassis_number || '',
        shipping_company: rec.shipping_company || '', ship_name: rec.ship_name || '',
        eto: toDateInputValue(rec.eto),
        eta: toDateInputValue(rec.eta),
        port_of_loading: rec.port_of_loading || '', port_of_discharge: rec.port_of_discharge || '',
        status: rec.status || 'pending',
      } : {
        file_code: autoFC, chassis_number: purchase.chassis || '',
        shipping_company: purchase.shipping_company || '', ship_name: purchase.ship_name || '',
        eto: '', eta: toDateInputValue(purchase.eta),
        port_of_loading: '', port_of_discharge: purchase.destination || '',
        status: 'pending',
      });
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchase]);

  const loadVessel = useCallback(async () => {
    try {
      const fc = purchase.file_code || null;
      const data = fc ? (await getShipmentByFileCode(fc)).data : null;
      setVessel(data || null);
      const autoFC = fc || genFileCode();
      const autoBC = genBLCode();
      setVesselForm(data ? {
        file_code: data.file_code || autoFC, bl_code: data.bl_code || autoBC,
        ship_name: data.ship_name || '', shipping_company: data.shipping_company || '',
        port_of_loading: data.port_of_loading || '',
        port_of_discharge: data.port_of_discharge || '',
        etd: toDateInputValue(data.etd), eta: toDateInputValue(data.eta),
        status: data.status || 'pending', notes: data.notes || '',
      } : {
        file_code: autoFC, bl_code: autoBC, ship_name: purchase.ship_name || '',
        shipping_company: purchase.shipping_company || '',
        port_of_loading: '', port_of_discharge: purchase.destination || '',
        etd: toDateInputValue(purchase.etd),
        eta: toDateInputValue(purchase.eta),
        status: 'pending', notes: '',
      });
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchase]);

  const loadOthers = useCallback(async () => {
    try { const { data } = await getAdminOthers(); setOthers(data || []); } catch {}
  }, []);

  useEffect(() => { loadBL(); loadVessel(); loadOthers(); }, [loadBL, loadVessel, loadOthers]);

  
  const handleBLSave = async () => {
    setBlSaving(true);
    try {
      if (bl) {
        await updateBLRequest(bl.id, blForm);
      } else {
        const { data } = await createBLRequest({ ...blForm, purchase_id: purchase.id });
        setBl(data);
      }
      toast.success('BL Request saved');
      loadBL();
    } catch { toast.error('Failed to save BL Request'); }
    finally { setBlSaving(false); }
  };

  
  const handleBLUpload = async (file) => {
    setBlUploading(true);
    try {
      let blId = bl?.id;
      if (!blId) {
        const { data } = await createBLRequest({ ...blForm, purchase_id: purchase.id });
        setBl(data);
        blId = data.id;
      }
      const fd = new FormData(); fd.append('file', file);
      await uploadBLDoc(blId, fd);
      toast.success('File attached');
      loadBL();
    } catch { toast.error('Upload failed'); }
    finally { setBlUploading(false); }
  };

  
  const handleVesselSave = async () => {
    setVesselSaving(true);
    try {
      if (vessel) {
        await updateShipment(vessel.id, vesselForm);
      } else {
        const { data } = await createShipment(vesselForm);
        setVessel(data);
      }
      toast.success('Vessel saved');
      loadVessel();
    } catch { toast.error('Failed to save Vessel'); }
    finally { setVesselSaving(false); }
  };

  
  const handleVesselUpload = async (file) => {
    setVesselUploading(true);
    try {
      let vesselId = vessel?.id;
      if (!vesselId) {
        const { data } = await createShipment(vesselForm);
        setVessel(data);
        vesselId = data.id;
      }
      const fd = new FormData(); fd.append('file', file);
      await uploadShipmentDoc(vesselId, fd);
      toast.success('File attached');
      loadVessel();
    } catch { toast.error('Upload failed'); }
    finally { setVesselUploading(false); }
  };

  
  const handleOtherSave = async () => {
    if (!otherForm.title) { toast.error('Title is required'); return; }
    setOtherSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', otherForm.title);
      fd.append('category', otherForm.category);
      fd.append('description', otherForm.description);
      if (otherFile) fd.append('file', otherFile);
      await createAdminOther(fd);
      toast.success('Record added');
      setOtherForm({ title: '', category: 'general', description: '' });
      setOtherFile(null);
      setShowOtherForm(false);
      loadOthers();
    } catch { toast.error('Failed'); }
    finally { setOtherSaving(false); }
  };

  const handleDeleteOther = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    try { await deleteAdminOther(id); loadOthers(); toast.success('Deleted'); }
    catch { toast.error('Failed'); }
  };

  const bf = (k) => ({ value: blForm[k] || '', onChange: e => setBlForm(p => ({ ...p, [k]: e.target.value })) });
  const vf = (k) => ({ value: vesselForm[k] || '', onChange: e => setVesselForm(p => ({ ...p, [k]: e.target.value })) });

  return (
    <div className="space-y-8">

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Ship size={14} style={{ color: 'var(--ae-ink-faint)' }} />
          <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--ae-ink-faint)' }}>BL Request</h3>
          {bl && <span className="badge-blue text-xs ml-auto">{bl.status}</span>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><L>File Code</L><input className="input-field text-sm" {...bf('file_code')} /></div>
          <div><L>Chassis No.</L><input className="input-field text-sm" {...bf('chassis_number')} /></div>
          <div><L>Shipping Company</L><input className="input-field text-sm" {...bf('shipping_company')} /></div>
          <div><L>Ship Name</L><input className="input-field text-sm" {...bf('ship_name')} /></div>
          <div>
            <L>BL Status</L>
            <select className="select-field text-sm" {...bf('status')}>
              {BL_STATUSES_SHIP.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </select>
          </div>
          <div><L>Port of Loading</L><input className="input-field text-sm" {...bf('port_of_loading')} /></div>
          <div><L>Port of Discharge</L><input className="input-field text-sm" {...bf('port_of_discharge')} /></div>
          <div><L>ETO</L><input type="date" className="input-field text-sm" {...bf('eto')} /></div>
          <div><L>ETA</L><input type="date" className="input-field text-sm" {...bf('eta')} /></div>
        </div>
        <div className="mt-3">
          <L>Attach BL Document</L>
          <FileUploadBtn
            currentPath={bl?.document_path} currentName={bl?.document_name}
            onUpload={handleBLUpload} uploading={blUploading} />
        </div>
        <div className="flex justify-end mt-3">
          <button onClick={handleBLSave} disabled={blSaving} className="btn-gold gap-1.5 text-sm disabled:opacity-50">
            <Save size={13} /> {blSaving ? 'Saving…' : bl ? 'Update BL' : 'Create BL Request'}
          </button>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--ae-glass-border)', paddingTop: '2rem' }}>
        <div className="flex items-center gap-2 mb-4">
          <Ship size={14} style={{ color: 'var(--ae-ink-faint)' }} />
          <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--ae-ink-faint)' }}>Vessel</h3>
          {vessel && <span className="badge-gray text-xs ml-auto">{vessel.status}</span>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><L>File Code</L><input className="input-field text-sm" {...vf('file_code')} /></div>
          <div><L>BL Code</L><input className="input-field text-sm" {...vf('bl_code')} /></div>
          <div>
            <L>Status</L>
            <select className="select-field text-sm" {...vf('status')}>
              {SHIP_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </select>
          </div>
          <div><L>ETD</L><input type="date" className="input-field text-sm" {...vf('etd')} /></div>
          <div className="col-span-2"><L>Notes</L><textarea rows={2} className="input-field text-sm resize-none" {...vf('notes')} /></div>
        </div>
        <div className="mt-3">
          <L>Attach Vessel Document</L>
          <FileUploadBtn
            currentPath={vessel?.document_path} currentName={vessel?.document_name}
            onUpload={handleVesselUpload} uploading={vesselUploading} />
        </div>
        <div className="flex justify-end mt-3">
          <button onClick={handleVesselSave} disabled={vesselSaving} className="btn-gold gap-1.5 text-sm disabled:opacity-50">
            <Save size={13} /> {vesselSaving ? 'Saving…' : vessel ? 'Update Vessel' : 'Create Vessel'}
          </button>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--ae-glass-border)', paddingTop: '2rem' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Paperclip size={14} style={{ color: 'var(--ae-ink-faint)' }} />
            <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--ae-ink-faint)' }}>Others / Internal Records</h3>
          </div>
          <button onClick={() => setShowOtherForm(o => !o)}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg"
            style={{ background: 'var(--ae-glass-bg)', color: 'var(--ae-ink-muted)', border: '1px solid var(--ae-glass-border)' }}>
            <Plus size={11} /> Add
          </button>
        </div>

        {showOtherForm && (
          <div className="card p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><L>Title *</L><input className="input-field text-sm" placeholder="Record title" value={otherForm.title} onChange={e => setOtherForm(p => ({ ...p, title: e.target.value }))} /></div>
              <div>
                <L>Category</L>
                <select className="select-field text-sm" value={otherForm.category} onChange={e => setOtherForm(p => ({ ...p, category: e.target.value }))}>
                  {OTHER_CATS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                </select>
              </div>
              <div><L>Attach File</L>
                <label className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg cursor-pointer mt-1"
                  style={{ background: 'var(--ae-glass-bg)', color: otherFile ? '#34d399' : 'var(--ae-ink-muted)', border: '1px solid var(--ae-glass-border)' }}>
                  <Paperclip size={11} /> {otherFile ? otherFile.name : 'Choose file'}
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => setOtherFile(e.target.files[0] || null)} />
                </label>
              </div>
              <div className="col-span-2"><L>Notes</L><textarea rows={2} className="input-field text-sm resize-none" value={otherForm.description} onChange={e => setOtherForm(p => ({ ...p, description: e.target.value }))} /></div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowOtherForm(false)} className="btn-ghost text-xs">Cancel</button>
              <button onClick={handleOtherSave} disabled={otherSaving} className="btn-gold text-xs gap-1 disabled:opacity-50">
                <Save size={11} /> {otherSaving ? 'Saving…' : 'Save Record'}
              </button>
            </div>
          </div>
        )}

        {others.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>No admin records yet</p>
        ) : (
          <div className="space-y-2">
            {others.map(o => (
              <div key={o.id} className="flex items-start justify-between gap-3 p-3 rounded-xl" style={{ border: '1px solid var(--ae-glass-border)' }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--ae-ink)' }}>{o.title}</p>
                    <span className="badge-gray text-xs capitalize">{o.category}</span>
                  </div>
                  {o.description && <p className="text-xs mt-0.5" style={{ color: 'var(--ae-ink-faint)' }}>{o.description}</p>}
                  {o.file_path && (
                    <a href={o.file_path} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 text-xs mt-1 hover:opacity-80"
                      style={{ color: '#60a5fa' }}>
                      <FileText size={11} /> {o.file_name || 'View File'}
                    </a>
                  )}
                </div>
                <button onClick={() => handleDeleteOther(o.id)} className="p-1 rounded hover:opacity-70 shrink-0" style={{ color: '#f87171' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EditDrawer({ purchaseId, onClose, onSaved, onDeleteRequest }) {
  const [purchase, setPurchase] = useState(null);
  const [form,     setForm]     = useState({});
  const [docs,     setDocs]     = useState([]);
  const [saving,   setSaving]   = useState(false);
  const [uploading,setUploading]= useState(false);
  const [imgUploading, setImgUploading] = useState(false);
  const [drawerTab, setDrawerTab] = useState('details');
  const fileRef = useRef();
  const imgInputRef = useRef();
  useAutoCalc(form, setForm);

  const load = useCallback(async () => {
    try {
      const { data } = await getJapanPurchase(purchaseId);
      setPurchase(data);
      setDocs(data.documents || []);
      const init = {};
      FIELDS.forEach(({ key, type }) => {
        const raw = data[key];
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
    } catch { toast.error('Failed to load purchase'); }
  }, [purchaseId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateJapanPurchase(purchaseId, { ...purchase, ...form });
      toast.success('Purchase updated');
      onSaved();
      load();
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const handleUpload = async (file) => {
    const fd = new FormData();
    fd.append('document', file);
    fd.append('name', file.name);
    fd.append('type', 'general');
    setUploading(true);
    try {
      await uploadJapanDocument(purchaseId, fd);
      toast.success('Document uploaded');
      load();
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); }
  };

  const handleDeleteDoc = async (docId) => {
    try {
      await deleteJapanDocument(purchaseId, docId);
      toast.success('Removed');
      load();
    } catch { toast.error('Failed'); }
  };

  const handleImageUpload = async (files) => {
    if (!files?.length) return;
    setImgUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach(f => fd.append('images', f));
      const { data } = await uploadJapanCarImages(fd);
      const existing = purchase.image_url ? purchase.image_url.split(',').filter(Boolean) : [];
      const combined = [...existing, ...data.urls].join(',');
      await updateJapanPurchase(purchaseId, { ...purchase, ...form, image_url: combined });
      toast.success('Images uploaded');
      load();
    } catch { toast.error('Image upload failed'); }
    finally { setImgUploading(false); }
  };

  if (!purchase) {
    return (
      <div className="fixed inset-0 z-50 flex">
        <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="w-full max-w-2xl flex items-center justify-center" style={{ background: 'var(--ae-surface)' }}>
          <p style={{ color: 'var(--ae-ink-muted)' }}>Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-2xl overflow-y-auto flex flex-col" style={{ background: 'var(--ae-surface)', borderLeft: '1px solid var(--ae-glass-border)' }}>

        <div className="sticky top-0 z-10" style={{ background: 'var(--ae-surface)', borderBottom: '1px solid var(--ae-glass-border)' }}>
          <div className="flex items-start justify-between px-6 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'var(--ae-red)' }}>Purchase Detail</p>
              <h2 className="font-bold text-lg" style={{ color: 'var(--ae-ink)' }}>
                {purchase.year} {purchase.make} {purchase.model}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--ae-ink-faint)' }}>
                Chassis: {purchase.chassis || '—'} · Lot: {purchase.lot_number || '—'} · {purchase.user_name}
              </p>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={() => onDeleteRequest?.(purchase)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                title="Delete this purchase"
              >
                <Trash2 size={13} /> Delete
              </button>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: 'var(--ae-ink-faint)' }}>
                <X size={18} />
              </button>
            </div>
          </div>
          <div className="flex gap-1 px-6 pb-3">
            {[['details','Details'], ['shipment','Shipment'], ['documents','Documents']].map(([v, l]) => (
              <button key={v} onClick={() => setDrawerTab(v)}
                className="px-4 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{
                  background: drawerTab === v ? 'var(--ae-red)' : 'var(--ae-glass-bg)',
                  color: drawerTab === v ? '#fff' : 'var(--ae-ink-muted)',
                }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 flex-1">

          {drawerTab === 'details' && (
            <div className="space-y-6">
              {(() => {
                const imgs = purchase.image_url ? purchase.image_url.split(',').filter(Boolean) : [];
                const removeImg = async (idx) => {
                  const updated = imgs.filter((_, i) => i !== idx).join(',');
                  await updateJapanPurchase(purchaseId, { ...purchase, ...form, image_url: updated });
                  load();
                };
                return (
                  <div>
                    {imgs.length > 0 && (
                      <div className={`grid gap-2 mb-3 ${imgs.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        {imgs.map((url, i) => (
                          <div key={i} className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '4/3' }}>
                            <img src={resolveImageUrl(url.trim())} alt=""
                              className="w-full h-full object-cover"
                              onError={e => e.target.parentElement.style.display = 'none'} />
                            <button onClick={() => removeImg(i)}
                              className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 hover:bg-red-500 transition-colors"
                              style={{ color: '#fff' }}>
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <input ref={imgInputRef} type="file" accept="image/*" multiple className="hidden"
                      onChange={e => handleImageUpload(e.target.files)} />
                    <button type="button" disabled={imgUploading}
                      onClick={() => imgInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border-2 border-dashed w-full justify-center hover:opacity-80 transition-opacity disabled:opacity-50"
                      style={{ borderColor: 'var(--ae-glass-border)', color: 'var(--ae-ink-faint)' }}>
                      <ImagePlus size={16} />
                      {imgUploading ? 'Uploading…' : imgs.length > 0 ? 'Add More Images' : 'Upload Images'}
                    </button>
                  </div>
                );
              })()}
              <div className="grid grid-cols-4 gap-3">
                {FIELDS.map(({ key, label, type, col, bold, computed }) => (
                  <div key={key} className={`col-span-${col}`}>
                    <label className={`block mb-1 text-xs font-medium`}
                      style={{ color: bold ? 'var(--ae-ink)' : 'var(--ae-ink-faint)' }}>
                      {label}{computed && <span className="ml-1 text-xs opacity-50">(auto)</span>}
                    </label>
                    {type === 'textarea' ? (
                      <textarea rows={3} className="input-field text-sm resize-none"
                        value={form[key] || ''} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
                    ) : (
                      <input type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
                        readOnly={computed}
                        className={`input-field text-sm ${bold ? 'font-bold' : ''}`}
                        style={computed ? { background: 'rgba(52,211,153,0.07)', color: '#34d399', cursor: 'default' } : {}}
                        value={form[key] ?? ''} onChange={computed ? undefined : e => setForm(p => ({ ...p, [key]: e.target.value }))} />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <button onClick={handleSave} disabled={saving} className="btn-gold gap-2 disabled:opacity-50">
                  <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {drawerTab === 'shipment' && <ShipmentTab purchase={purchase} />}

          {drawerTab === 'documents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--ae-ink-faint)' }}>Documents</h3>
                <button onClick={() => fileRef.current.click()} disabled={uploading}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
                  style={{ background: 'var(--ae-glass-bg)', color: 'var(--ae-ink-muted)', border: '1px solid var(--ae-glass-border)' }}>
                  <Upload size={11} /> {uploading ? 'Uploading…' : 'Upload Document'}
                </button>
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                  onChange={e => e.target.files[0] && handleUpload(e.target.files[0])} />
              </div>
              {docs.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--ae-ink-faint)' }}>No documents yet</p>
              ) : (
                <div className="space-y-2">
                  {docs.map(doc => (
                    <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ border: '1px solid var(--ae-glass-border)' }}>
                      <FileText size={14} style={{ color: 'var(--ae-ink-faint)' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate" style={{ color: 'var(--ae-ink)' }}>{doc.name}</p>
                        <p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>{doc.type} · {date(doc.uploaded_at)}</p>
                      </div>
                      <a href={doc.file_path} target="_blank" rel="noreferrer"
                        className="p-1.5 rounded-lg hover:opacity-70" style={{ color: '#60a5fa' }}>
                        <ExternalLink size={13} />
                      </a>
                      <button onClick={() => handleDeleteDoc(doc.id)}
                        className="p-1.5 rounded-lg hover:opacity-70" style={{ color: '#f87171' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ purchase, onConfirm, onCancel, deleting }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{ background: 'var(--ae-surface)', border: '1px solid var(--ae-glass-border)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(239,68,68,0.12)' }}>
            <Trash2 size={18} style={{ color: '#ef4444' }} />
          </div>
          <div>
            <h3 className="font-bold text-base" style={{ color: 'var(--ae-ink)' }}>Delete Purchase</h3>
            <p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>This action cannot be undone</p>
          </div>
        </div>
        <p className="text-sm mb-6" style={{ color: 'var(--ae-ink-muted)' }}>
          Are you sure you want to permanently delete{' '}
          <span style={{ color: 'var(--ae-ink)', fontWeight: 600 }}>
            {purchase.year} {purchase.make} {purchase.model}
          </span>
          {purchase.chassis ? ` (${purchase.chassis})` : ''}? All documents will also be removed.
        </p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn-ghost" disabled={deleting}>Cancel</button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-colors"
            style={{ background: '#ef4444' }}
          >
            {deleting
              ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <Trash2 size={14} />
            }
            {deleting ? 'Deleting…' : 'Delete Purchase'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminJapanPurchases() {
  const [purchases,   setPurchases]   = useState([]);
  const [total,       setTotal]       = useState(0);
  const [pages,       setPages]       = useState(1);
  const [page,        setPage]        = useState(1);
  const [users,       setUsers]       = useState([]);
  const [userFilter,  setUserFilter]  = useState('');
  const [loading,     setLoading]     = useState(true);
  const [selected,    setSelected]    = useState(null);
  const [creating,    setCreating]    = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting,    setDeleting]    = useState(false);

  const load = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 30 };
      if (userFilter) params.user_id = userFilter;
      const { data } = await getAllJapanPurchases(params);
      setPurchases(data.purchases || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }, [page, userFilter]);

  useEffect(() => { load(1); setPage(1); }, [userFilter]);
  useEffect(() => { load(page); }, [page]);

  useEffect(() => {
    getAdminUsers({ limit: 500 })
      .then(r => setUsers(r.data?.users || []))
      .catch(() => {});
  }, []);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteJapanPurchase(confirmDelete.id);
      toast.success('Purchase deleted');
      setConfirmDelete(null);
      setSelected(null);
      load(page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete purchase');
    } finally {
      setDeleting(false);
    }
  };

  const cols = [
    { label: 'Car',             render: (p) => (
      <div className="flex items-center gap-3">
        {p.image_url ? (
          <img src={resolveImageUrl(p.image_url.split(',')[0].trim())} alt=""
            className="w-10 h-8 rounded-lg object-cover shrink-0"
            onError={e => e.target.style.display = 'none'} />
        ) : (
          <div className="w-10 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--ae-glass-bg)' }}>
            <Car size={12} style={{ color: 'var(--ae-ink-faint)' }} />
          </div>
        )}
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--ae-ink)' }}>{p.year} {p.make} {p.model}</p>
          <p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>{p.chassis || '—'}</p>
        </div>
      </div>
    )},
    { label: 'Client',          render: (p) => (
      <div>
        <p className="text-sm" style={{ color: 'var(--ae-ink)' }}>{p.user_name}</p>
        <p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>{p.user_email}</p>
      </div>
    )},
    { label: 'Auc Date',        render: (p) => <span className="text-sm" style={{ color: 'var(--ae-ink-muted)' }}>{date(p.auction_date)}</span> },
    { label: 'File Code',       render: (p) => <span className="text-xs font-mono" style={{ color: 'var(--ae-red)' }}>{p.file_code || '—'}</span> },
    { label: 'Lot No',          render: (p) => <span className="text-xs" style={{ color: 'var(--ae-ink-muted)' }}>{p.lot_number || '—'}</span> },
    { label: 'Total',           render: (p) => <span className="text-sm font-semibold" style={{ color: p.total > 0 ? '#34d399' : 'var(--ae-ink-faint)' }}>{fmt(p.total)}</span> },
    { label: 'ETA',             render: (p) => <span className="text-xs" style={{ color: 'var(--ae-ink-muted)' }}>{date(p.eta)}</span> },
    { label: 'BL Status',       render: (p) => p.bl_status ? (
      <span className="badge-blue text-xs">{p.bl_status}</span>
    ) : <span style={{ color: 'var(--ae-ink-faint)' }}>—</span> },
    { label: 'Docs',            render: (p) => (
      <span className="text-xs" style={{ color: p.doc_count > 0 ? '#60a5fa' : 'var(--ae-ink-faint)' }}>
        {p.doc_count > 0 ? `${p.doc_count} file${p.doc_count > 1 ? 's' : ''}` : '—'}
      </span>
    )},
    { label: '', render: (p) => (
      <button
        onClick={e => { e.stopPropagation(); setConfirmDelete(p); }}
        className="p-1.5 rounded-lg opacity-40 hover:opacity-100 transition-opacity"
        style={{ color: '#ef4444' }}
        title="Delete purchase"
      >
        <Trash2 size={14} />
      </button>
    )},
  ];

  return (
    <div data-theme="light" style={{ background: 'var(--ae-canvas)', minHeight: '100vh' }} className="px-4 py-10">
      <div className="max-w-7xl mx-auto">

        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--ae-ink)' }}>Japan Purchases</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--ae-ink-muted)' }}>
              {total} purchase{total !== 1 ? 's' : ''} — click any row to view & edit
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <select className="input-field w-56 text-sm" value={userFilter} onChange={e => setUserFilter(e.target.value)}>
              <option value="">All Clients</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <button onClick={() => setCreating(true)} className="btn-gold flex items-center gap-2">
              <Plus size={15} /> Add Manual Purchase
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
          </div>
        ) : purchases.length === 0 ? (
          <div className="card p-20 text-center">
            <Car size={40} className="mx-auto mb-4" style={{ color: 'var(--ae-ink-faint)' }} />
            <p style={{ color: 'var(--ae-ink-muted)' }}>No purchases found</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs uppercase" style={{ borderColor: 'var(--ae-glass-border)', color: 'var(--ae-ink-faint)' }}>
                  {cols.map(c => (
                    <th key={c.label} className="px-4 py-3 text-left">{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {purchases.map(p => (
                  <tr key={p.id}
                    onClick={() => setSelected(p.id)}
                    className="border-b transition-colors cursor-pointer hover:bg-black/[0.03]"
                    style={{ borderColor: 'var(--ae-glass-border)' }}>
                    {cols.map(c => (
                      <td key={c.label} className="px-4 py-3">{c.render(p)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-ghost disabled:opacity-30">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm" style={{ color: 'var(--ae-ink-muted)' }}>{page} / {pages}</span>
            <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="btn-ghost disabled:opacity-30">
              <ChevronRight size={16} />
            </button>
          </div>
        )}

      </div>

      {creating && (
        <CreateDrawer
          users={users}
          onClose={() => setCreating(false)}
          onCreated={() => { load(1); setPage(1); }}
        />
      )}

      {selected && (
        <EditDrawer
          purchaseId={selected}
          onClose={() => setSelected(null)}
          onSaved={() => load(page)}
          onDeleteRequest={(p) => setConfirmDelete(p)}
        />
      )}

      {confirmDelete && (
        <ConfirmDeleteModal
          purchase={confirmDelete}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
          deleting={deleting}
        />
      )}
    </div>
  );
}
