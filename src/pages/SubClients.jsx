import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { getMySubClients, createSubClient, updateSubClient, deleteSubClient } from '../services/api';

const COUNTRIES = ['Japan', 'Pakistan', 'UAE', 'Saudi Arabia', 'Australia', 'New Zealand', 'UK', 'USA', 'Canada', 'Other'];
const CURRENCIES = ['JPY', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'PKR', 'AUD', 'CAD', 'OTHER'];

const BLANK = { name: '', username: '', email: '', mobile: '', address: '', country: '', city: '', contact_person: '', port: '', company_name: '', ship_terms: '', currency: 'JPY', lcc: '' };

export default function SubClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const { data } = await getMySubClients();
      setClients(data);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(BLANK); setShowForm(true); };
  const openEdit = (c) => { setEditing(c.id); setForm({ ...BLANK, ...c }); setShowForm(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) return toast.error('Name is required');
    setSubmitting(true);
    try {
      if (editing) {
        await updateSubClient(editing, form);
        toast.success('Sub-client updated');
      } else {
        await createSubClient(form);
        toast.success('Sub-client added');
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this sub-client?')) return;
    try {
      await deleteSubClient(id);
      toast.success('Deleted');
      load();
    } catch { toast.error('Failed'); }
  };

  const toggleActive = async (c) => {
    try {
      await updateSubClient(c.id, { ...c, is_active: !c.is_active });
      load();
    } catch { toast.error('Failed'); }
  };

  const f = (k) => ({ value: form[k], onChange: e => setForm({ ...form, [k]: e.target.value }) });

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Sub-Clients</h1>
          <p className="text-white/50 mt-1">Manage your agents and sub-accounts</p>
        </div>
        <button onClick={openAdd} className="btn-gold flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Sub-Client
        </button>
      </div>

      {showForm && (
        <div className="card p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-5">{editing ? 'Edit Sub-Client' : 'New Sub-Client'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="text-white/60 text-sm block mb-1">Name <span className="text-red-400">*</span></label><input className="input-field" {...f('name')} required /></div>
            <div><label className="text-white/60 text-sm block mb-1">Username</label><input className="input-field" {...f('username')} /></div>
            <div><label className="text-white/60 text-sm block mb-1">Email</label><input type="email" className="input-field" {...f('email')} /></div>
            <div><label className="text-white/60 text-sm block mb-1">Mobile</label><input className="input-field" {...f('mobile')} /></div>
            <div><label className="text-white/60 text-sm block mb-1">Company</label><input className="input-field" {...f('company_name')} /></div>
            <div><label className="text-white/60 text-sm block mb-1">Contact Person</label><input className="input-field" {...f('contact_person')} /></div>
            <div>
              <label className="text-white/60 text-sm block mb-1">Country</label>
              <select className="input-field" {...f('country')}>
                <option value="">Select country</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><label className="text-white/60 text-sm block mb-1">City</label><input className="input-field" {...f('city')} /></div>
            <div><label className="text-white/60 text-sm block mb-1">Port</label><input className="input-field" placeholder="Port of delivery" {...f('port')} /></div>
            <div><label className="text-white/60 text-sm block mb-1">Ship Terms</label><input className="input-field" placeholder="FOB, CIF, etc." {...f('ship_terms')} /></div>
            <div>
              <label className="text-white/60 text-sm block mb-1">Currency</label>
              <select className="input-field" {...f('currency')}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><label className="text-white/60 text-sm block mb-1">LCC</label><input className="input-field" {...f('lcc')} /></div>
            <div className="sm:col-span-2"><label className="text-white/60 text-sm block mb-1">Address</label><textarea className="input-field" rows={2} {...f('address')} /></div>
            <div className="sm:col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={submitting} className="btn-gold">{submitting ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-white/50 text-center py-16">Loading...</div>
      ) : clients.length === 0 ? (
        <div className="card p-16 text-center">
          <Users className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/40">No sub-clients yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {clients.map(c => (
            <div key={c.id} className={`card p-5 ${!c.is_active ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-white font-semibold">{c.name}</h3>
                  {c.company_name && <p className="text-white/50 text-sm">{c.company_name}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleActive(c)} className="text-white/40 hover:text-gold-400 transition-colors">
                    {c.is_active ? <ToggleRight className="w-5 h-5 text-green-400" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button onClick={() => openEdit(c)} className="text-white/40 hover:text-gold-400 transition-colors"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(c.id)} className="text-white/40 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {c.email && <div><p className="text-white/40 text-xs">Email</p><p className="text-white/70">{c.email}</p></div>}
                {c.mobile && <div><p className="text-white/40 text-xs">Mobile</p><p className="text-white/70">{c.mobile}</p></div>}
                {c.country && <div><p className="text-white/40 text-xs">Country</p><p className="text-white/70">{c.country}{c.city ? `, ${c.city}` : ''}</p></div>}
                {c.port && <div><p className="text-white/40 text-xs">Port</p><p className="text-white/70">{c.port}</p></div>}
                {c.ship_terms && <div><p className="text-white/40 text-xs">Terms</p><p className="text-white/70">{c.ship_terms}</p></div>}
                {c.currency && <div><p className="text-white/40 text-xs">Currency</p><p className="text-white/70">{c.currency}</p></div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
