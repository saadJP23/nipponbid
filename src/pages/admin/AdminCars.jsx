import React, { useEffect, useState } from 'react';
import { Car, Plus, Edit, Trash2, Upload, X, Calendar } from 'lucide-react';
import { getCars, getAuctions, createCar, updateCar, deleteCar, uploadCarImages, createAuction } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const CAR_FIELDS = ['auction_id','lot_number','make','model','year','mileage','grade','chassis_number','engine','color','doors','seats','starting_price'];
const defaultCar = { auction_id:'',lot_number:'',make:'',model:'',year:'',mileage:'',grade:'',chassis_number:'',engine:'',transmission:'automatic',color:'',doors:'4',seats:'5',fuel_type:'petrol',drive:'2WD',starting_price:'',description:'' };

export default function AdminCars() {
  const [cars, setCars] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ ...defaultCar });
  const [uploadingId, setUploadingId] = useState(null);
  const [auctionModal, setAuctionModal] = useState(false);
  const [auctionForm, setAuctionForm] = useState({ name:'',location:'',auction_house:'',auction_date:'',description:'' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      getCars({ page, limit: 15 }),
      getAuctions(),
    ]).then(([cRes, aRes]) => {
      setCars(cRes.data.cars || []);
      setTotal(cRes.data.total || 0);
      setPages(cRes.data.pages || 1);
      setAuctions(aRes.data || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page]);

  const openCreate = () => { setForm({ ...defaultCar }); setModal('create'); };
  const openEdit = (car) => { setForm({ ...car }); setModal('edit'); };

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const handleAuctionChange = (e) => setAuctionForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    if (!form.make || !form.model) return toast.error('Make and model are required');
    setSaving(true);
    try {
      if (modal === 'create') {
        await createCar(form);
        toast.success('Car added!');
      } else {
        await updateCar(form.id, form);
        toast.success('Car updated!');
      }
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save car');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this car? This cannot be undone.')) return;
    await deleteCar(id);
    toast.success('Car deleted');
    load();
  };

  const handleUpload = async (carId, files) => {
    if (!files.length) return;
    setUploadingId(carId);
    const formData = new FormData();
    Array.from(files).forEach(f => formData.append('images', f));
    try {
      await uploadCarImages(carId, formData);
      toast.success(`${files.length} image${files.length > 1 ? 's' : ''} uploaded!`);
    } catch { toast.error('Upload failed'); } finally { setUploadingId(null); }
  };

  const handleCreateAuction = async () => {
    if (!auctionForm.name || !auctionForm.auction_date) return toast.error('Name and date required');
    setSaving(true);
    try {
      await createAuction(auctionForm);
      toast.success('Auction created!');
      setAuctionModal(false);
      setAuctionForm({ name:'',location:'',auction_house:'',auction_date:'',description:'' });
      load();
    } catch { toast.error('Failed to create auction'); } finally { setSaving(false); }
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Cars & Auctions</h1>
          <p className="text-gray-500 mt-1">{total} vehicles · {auctions.length} auctions</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setAuctionModal(true)} className="btn-ghost text-sm"><Calendar size={15} /> New Auction</button>
          <button onClick={openCreate} className="btn-gold text-sm"><Plus size={15} /> Add Car</button>
        </div>
      </div>

      {auctions.length > 0 && (
        <div className="mb-6">
          <h2 className="text-white font-semibold mb-3 text-sm uppercase tracking-wide text-gray-500">Active Auctions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {auctions.map(a => (
              <div key={a.id} className="card p-3 text-sm">
                <p className="text-white font-medium truncate">{a.name}</p>
                <p className="text-gray-500 text-xs mt-0.5">{a.auction_house} · {a.car_count || 0} cars</p>
                <p className="text-gray-600 text-xs mt-1">{format(new Date(a.auction_date), 'MMM d')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
      ) : (
        <div className="space-y-2">
          {cars.map(car => (
            <div key={car.id} className="card p-4 flex items-center gap-3">
              {car.primary_image ? (
                <img src={car.primary_image} alt="" className="w-16 h-12 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-16 h-12 rounded-lg bg-dark-400 flex items-center justify-center shrink-0"><Car size={18} className="text-gray-600" /></div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm">{car.year} {car.make} {car.model}</p>
                <p className="text-gray-500 text-xs">Lot #{car.lot_number || '—'} · {car.chassis_number || '—'} · ¥{Number(car.starting_price || 0).toLocaleString()}</p>
              </div>

              <StatusBadge status={car.status} type="car" />

              <div className="flex gap-1.5 shrink-0">
                <label className="cursor-pointer p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors" title="Upload Images">
                  {uploadingId === car.id ? <span className="w-3.5 h-3.5 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin block" /> : <Upload size={14} />}
                  <input type="file" multiple accept="image/*" className="hidden" onChange={e => handleUpload(car.id, e.target.files)} />
                </label>
                <button onClick={() => openEdit(car)} className="p-1.5 rounded-lg bg-gold-500/10 text-gold-400 hover:bg-gold-500/20 transition-colors"><Edit size={14} /></button>
                <button onClick={() => handleDelete(car.id)} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-ghost disabled:opacity-30 text-sm">← Prev</button>
          <span className="text-gray-400 text-sm">Page {page} of {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="btn-ghost disabled:opacity-30 text-sm">Next →</button>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="relative card p-6 w-full max-w-2xl my-4">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">{modal === 'create' ? 'Add New Car' : 'Edit Car'}</h3>
              <button onClick={() => setModal(null)} className="text-gray-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="col-span-2">
                <label className="label">Auction</label>
                <select name="auction_id" value={form.auction_id} onChange={handleChange} className="select-field">
                  <option value="">No auction</option>
                  {auctions.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              {[
                ['Lot Number', 'lot_number', 'text', '#001'],
                ['Make', 'make', 'text', 'Toyota'],
                ['Model', 'model', 'text', 'Corolla'],
                ['Year', 'year', 'number', '2020'],
                ['Mileage (km)', 'mileage', 'number', '45000'],
                ['Grade', 'grade', 'text', '4.5'],
                ['Chassis #', 'chassis_number', 'text', 'ZZT231-0001'],
                ['Engine', 'engine', 'text', '1.8L 4-cyl'],
                ['Color', 'color', 'text', 'White'],
                ['Doors', 'doors', 'number', '4'],
                ['Seats', 'seats', 'number', '5'],
                ['Starting Price (¥)', 'starting_price', 'number', '500000'],
              ].map(([label, name, type, placeholder]) => (
                <div key={name}>
                  <label className="label">{label}</label>
                  <input type={type} name={name} value={form[name] || ''} onChange={handleChange} placeholder={placeholder} className="input-field" />
                </div>
              ))}
              <div>
                <label className="label">Transmission</label>
                <select name="transmission" value={form.transmission} onChange={handleChange} className="select-field">
                  {['automatic','manual','cvt'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Fuel Type</label>
                <select name="fuel_type" value={form.fuel_type} onChange={handleChange} className="select-field">
                  {['petrol','diesel','hybrid','electric'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Drive</label>
                <select name="drive" value={form.drive} onChange={handleChange} className="select-field">
                  {['2WD','4WD','AWD'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {modal === 'edit' && (
                <div>
                  <label className="label">Status</label>
                  <select name="status" value={form.status} onChange={handleChange} className="select-field">
                    {['upcoming','live','sold','unsold'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
              <div className="col-span-2">
                <label className="label">Description</label>
                <textarea name="description" value={form.description || ''} onChange={handleChange} rows={3} className="input-field resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModal(null)} className="btn-ghost flex-1 justify-center">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-gold flex-1 justify-center">
                {saving ? <span className="w-4 h-4 border-2 border-dark-50/30 border-t-dark-50 rounded-full animate-spin" /> : 'Save Car'}
              </button>
            </div>
          </div>
        </div>
      )}

      {auctionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAuctionModal(false)} />
          <div className="relative card p-6 w-full max-w-md">
            <h3 className="text-white font-bold text-lg mb-5">Create New Auction</h3>
            <div className="space-y-4">
              <div><label className="label">Auction Name *</label><input type="text" name="name" value={auctionForm.name} onChange={handleAuctionChange} placeholder="USS Tokyo June 2026" className="input-field" /></div>
              <div><label className="label">Auction House</label><input type="text" name="auction_house" value={auctionForm.auction_house} onChange={handleAuctionChange} placeholder="USS, JAA, HAA..." className="input-field" /></div>
              <div><label className="label">Location</label><input type="text" name="location" value={auctionForm.location} onChange={handleAuctionChange} placeholder="Tokyo, Japan" className="input-field" /></div>
              <div><label className="label">Auction Date *</label><input type="datetime-local" name="auction_date" value={auctionForm.auction_date} onChange={handleAuctionChange} className="input-field" /></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setAuctionModal(false)} className="btn-ghost flex-1 justify-center">Cancel</button>
              <button onClick={handleCreateAuction} disabled={saving} className="btn-gold flex-1 justify-center">{saving ? '...' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
