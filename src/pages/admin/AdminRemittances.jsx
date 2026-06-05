import { useEffect, useState, useCallback } from 'react'
import { getAllRemittances, confirmRemittance, deleteRemittance, adminCreateRemittance, getAdminUsers } from '../../services/api'
import { Banknote, Plus, ChevronLeft, ChevronRight, Check, Trash2 } from 'lucide-react'
import Drawer from '../../components/Drawer'
import toast from 'react-hot-toast'

const fmt = (n) => Number(n || 0).toLocaleString()
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const BLANK_CREATE = { user_id: '', sender_name: '', deposit_amount: '', tt_date: '', remarks: '', status: 'confirmed' }

export default function AdminRemittances() {
  const [remittances, setRemittances] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [confirmAmt, setConfirmAmt] = useState('')
  const [confirmNote, setConfirmNote] = useState('')
  const [updating, setUpdating] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState(BLANK_CREATE)
  const [users, setUsers] = useState([])
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback((p, f) => {
    setLoading(true)
    getAllRemittances({ page: p, limit: 20, ...(f !== 'all' ? { status: f } : {}) })
      .then(r => { setRemittances(r.data.remittances || []); setTotal(r.data.total || 0); setPages(r.data.pages || 1) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(page, filter) }, [page, filter, load])

  useEffect(() => {
    getAdminUsers({ limit: 200 }).then(r => setUsers(r.data.users || [])).catch(() => {})
  }, [])

  const changeFilter = (f) => { setFilter(f); setPage(1) }

  const openRemittance = (r) => {
    setSelected(r)
    setConfirmAmt(r.deposit_amount)
    setConfirmNote('')
  }

  const handleConfirm = async () => {
    setUpdating(true)
    try {
      await confirmRemittance(selected.remittance_id, { deposit_amount: Number(confirmAmt), remarks: confirmNote })
      toast.success('Remittance confirmed')
      setSelected(null)
      load(page, filter)
    } catch { toast.error('Failed') }
    finally { setUpdating(false) }
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Delete this remittance?')) return
    try {
      await deleteRemittance(id)
      toast.success('Deleted')
      load(page, filter)
    } catch { toast.error('Failed') }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await adminCreateRemittance({ ...createForm, user_id: Number(createForm.user_id), deposit_amount: Number(createForm.deposit_amount) })
      toast.success('Remittance created')
      setShowCreate(false)
      setCreateForm(BLANK_CREATE)
      load(page, filter)
    } catch { toast.error('Failed') }
    finally { setSubmitting(false) }
  }

  return (
    <>
      <div className="space-y-4 animate-slide-up">
        <div className="page-header">
          <div>
            <h1 className="page-title">Remittances</h1>
            <p className="page-subtitle">{fmt(total)} records</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={15} /> Create
          </button>
        </div>

        <div className="flex gap-2">
          {['all', 'pending', 'confirmed'].map(f => (
            <button key={f} onClick={() => changeFilter(f)}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors capitalize
                ${filter === f ? 'bg-navy text-white' : 'bg-white border border-grey-200 text-grey-600 hover:border-grey-400'}`}>
              {f}
            </button>
          ))}
        </div>

        <div className="card">
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-12 rounded" />)}</div>
          ) : remittances.length === 0 ? (
            <div className="py-16 text-center">
              <Banknote size={32} className="mx-auto text-grey-300 mb-3" />
              <p className="text-grey-500 text-sm">No remittances found</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead><tr>
                  <th>Ref No.</th>
                  <th>User</th>
                  <th>Sender</th>
                  <th>Amount</th>
                  <th>TT Date</th>
                  <th>Status</th>
                  <th></th>
                </tr></thead>
                <tbody>
                  {remittances.map(r => (
                    <tr key={r.remittance_id} onClick={() => openRemittance(r)} className="cursor-pointer">
                      <td className="font-mono text-xs font-semibold">{r.ref_no}</td>
                      <td>
                        <p className="font-medium">{r.user_name}</p>
                        <p className="text-xs text-grey-400">{r.user_email}</p>
                      </td>
                      <td>{r.sender_name}</td>
                      <td className="font-mono font-semibold">¥ {fmt(r.deposit_amount)}</td>
                      <td>{fmtDate(r.tt_date)}</td>
                      <td>
                        <span className={`badge ${r.status === 'confirmed' ? 'badge-green' : 'badge-amber'}`}>{r.status}</span>
                      </td>
                      <td>
                        <button className="btn-icon text-grey-400 hover:text-red" onClick={(e) => handleDelete(r.remittance_id, e)}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pages > 1 && (
            <div className="px-5 py-3 border-t border-grey-200 flex items-center justify-between">
              <p className="text-xs text-grey-500">Page {page} of {pages}</p>
              <div className="flex gap-2">
                <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft size={14} />
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.ref_no || 'Remittance'} subtitle={selected?.user_name} width={420}>
        {selected && (
          <div className="space-y-5">
            <div className="card p-4">
              {[
                ['Ref No.', selected.ref_no],
                ['User', selected.user_name],
                ['Sender', selected.sender_name],
                ['Amount', `¥ ${fmt(selected.deposit_amount)}`],
                ['TT Date', fmtDate(selected.tt_date)],
                ['Status', selected.status],
                ['Remarks', selected.remarks || '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-2 border-b border-grey-100 last:border-0">
                  <span className="text-sm text-grey-600">{k}</span>
                  <span className="text-sm font-medium text-navy">
                    {k === 'Status'
                      ? <span className={`badge ${v === 'confirmed' ? 'badge-green' : 'badge-amber'}`}>{v}</span>
                      : v}
                  </span>
                </div>
              ))}
            </div>

            {selected.status === 'pending' && (
              <div className="space-y-3">
                <p className="label">Confirm Payment</p>
                <div>
                  <label className="label">Confirmed Amount (¥)</label>
                  <input className="input" type="number" value={confirmAmt}
                    onChange={e => setConfirmAmt(e.target.value)} />
                </div>
                <div>
                  <label className="label">Remarks</label>
                  <textarea className="input" rows={2} value={confirmNote}
                    onChange={e => setConfirmNote(e.target.value)} placeholder="Optional note…" />
                </div>
                <button className="btn btn-primary w-full" onClick={handleConfirm} disabled={updating}>
                  <Check size={14} /> {updating ? 'Confirming…' : 'Confirm Payment'}
                </button>
              </div>
            )}
          </div>
        )}
      </Drawer>

      <Drawer open={showCreate} onClose={() => setShowCreate(false)} title="Create Remittance" width={440}>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">User *</label>
            <select className="input" value={createForm.user_id} onChange={e => setCreateForm(f => ({ ...f, user_id: e.target.value }))} required>
              <option value="">Select user…</option>
              {users.map(u => <option key={u.user_id} value={u.user_id}>{u.name} ({u.email})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Sender Name</label>
            <input className="input" value={createForm.sender_name}
              onChange={e => setCreateForm(f => ({ ...f, sender_name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Amount (¥) *</label>
            <input className="input" type="number" value={createForm.deposit_amount}
              onChange={e => setCreateForm(f => ({ ...f, deposit_amount: e.target.value }))} required />
          </div>
          <div>
            <label className="label">TT Date</label>
            <input className="input" type="date" value={createForm.tt_date}
              onChange={e => setCreateForm(f => ({ ...f, tt_date: e.target.value }))} />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={createForm.status} onChange={e => setCreateForm(f => ({ ...f, status: e.target.value }))}>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div>
            <label className="label">Remarks</label>
            <textarea className="input" rows={2} value={createForm.remarks}
              onChange={e => setCreateForm(f => ({ ...f, remarks: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary flex-1" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </Drawer>
    </>
  )
}
