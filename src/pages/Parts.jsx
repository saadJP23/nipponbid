import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe, Factory, Info, Package } from 'lucide-react';
import { submitPart } from '../services/api';
import toast from 'react-hot-toast';

const PLATFORMS = ['Yahoo Auctions Japan', 'Mercari', 'Amazon Japan', 'Rakuten', 'Monotaro', 'Other'];
const CAR_MAKES = ['Toyota', 'Honda', 'Nissan', 'Mazda', 'Subaru', 'Mitsubishi', 'Suzuki', 'Lexus', 'Infiniti', 'Acura', 'Other'];

const defaultOnline = { platform_link: '', platform_name: '', part_name: '', part_description: '', bid_price: '', quantity: 1 };
const defaultMfr    = { chassis_number: '', car_make: '', car_model: '', car_year: '', part_name: '', part_description: '', bid_price: '', quantity: 1 };

export default function Parts() {
  const [type, setType]     = useState('online');
  const [form, setForm]     = useState({ ...defaultOnline });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleTypeChange = (t) => {
    setType(t);
    setForm(t === 'online' ? { ...defaultOnline } : { ...defaultMfr });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.part_name || !form.bid_price) return toast.error('Part name and price are required');
    if (type === 'online' && !form.platform_link) return toast.error('Platform link is required');
    if (type === 'manufacturer' && (!form.chassis_number || !form.car_make || !form.car_model)) {
      return toast.error('Chassis number, make, and model are required');
    }
    setLoading(true);
    try {
      await submitPart({ type, ...form });
      toast.success('Parts request submitted successfully!');
      setForm(type === 'online' ? { ...defaultOnline } : { ...defaultMfr });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-theme="light" style={{ background: 'var(--ae-canvas)', minHeight: '100%' }}>
      <div className="page-container max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--ae-ink)' }}>Order Parts</h1>
          <p className="mt-1" style={{ color: 'var(--ae-ink-muted)' }}>Source parts from online platforms or directly from manufacturers in Japan</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => handleTypeChange('online')}
            className="p-5 rounded-2xl border-2 text-left transition-all"
            style={{
              borderColor: type === 'online' ? 'var(--ae-red)' : 'var(--ae-glass-border)',
              background:  type === 'online' ? 'rgba(183,16,42,0.05)' : 'transparent',
            }}>
            <Globe size={22} style={{ color: type === 'online' ? 'var(--ae-red)' : 'var(--ae-ink-faint)' }} />
            <h3 className="font-semibold mt-3 mb-1" style={{ color: type === 'online' ? 'var(--ae-red)' : 'var(--ae-ink)' }}>
              Online Purchase
            </h3>
            <p className="text-sm" style={{ color: 'var(--ae-ink-muted)' }}>
              Buy from Yahoo Auctions, Mercari, Rakuten, or any Japanese platform
            </p>
          </button>
          <button
            onClick={() => handleTypeChange('manufacturer')}
            className="p-5 rounded-2xl border-2 text-left transition-all"
            style={{
              borderColor: type === 'manufacturer' ? 'var(--ae-red)' : 'var(--ae-glass-border)',
              background:  type === 'manufacturer' ? 'rgba(183,16,42,0.05)' : 'transparent',
            }}>
            <Factory size={22} style={{ color: type === 'manufacturer' ? 'var(--ae-red)' : 'var(--ae-ink-faint)' }} />
            <h3 className="font-semibold mt-3 mb-1" style={{ color: type === 'manufacturer' ? 'var(--ae-red)' : 'var(--ae-ink)' }}>
              Direct Manufacturer
            </h3>
            <p className="text-sm" style={{ color: 'var(--ae-ink-muted)' }}>
              Order directly from the manufacturer using chassis number and car details
            </p>
          </button>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {type === 'online' ? (
              <>
                <div className="bg-blue-500/8 border border-blue-500/15 rounded-xl p-3 flex gap-2 text-sm text-blue-600">
                  <Info size={15} className="shrink-0 mt-0.5" />
                  Paste the product link from Yahoo Auctions, Mercari, or any Japanese shopping platform.
                </div>

                <div>
                  <label className="label">Platform</label>
                  <select name="platform_name" value={form.platform_name} onChange={handleChange} className="select-field">
                    <option value="">Select platform...</option>
                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div>
                  <label className="label">Product Link *</label>
                  <input
                    type="url"
                    name="platform_link"
                    value={form.platform_link}
                    onChange={handleChange}
                    placeholder="https://auctions.yahoo.co.jp/..."
                    className="input-field"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="rounded-xl p-3 flex gap-2 text-sm" style={{ background: 'rgba(183,16,42,0.05)', border: '1px solid rgba(183,16,42,0.15)', color: 'var(--ae-red)' }}>
                  <Info size={15} className="shrink-0 mt-0.5" />
                  Provide vehicle chassis number and details so we can source the exact part from the manufacturer.
                </div>

                <div>
                  <label className="label">Chassis Number *</label>
                  <input type="text" name="chassis_number" value={form.chassis_number} onChange={handleChange} placeholder="e.g. ZZT231-0001234" className="input-field" />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label">Car Make *</label>
                    <select name="car_make" value={form.car_make} onChange={handleChange} className="select-field">
                      <option value="">Make...</option>
                      {CAR_MAKES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Car Model *</label>
                    <input type="text" name="car_model" value={form.car_model} onChange={handleChange} placeholder="Corolla" className="input-field" />
                  </div>
                  <div>
                    <label className="label">Year</label>
                    <input type="number" name="car_year" value={form.car_year} onChange={handleChange} placeholder="2018" min="1990" max="2026" className="input-field" />
                  </div>
                </div>
              </>
            )}

            <div className="pt-5 space-y-4" style={{ borderTop: '1px solid var(--ae-glass-border)' }}>
              <div>
                <label className="label">Part Name *</label>
                <input type="text" name="part_name" value={form.part_name} onChange={handleChange} placeholder="e.g. Front Brake Pads, Alternator, Side Mirror..." className="input-field" />
              </div>

              <div>
                <label className="label">Part Description</label>
                <textarea name="part_description" value={form.part_description} onChange={handleChange} rows={3}
                  placeholder="Additional details: OEM part number, color, side (L/R), condition preference, etc."
                  className="input-field resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Your Bid / Budget (¥) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-sm" style={{ color: 'var(--ae-red)' }}>¥</span>
                    <input type="number" name="bid_price" value={form.bid_price} onChange={handleChange} placeholder="50000" min="1" className="input-field pl-8" />
                  </div>
                </div>
                <div>
                  <label className="label">Quantity</label>
                  <input type="number" name="quantity" value={form.quantity} onChange={handleChange} min="1" max="100" className="input-field" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Link to="/my-parts" className="btn-ghost flex-1 justify-center">View My Orders</Link>
              <button type="submit" disabled={loading} className="btn-gold flex-1 justify-center">
                {loading
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><Package size={16} /> Submit Request</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
