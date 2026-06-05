import { useEffect, useState, useCallback } from 'react'
import {
  getAllProformaInvoices, getAllFinalInvoices,
  createProformaInvoice, updateProformaInvoice, deleteProformaInvoice,
  createFinalInvoice, updateFinalInvoice, deleteFinalInvoice,
  getAdminUsers,
} from '../../services/api'
import { FileText, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import Drawer from '../../components/Drawer'
import toast from 'react-hot-toast'

const fmt = (n) => Number(n || 0).toLocaleString()
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const toInput = (d) => d ? d.slice(0, 10) : ''

const STATUS_BADGE = { pending: 'badge-amber', partial: 'badge-blue', paid: 'badge-green', archived: 'badge-grey' }

const BLANK_PRO = { user_id: '', purchase_id: '', invoice_date: '', due_date: '', sold_to: '', consigned_to: '', amount: '', notes: '' }
const BLANK_FINAL = { user_id: '', purchase_id: '', shipping_id: '', invoice_date: '', due_date: '', amount: '', notes: '' }

function InvoiceTable({ list, loading, type, onOpen, onDelete, page, pages, onPage }) {
  return (
    <div className="card">
      {loading ? (
        <div className="p-6 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-12 rounded" />)}</div>
      ) : list.length === 0 ? (
        <div className="py-12 text-center">
          <FileText size={28} className="mx-auto text-grey-300 mb-2" />
          <p className="text-grey-500 text-sm">No {type} invoices</p>
        </div>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="table">
              <thead><tr>
                <th>Invoice No.</th>
                <th>User</th>
                <th>Date</th>
                <th>Due</th>
                <th>Amount</th>
                <th>Paid</th>
                <th>Status</th>
                <th></th>
              </tr></thead>
              <tbody>
                {list.map(inv => {
                  const id = type === 'proforma' ? inv.proforma_id : inv.final_invoice_id
                  return (
                    <tr key={id} onClick={() => onOpen(inv)} className="cursor-pointer">
                      <td className="font-mono text-xs font-semibold">{inv.invoice_no}</td>
                      <td>
                        <p className="font-medium">{inv.user_name}</p>
                        <p className="text-xs text-grey-400">{inv.user_email}</p>
                      </td>
                      <td>{fmtDate(inv.invoice_date)}</td>
                      <td>{fmtDate(inv.due_date)}</td>
                      <td className="font-mono">¥ {fmt(inv.amount)}</td>
                      <td className="font-mono text-green">¥ {fmt(inv.paid_amount)}</td>
                      <td><span className={`badge ${STATUS_BADGE[inv.status] || 'badge-grey'}`}>{inv.status}</span></td>
                      <td>
                        <button className="btn-icon text-grey-400 hover:text-red"
                          onClick={e => { e.stopPropagation(); onDelete(id) }}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="px-5 py-3 border-t border-grey-200 flex items-center justify-between">
              <p className="text-xs text-grey-500">Page {page} of {pages}</p>
              <div className="flex gap-2">
                <button className="btn btn-secondary btn-sm" onClick={() => onPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft size={14} />
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => onPage(p => Math.min(pages, p + 1))} disabled={page === pages}>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function AdminInvoices() {
  const [tab, setTab] = useState('proforma')
  const [proformas, setProformas] = useState([])
  const [proTotal, setProTotal] = useState(0)
  const [proPage, setProPage] = useState(1)
  const [proPages, setProPages] = useState(1)
  const [finals, setFinals] = useState([])
  const [finTotal, setFinTotal] = useState(0)
  const [finPage, setFinPage] = useState(1)
  const [finPages, setFinPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState(BLANK_PRO)
  const [users, setUsers] = useState([])
  const [submitting, setSubmitting] = useState(false)

  const loadProforma = useCallback((p) => {
    setLoading(true)
    getAllProformaInvoices({ page: p, limit: 15 })
      .then(r => { setProformas(r.data.invoices || []); setProTotal(r.data.total || 0); setProPages(r.data.pages || 1) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const loadFinal = useCallback((p) => {
    setLoading(true)
    getAllFinalInvoices({ page: p, limit: 15 })
      .then(r => { setFinals(r.data.invoices || []); setFinTotal(r.data.total || 0); setFinPages(r.data.pages || 1) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadProforma(proPage) }, [proPage, loadProforma])
  useEffect(() => { loadFinal(finPage) }, [finPage, loadFinal])
  useEffect(() => { getAdminUsers({ limit: 200 }).then(r => setUsers(r.data.users || [])).catch(() => {}) }, [])

  const openInv = (inv) => {
    setSelected(inv)
    setEditForm({
      invoice_date: toInput(inv.invoice_date),
      due_date: toInput(inv.due_date),
      amount: inv.amount,
      paid_amount: inv.paid_amount,
      status: inv.status,
      notes: inv.notes || '',
      ...(tab === 'proforma' ? { sold_to: inv.sold_to || '', consigned_to: inv.consigned_to || '' } : {}),
    })
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (tab === 'proforma') await updateProformaInvoice(selected.proforma_id, { ...editForm, amount: Number(editForm.amount), paid_amount: Number(editForm.paid_amount) })
      else await updateFinalInvoice(selected.final_invoice_id, { ...editForm, amount: Number(editForm.amount), paid_amount: Number(editForm.paid_amount) })
      toast.success('Updated')
      setSelected(null)
      tab === 'proforma' ? loadProforma(proPage) : loadFinal(finPage)
    } catch { toast.error('Failed') }
    finally { setSubmitting(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this invoice?')) return
    try {
      if (tab === 'proforma') await deleteProformaInvoice(id)
      else await deleteFinalInvoice(id)
      toast.success('Deleted')
      tab === 'proforma' ? loadProforma(proPage) : loadFinal(finPage)
    } catch { toast.error('Failed') }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = { ...createForm, user_id: Number(createForm.user_id), amount: Number(createForm.amount) }
      if (tab === 'proforma') await createProformaInvoice(payload)
      else await createFinalInvoice(payload)
      toast.success('Invoice created')
      setShowCreate(false)
      setCreateForm(tab === 'proforma' ? BLANK_PRO : BLANK_FINAL)
      tab === 'proforma' ? loadProforma(proPage) : loadFinal(finPage)
    } catch { toast.error('Failed') }
    finally { setSubmitting(false) }
  }

  const list = tab === 'proforma' ? proformas : finals

  return (
    <>
      <div className="space-y-4 animate-slide-up">
        <div className="page-header">
          <div>
            <h1 className="page-title">Invoices</h1>
            <p className="page-subtitle">{fmt(tab === 'proforma' ? proTotal : finTotal)} records</p>
          </div>
          <button className="btn btn-primary" onClick={() => { setShowCreate(true); setCreateForm(tab === 'proforma' ? BLANK_PRO : BLANK_FINAL) }}>
            <Plus size={15} /> New Invoice
          </button>
        </div>

        <div className="flex gap-1 bg-grey-100 p-1 rounded-lg w-fit">
          {['proforma', 'final'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded text-sm font-semibold transition-colors capitalize
                ${tab === t ? 'bg-white text-navy shadow-xs' : 'text-grey-500 hover:text-navy'}`}>
              {t} Invoices
            </button>
          ))}
        </div>

        <InvoiceTable
          list={list} loading={loading} type={tab}
          onOpen={openInv} onDelete={handleDelete}
          page={tab === 'proforma' ? proPage : finPage}
          pages={tab === 'proforma' ? proPages : finPages}
          onPage={tab === 'proforma' ? setProPage : setFinPage}
        />
      </div>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.invoice_no || 'Edit Invoice'} width={440}>
        {selected && editForm && (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Invoice Date</label>
                <input className="input" type="date" value={editForm.invoice_date}
                  onChange={e => setEditForm(f => ({ ...f, invoice_date: e.target.value }))} />
              </div>
              <div>
                <label className="label">Due Date</label>
                <input className="input" type="date" value={editForm.due_date}
                  onChange={e => setEditForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
            </div>
            {tab === 'proforma' && (
              <>
                <div>
                  <label className="label">Sold To</label>
                  <input className="input" value={editForm.sold_to}
                    onChange={e => setEditForm(f => ({ ...f, sold_to: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Consigned To</label>
                  <input className="input" value={editForm.consigned_to}
                    onChange={e => setEditForm(f => ({ ...f, consigned_to: e.target.value }))} />
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Amount (¥)</label>
                <input className="input" type="number" value={editForm.amount}
                  onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <label className="label">Paid (¥)</label>
                <input className="input" type="number" value={editForm.paid_amount}
                  onChange={e => setEditForm(f => ({ ...f, paid_amount: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea className="input" rows={2} value={editForm.notes}
                onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        )}
      </Drawer>

      <Drawer open={showCreate} onClose={() => setShowCreate(false)} title={`New ${tab === 'proforma' ? 'Proforma' : 'Final'} Invoice`} width={440}>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">User *</label>
            <select className="input" value={createForm.user_id}
              onChange={e => setCreateForm(f => ({ ...f, user_id: e.target.value }))} required>
              <option value="">Select user…</option>
              {users.map(u => <option key={u.user_id} value={u.user_id}>{u.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Invoice Date</label>
              <input className="input" type="date" value={createForm.invoice_date}
                onChange={e => setCreateForm(f => ({ ...f, invoice_date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Due Date</label>
              <input className="input" type="date" value={createForm.due_date}
                onChange={e => setCreateForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
          </div>
          {tab === 'proforma' && (
            <>
              <div>
                <label className="label">Sold To</label>
                <input className="input" value={createForm.sold_to}
                  onChange={e => setCreateForm(f => ({ ...f, sold_to: e.target.value }))} />
              </div>
              <div>
                <label className="label">Consigned To</label>
                <input className="input" value={createForm.consigned_to}
                  onChange={e => setCreateForm(f => ({ ...f, consigned_to: e.target.value }))} />
              </div>
            </>
          )}
          <div>
            <label className="label">Amount (¥) *</label>
            <input className="input" type="number" value={createForm.amount}
              onChange={e => setCreateForm(f => ({ ...f, amount: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={createForm.notes}
              onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary flex-1" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </Drawer>
    </>
  )
}
