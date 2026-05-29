import React, { useState, useEffect } from 'react';
import { CheckCircle, Trash2, FileText, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getAllRemittances, confirmRemittance, deleteRemittance,
  adminCreateRemittance, getAdminUsers,
} from '../../services/api';
import { format } from 'date-fns';

const statusBadge = (s) => {
  if (s === 'confirmed') return <span className="badge-green">Confirmed</span>;
  return <span className="badge-orange">Pending</span>;
};

const EMPTY_FORM = {
  user_id: '', name: '', transfer_amount: '', deposit_amount: '',
  currency: 'JPY', payment_mode: 'bank', exchange_rate: '',
  bank_charge_1: '', bank_charge_2: '', tt_date: '', remark: '', status: 'confirmed',
};

export default function AdminRemittances() {
  const [data,         setData]         = useState({ remittances: [], total: 0, pages: 1 });
  const [users,        setUsers]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [page,         setPage]         = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [confirmModal, setConfirmModal] = useState(null);
  const [confirmForm,  setConfirmForm]  = useState({ deposit_amount: '', bank_charge_1: '', bank_charge_2: '', exchange_rate: '' });
  const [showAdd,      setShowAdd]      = useState(false);
  const [addForm,      setAddForm]      = useState(EMPTY_FORM);
  const [adding,       setAdding]       = useState(false);

  const load = async (p = page) => {
    setLoading(true);
    try {
      const { data: d } = await getAllRemittances({ status: statusFilter || undefined, page: p, limit: 25 });
      setData(d);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(1); setPage(1); }, [statusFilter]);

  useEffect(() => {
    getAdminUsers({ limit: 500 }).then(r => setUsers(r.data?.users || [])).catch(() => {});
  }, []);

  
  const openConfirm = (r) => {
    setConfirmModal(r);
    setConfirmForm({ deposit_amount: r.deposit_amount || r.transfer_amount, bank_charge_1: r.bank_charge_1 || '', bank_charge_2: r.bank_charge_2 || '', exchange_rate: r.exchange_rate || '' });
  };

  const handleConfirm = async () => {
    try {
      await confirmRemittance(confirmModal.id, confirmForm);
      toast.success('Remittance confirmed');
      setConfirmModal(null);
      load(page);
    } catch { toast.error('Failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this remittance?')) return;
    try {
      await deleteRemittance(id);
      toast.success('Deleted');
      load(page);
    } catch { toast.error('Failed'); }
  };

  
  const handleAdd = async () => {
    if (!addForm.user_id || !addForm.transfer_amount) {
      toast.error('Client and amount are required');
      return;
    }
    setAdding(true);
    try {
      await adminCreateRemittance(addForm);
      toast.success('Remittance added');
      setShowAdd(false);
      setAddForm(EMPTY_FORM);
      load(1); setPage(1);
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setAdding(false); }
  };

  const af = (k, v) => setAddForm(p => ({ ...p, [k]: v }));

  return (
    <div data-theme="light" style={{ background: 'var(--ae-canvas)', minHeight: '100vh' }}>
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--ae-ink)' }}>Remittances</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ae-ink-muted)' }}>Manage client money transfers</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="input-field w-40 text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
          </select>
          <button onClick={() => setShowAdd(o => !o)} className="btn-gold text-sm gap-2">
            <Plus size={14} /> Add Remittance
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-sm" style={{ color: 'var(--ae-ink)' }}>Add Remittance Manually</h2>
            <button onClick={() => setShowAdd(false)} style={{ color: 'var(--ae-ink-faint)' }} className="hover:opacity-70">
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="col-span-2">
              <label className="label">Client *</label>
              <select className="select-field text-sm" value={addForm.user_id} onChange={e => af('user_id', e.target.value)}>
                <option value="">— Select client —</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Name / Reference</label>
              <input className="input-field text-sm" placeholder="e.g. Land Cruiser payment" value={addForm.name} onChange={e => af('name', e.target.value)} />
            </div>
            <div>
              <label className="label">Currency</label>
              <select className="select-field text-sm" value={addForm.currency} onChange={e => af('currency', e.target.value)}>
                <option>JPY</option><option>USD</option><option>EUR</option><option>GBP</option>
                <option>PKR</option><option>AED</option><option>SGD</option>
              </select>
            </div>
            <div>
              <label className="label">Transfer Amount *</label>
              <input type="number" className="input-field text-sm" placeholder="0" value={addForm.transfer_amount} onChange={e => af('transfer_amount', e.target.value)} />
            </div>
            <div>
              <label className="label">Deposit Amount</label>
              <input type="number" className="input-field text-sm" placeholder="0" value={addForm.deposit_amount} onChange={e => af('deposit_amount', e.target.value)} />
            </div>
            <div>
              <label className="label">Payment Mode</label>
              <select className="select-field text-sm" value={addForm.payment_mode} onChange={e => af('payment_mode', e.target.value)}>
                <option value="bank">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="crypto">Crypto</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="label">TT Date</label>
              <input type="date" className="input-field text-sm" value={addForm.tt_date} onChange={e => af('tt_date', e.target.value)} />
            </div>
            <div>
              <label className="label">Exchange Rate</label>
              <input type="number" step="0.0001" className="input-field text-sm" placeholder="0" value={addForm.exchange_rate} onChange={e => af('exchange_rate', e.target.value)} />
            </div>
            <div>
              <label className="label">Bank Charge 1</label>
              <input type="number" className="input-field text-sm" placeholder="0" value={addForm.bank_charge_1} onChange={e => af('bank_charge_1', e.target.value)} />
            </div>
            <div>
              <label className="label">Bank Charge 2</label>
              <input type="number" className="input-field text-sm" placeholder="0" value={addForm.bank_charge_2} onChange={e => af('bank_charge_2', e.target.value)} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="select-field text-sm" value={addForm.status} onChange={e => af('status', e.target.value)}>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div className="col-span-2 md:col-span-3">
              <label className="label">Remark</label>
              <input className="input-field text-sm" placeholder="Optional note" value={addForm.remark} onChange={e => af('remark', e.target.value)} />
            </div>
          </div>
          <div className="flex gap-3 justify-end mt-5">
            <button onClick={() => { setShowAdd(false); setAddForm(EMPTY_FORM); }} className="btn-ghost text-sm">Cancel</button>
            <button onClick={handleAdd} disabled={adding} className="btn-gold text-sm disabled:opacity-50">
              {adding ? 'Saving…' : 'Save Remittance'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20" style={{ color: 'var(--ae-ink-muted)' }}>Loading…</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase" style={{ borderBottom: '1px solid var(--ae-glass-border)', color: 'var(--ae-ink-faint)' }}>
                <th className="px-4 py-3 text-left">Ref</th>
                <th className="px-4 py-3 text-left">Client</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Deposit</th>
                <th className="px-4 py-3 text-left">Mode</th>
                <th className="px-4 py-3 text-left">TT Date</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.remittances.map(r => (
                <tr key={r.id} className="transition-colors hover:bg-black/[0.02]" style={{ borderBottom: '1px solid var(--ae-glass-border)' }}>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--ae-red)' }}>{r.ref_no}</td>
                  <td className="px-4 py-3">
                    <p style={{ color: 'var(--ae-ink)' }}>{r.user_name}</p>
                    <p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>{r.user_email}</p>
                    {r.name && <p className="text-xs" style={{ color: 'var(--ae-ink-muted)' }}>{r.name}</p>}
                  </td>
                  <td className="px-4 py-3 font-semibold" style={{ color: 'var(--ae-ink)' }}>
                    {r.currency} {Number(r.transfer_amount).toLocaleString()}
                  </td>
                  <td className="px-4 py-3" style={{ color: '#34d399' }}>
                    {r.deposit_amount > 0 ? Number(r.deposit_amount).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3 capitalize" style={{ color: 'var(--ae-ink-muted)' }}>{r.payment_mode}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--ae-ink-muted)' }}>
                    {r.tt_date ? format(new Date(r.tt_date), 'dd MMM yyyy') : '—'}
                  </td>
                  <td className="px-4 py-3">{statusBadge(r.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      {r.copy_path && (
                        <a href={r.copy_path} target="_blank" rel="noreferrer"
                          className="hover:opacity-70 transition-opacity" style={{ color: 'var(--ae-ink-faint)' }}>
                          <FileText className="w-4 h-4" />
                        </a>
                      )}
                      {r.status === 'pending' && (
                        <button onClick={() => openConfirm(r)}
                          className="hover:opacity-70 transition-opacity" style={{ color: '#34d399' }}>
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(r.id)}
                        className="hover:opacity-70 transition-opacity" style={{ color: '#f87171' }}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.remittances.length && (
            <div className="text-center py-12" style={{ color: 'var(--ae-ink-faint)' }}>No remittances found</div>
          )}
        </div>
      )}

      {data.pages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button disabled={page === 1} onClick={() => { setPage(p => p - 1); load(page - 1); }} className="btn-ghost disabled:opacity-40">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm self-center" style={{ color: 'var(--ae-ink-muted)' }}>{page} / {data.pages}</span>
          <button disabled={page >= data.pages} onClick={() => { setPage(p => p + 1); load(page + 1); }} className="btn-ghost disabled:opacity-40">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {confirmModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md" style={{ background: 'var(--ae-surface)' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--ae-ink)' }}>
              Confirm — {confirmModal.ref_no}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="label">Deposit Amount (received)</label>
                <input type="number" className="input-field" value={confirmForm.deposit_amount}
                  onChange={e => setConfirmForm({ ...confirmForm, deposit_amount: e.target.value })} />
              </div>
              <div>
                <label className="label">Exchange Rate</label>
                <input type="number" step="0.0001" className="input-field" value={confirmForm.exchange_rate}
                  onChange={e => setConfirmForm({ ...confirmForm, exchange_rate: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Bank Charge 1</label>
                  <input type="number" className="input-field" value={confirmForm.bank_charge_1}
                    onChange={e => setConfirmForm({ ...confirmForm, bank_charge_1: e.target.value })} />
                </div>
                <div>
                  <label className="label">Bank Charge 2</label>
                  <input type="number" className="input-field" value={confirmForm.bank_charge_2}
                    onChange={e => setConfirmForm({ ...confirmForm, bank_charge_2: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-5">
              <button onClick={() => setConfirmModal(null)} className="btn-ghost">Cancel</button>
              <button onClick={handleConfirm} className="btn-gold">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
