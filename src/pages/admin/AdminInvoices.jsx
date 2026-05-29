import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getAllProformaInvoices, createProformaInvoice, updateProformaInvoice, deleteProformaInvoice,
  getAllFinalInvoices, createFinalInvoice, updateFinalInvoice, deleteFinalInvoice,
  getAdminUsers,
} from '../../services/api';
import { format } from 'date-fns';

const statusBadge = (s) => {
  const map = { unpaid: 'badge-red', partial: 'badge-orange', paid: 'badge-green', archived: 'badge-gray' };
  return <span className={map[s] || 'badge-gray'}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : '—'}</span>;
};

const PRO_STATUSES = ['unpaid', 'partial', 'paid'];
const FIN_STATUSES = ['unpaid', 'partial', 'paid', 'archived'];
const BLANK_PRO = { user_id: '', invoice_date: '', due_date: '', sold_to: '', consigned_to: '', amount: '', notes: '' };
const BLANK_FIN = { user_id: '', file_code: '', invoice_date: '', due_date: '', ship_name: '', etd: '', eta: '', amount: '', notes: '' };

const L = ({ children, required }) => (
  <label className="block mb-1 text-xs font-medium" style={{ color: 'var(--ae-ink-faint)' }}>
    {children}{required && <span className="text-red-500 ml-0.5">*</span>}
  </label>
);

function InvoiceTab({ type }) {
  const isProforma = type === 'proforma';
  const [data, setData] = useState({ invoices: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(isProforma ? BLANK_PRO : BLANK_FIN);
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState([]);

  const getAll = isProforma ? getAllProformaInvoices : getAllFinalInvoices;
  const create = isProforma ? createProformaInvoice : createFinalInvoice;
  const update = isProforma ? updateProformaInvoice : updateFinalInvoice;
  const del = isProforma ? deleteProformaInvoice : deleteFinalInvoice;
  const STATUSES = isProforma ? PRO_STATUSES : FIN_STATUSES;

  const load = async (p = page) => {
    setLoading(true);
    try {
      const { data: d } = await getAll({ status: statusFilter || undefined, page: p, limit: 25 });
      setData(d);
    } catch { toast.error('Failed'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(1); setPage(1); }, [statusFilter]);

  useEffect(() => {
    getAdminUsers({ limit: 200 }).then(r => setUsers(r.data.users)).catch(() => {});
  }, []);

  const blank = isProforma ? BLANK_PRO : BLANK_FIN;
  const openAdd = () => { setEditing(null); setForm(blank); setShowForm(true); };
  const openEdit = (inv) => { setEditing(inv.id); setForm({ ...blank, ...inv }); setShowForm(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.user_id || !form.invoice_date || !form.amount) return toast.error('User, date, and amount are required');
    setSubmitting(true);
    try {
      if (editing) {
        await update(editing, form);
        toast.success('Invoice updated');
      } else {
        await create(form);
        toast.success('Invoice created');
      }
      setShowForm(false);
      load(page);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this invoice?')) return;
    try { await del(id); toast.success('Deleted'); load(page); }
    catch { toast.error('Failed'); }
  };

  const f = (k) => ({ value: form[k] || '', onChange: e => setForm({ ...form, [k]: e.target.value }) });

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <select className="input-field w-40 text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <button onClick={openAdd} className="btn-gold flex items-center gap-2 ml-auto">
          <Plus className="w-4 h-4" /> New {isProforma ? 'Proforma' : 'Final'}
        </button>
      </div>

      {showForm && (
        <div className="card p-6 mb-4">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--ae-ink)' }}>
            {editing ? 'Edit' : 'New'} {isProforma ? 'Proforma' : 'Final'} Invoice
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <L required>Client</L>
              <select className="input-field" {...f('user_id')}>
                <option value="">Select client</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
              </select>
            </div>
            {!isProforma && <div><L>File Code</L><input className="input-field" {...f('file_code')} /></div>}
            <div><L required>Invoice Date</L><input type="date" className="input-field" {...f('invoice_date')} required /></div>
            <div><L>Due Date</L><input type="date" className="input-field" {...f('due_date')} /></div>
            {isProforma && <div><L>Sold To</L><input className="input-field" {...f('sold_to')} /></div>}
            {isProforma && <div><L>Consigned To</L><input className="input-field" {...f('consigned_to')} /></div>}
            {!isProforma && <div><L>Ship Name</L><input className="input-field" {...f('ship_name')} /></div>}
            {!isProforma && <div><L>ETD</L><input type="date" className="input-field" {...f('etd')} /></div>}
            {!isProforma && <div><L>ETA</L><input type="date" className="input-field" {...f('eta')} /></div>}
            <div><L required>Amount</L><input type="number" className="input-field" {...f('amount')} required /></div>
            {editing && (
              <>
                <div><L>Paid Amount</L><input type="number" className="input-field" {...f('paid_amount')} /></div>
                <div>
                  <L>Status</L>
                  <select className="input-field" {...f('status')}>
                    {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
              </>
            )}
            <div className="sm:col-span-2 lg:col-span-3"><L>Notes</L><textarea className="input-field" rows={2} {...f('notes')} /></div>
            <div className="sm:col-span-2 lg:col-span-3 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={submitting} className="btn-gold">{submitting ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12" style={{ color: 'var(--ae-ink-muted)' }}>Loading...</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase" style={{ borderBottom: '1px solid var(--ae-glass-border)', color: 'var(--ae-ink-faint)' }}>
                <th className="px-4 py-3 text-left">Invoice No</th>
                <th className="px-4 py-3 text-left">Client</th>
                {!isProforma && <th className="px-4 py-3 text-left">File Code</th>}
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.invoices.map(inv => (
                <tr key={inv.id} className="transition-colors hover:bg-black/[0.02]"
                  style={{ borderBottom: '1px solid var(--ae-glass-border)' }}>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--ae-red)' }}>{inv.invoice_no}</td>
                  <td className="px-4 py-3">
                    <p style={{ color: 'var(--ae-ink)' }}>{inv.user_name}</p>
                    <p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>{inv.user_email}</p>
                  </td>
                  {!isProforma && <td className="px-4 py-3" style={{ color: 'var(--ae-ink-muted)' }}>{inv.file_code || '—'}</td>}
                  <td className="px-4 py-3" style={{ color: 'var(--ae-ink-muted)' }}>{format(new Date(inv.invoice_date), 'dd MMM yyyy')}</td>
                  <td className="px-4 py-3 text-right font-semibold" style={{ color: 'var(--ae-ink)' }}>{Number(inv.amount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-green-600">{Number(inv.paid_amount).toLocaleString()}</td>
                  <td className="px-4 py-3">{statusBadge(inv.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEdit(inv)} className="transition-colors hover:opacity-70" style={{ color: 'var(--ae-ink-faint)' }}>
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(inv.id)} className="transition-colors hover:text-red-500" style={{ color: 'var(--ae-ink-faint)' }}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!data.invoices.length && (
                <tr>
                  <td colSpan={isProforma ? 7 : 8} className="text-center py-12" style={{ color: 'var(--ae-ink-faint)' }}>No invoices</td>
                </tr>
              )}
            </tbody>
          </table>
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
    </div>
  );
}

export default function AdminInvoices() {
  const [tab, setTab] = useState('proforma');

  return (
    <div data-theme="light" style={{ background: 'var(--ae-canvas)', minHeight: '100vh' }}>
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--ae-ink)' }}>Invoices</h1>
          <p className="mt-1" style={{ color: 'var(--ae-ink-muted)' }}>Manage proforma and final invoices</p>
        </div>

        <div className="flex gap-1 p-1 rounded-xl w-fit mb-6" style={{ background: 'var(--ae-glass-bg)' }}>
          {[['proforma', 'Proforma'], ['final', 'Final']].map(([val, label]) => (
            <button key={val} onClick={() => setTab(val)}
              className="px-5 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: tab === val ? '#b7102a' : 'transparent',
                color: tab === val ? '#fff' : 'var(--ae-ink-muted)',
              }}>
              {label}
            </button>
          ))}
        </div>

        <InvoiceTab key={tab} type={tab} />
      </div>
    </div>
  );
}
