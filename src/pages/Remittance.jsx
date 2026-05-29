import React, { useState, useEffect, useRef } from 'react';
import { DollarSign, Upload, Plus, FileText, Clock, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { addRemittance, getMyRemittances } from '../services/api';
import { format } from 'date-fns';

const CURRENCIES = ['JPY', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'PKR', 'AUD', 'CAD', 'OTHER'];
const PAYMENT_MODES = [
  { value: 'bank', label: 'Bank Transfer' },
  { value: 'local', label: 'Local Transfer' },
  { value: 'other', label: 'Other' },
];

const statusBadge = (s) => {
  if (s === 'confirmed') return <span className="badge-green">Confirmed</span>;
  return <span className="badge-orange">Pending</span>;
};

const L = ({ children }) => (
  <label className="block text-sm mb-1" style={{ color: 'var(--ae-ink-muted)' }}>{children}</label>
);

export default function Remittance() {
  const [remittances, setRemittances] = useState([]);
  const [summary, setSummary] = useState({ total_confirmed: 0, total_pending: 0 });
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef();

  const [form, setForm] = useState({
    name: '', transfer_amount: '', deposit_amount: '', currency: 'JPY',
    exchange_pair: 'USD/JPY', exchange_rate: '', bank_charge_1: '',
    bank_charge_2: '', payment_mode: 'bank', remark: '', tt_date: '',
  });
  const [file, setFile] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await getMyRemittances();
      setRemittances(data.remittances);
      setSummary({ total_confirmed: data.total_confirmed, total_pending: data.total_pending });
    } catch { toast.error('Failed to load remittances'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.transfer_amount) return toast.error('Transfer amount is required');
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== '') fd.append(k, v); });
      if (file) fd.append('copy', file);
      await addRemittance(fd);
      toast.success('Remittance submitted successfully');
      setShowForm(false);
      setForm({ name: '', transfer_amount: '', deposit_amount: '', currency: 'JPY', exchange_pair: 'USD/JPY', exchange_rate: '', bank_charge_1: '', bank_charge_2: '', payment_mode: 'bank', remark: '', tt_date: '' });
      setFile(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally { setSubmitting(false); }
  };

  return (
    <div data-theme="light" style={{ background: 'var(--ae-canvas)', minHeight: '100%' }}>
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--ae-ink)' }}>Remittances</h1>
            <p className="mt-1" style={{ color: 'var(--ae-ink-muted)' }}>Track your money transfers to NipponBid</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn-gold flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Remittance
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="card p-5 flex items-center gap-4">
            <div className="p-3 bg-green-500/10 rounded-xl"><CheckCircle className="w-6 h-6 text-green-600" /></div>
            <div>
              <p className="text-sm" style={{ color: 'var(--ae-ink-muted)' }}>Total Confirmed</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--ae-ink)' }}>{Number(summary.total_confirmed).toLocaleString()}</p>
            </div>
          </div>
          <div className="card p-5 flex items-center gap-4">
            <div className="p-3 bg-yellow-500/10 rounded-xl"><Clock className="w-6 h-6 text-yellow-500" /></div>
            <div>
              <p className="text-sm" style={{ color: 'var(--ae-ink-muted)' }}>Pending Verification</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--ae-ink)' }}>{Number(summary.total_pending).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {showForm && (
          <div className="card p-6 mb-8">
            <h2 className="text-lg font-semibold mb-5" style={{ color: 'var(--ae-ink)' }}>New Remittance</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><L>Sender Name</L><input className="input-field" placeholder="Name on transfer" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><L>TT Date</L><input type="date" className="input-field" value={form.tt_date} onChange={e => setForm({ ...form, tt_date: e.target.value })} /></div>
              <div><L>Transfer Amount *</L><input type="number" className="input-field" placeholder="0" value={form.transfer_amount} onChange={e => setForm({ ...form, transfer_amount: e.target.value })} required /></div>
              <div><L>Currency</L><select className="input-field" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>{CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <div><L>Exchange Pair</L><input className="input-field" placeholder="USD/JPY" value={form.exchange_pair} onChange={e => setForm({ ...form, exchange_pair: e.target.value })} /></div>
              <div><L>Exchange Rate</L><input type="number" step="0.0001" className="input-field" placeholder="0.00" value={form.exchange_rate} onChange={e => setForm({ ...form, exchange_rate: e.target.value })} /></div>
              <div><L>Bank Charge 1</L><input type="number" className="input-field" placeholder="0" value={form.bank_charge_1} onChange={e => setForm({ ...form, bank_charge_1: e.target.value })} /></div>
              <div><L>Bank Charge 2</L><input type="number" className="input-field" placeholder="0" value={form.bank_charge_2} onChange={e => setForm({ ...form, bank_charge_2: e.target.value })} /></div>
              <div><L>Payment Mode</L><select className="input-field" value={form.payment_mode} onChange={e => setForm({ ...form, payment_mode: e.target.value })}>{PAYMENT_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select></div>
              <div>
                <L>TT Copy</L>
                <div className="input-field cursor-pointer flex items-center gap-2" style={{ color: 'var(--ae-ink-muted)' }} onClick={() => fileRef.current?.click()}>
                  <Upload className="w-4 h-4" />
                  {file ? file.name : 'Upload TT copy (PDF/Image)'}
                </div>
                <input type="file" ref={fileRef} className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setFile(e.target.files[0])} />
              </div>
              <div className="sm:col-span-2"><L>Remark</L><textarea className="input-field" rows={2} placeholder="Additional notes..." value={form.remark} onChange={e => setForm({ ...form, remark: e.target.value })} /></div>
              <div className="sm:col-span-2 flex gap-3 justify-end">
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-gold">{submitting ? 'Submitting...' : 'Submit'}</button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20" style={{ color: 'var(--ae-ink-muted)' }}>Loading...</div>
        ) : remittances.length === 0 ? (
          <div className="card p-16 text-center">
            <DollarSign className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--ae-ink-faint)' }} />
            <p style={{ color: 'var(--ae-ink-muted)' }}>No remittances yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {remittances.map(r => (
              <div key={r.id} className="card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>Ref No</p>
                    <p className="font-mono font-semibold" style={{ color: 'var(--ae-red)' }}>{r.ref_no}</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>Amount</p>
                    <p className="font-semibold" style={{ color: 'var(--ae-ink)' }}>{r.currency} {Number(r.transfer_amount).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>TT Date</p>
                    <p style={{ color: 'var(--ae-ink-muted)' }}>{r.tt_date ? format(new Date(r.tt_date), 'dd MMM yyyy') : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>Mode</p>
                    <p className="capitalize" style={{ color: 'var(--ae-ink-muted)' }}>{r.payment_mode}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {statusBadge(r.status)}
                  {r.copy_path && (
                    <a href={r.copy_path} target="_blank" rel="noreferrer" className="transition-opacity hover:opacity-70" style={{ color: 'var(--ae-ink-faint)' }}>
                      <FileText className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
