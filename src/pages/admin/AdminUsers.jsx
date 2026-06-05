import { useEffect, useState, useCallback } from 'react'
import { getAdminUsers, createAdminUser, toggleUser, getUserLedger } from '../../services/api'
import { Users, Plus, ChevronLeft, ChevronRight, ToggleLeft, ToggleRight } from 'lucide-react'
import Drawer from '../../components/Drawer'
import toast from 'react-hot-toast'

const fmt = (n) => Number(n || 0).toLocaleString()
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const BLANK = { name: '', email: '', password: '', contact_number: '', country: '', city: '', role: 'user', type: 'ordinary' }

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [ledger, setLedger] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback((p) => {
    setLoading(true)
    getAdminUsers({ page: p, limit: 20 })
      .then(r => { setUsers(r.data.users || []); setTotal(r.data.total || 0); setPages(r.data.pages || 1) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(page) }, [page, load])

  const openUser = (u) => {
    setSelected(u)
    setLedger(null)
    getUserLedger(u.user_id)
      .then(r => setLedger(r.data?.ledger || []))
      .catch(() => setLedger([]))
  }

  const handleToggle = async (u, e) => {
    e.stopPropagation()
    try {
      await toggleUser(u.user_id)
      load(page)
      toast.success('Status updated')
    } catch { toast.error('Failed') }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await createAdminUser(form)
      toast.success('User created')
      setShowCreate(false)
      setForm(BLANK)
      load(page)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setSubmitting(false) }
  }

  const balance = ledger?.length ? ledger[ledger.length - 1].balance : null

  return (
    <>
      <div className="space-y-4 animate-slide-up">
        <div className="page-header">
          <div>
            <h1 className="page-title">Users</h1>
            <p className="page-subtitle">{fmt(total)} registered</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={15} /> New User
          </button>
        </div>

        <div className="card">
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-12 rounded" />)}</div>
          ) : users.length === 0 ? (
            <div className="py-16 text-center">
              <Users size={32} className="mx-auto text-grey-300 mb-3" />
              <p className="text-grey-500 text-sm">No users found</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead><tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Country</th>
                  <th>Type</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th></th>
                </tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.user_id} onClick={() => openUser(u)} className="cursor-pointer">
                      <td className="font-semibold text-navy">{u.name}</td>
                      <td className="text-grey-500">{u.email}</td>
                      <td>{u.country || '—'}</td>
                      <td className="capitalize">{u.type}</td>
                      <td>{fmtDate(u.created_at)}</td>
                      <td>
                        <span className={`badge ${u.status === 'active' ? 'badge-green' : 'badge-red'}`}>{u.status}</span>
                      </td>
                      <td>
                        <button className="btn-icon" onClick={(e) => handleToggle(u, e)} title="Toggle status">
                          {u.status === 'active'
                            ? <ToggleRight size={18} className="text-green" />
                            : <ToggleLeft size={18} className="text-grey-400" />}
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

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.name || ''} subtitle={selected?.email} width={480}>
        {selected && (
          <div className="space-y-5">
            <div className="card p-4">
              {[
                ['Role', selected.role],
                ['Type', selected.type],
                ['Status', selected.status],
                ['Phone', selected.contact_number || '—'],
                ['Country', selected.country || '—'],
                ['City', selected.city || '—'],
                ['Joined', fmtDate(selected.created_at)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-2 border-b border-grey-100 last:border-0">
                  <span className="text-sm text-grey-600">{k}</span>
                  <span className="text-sm font-medium capitalize">
                    {k === 'Status'
                      ? <span className={`badge ${v === 'active' ? 'badge-green' : 'badge-red'}`}>{v}</span>
                      : v}
                  </span>
                </div>
              ))}
            </div>

            {balance !== null && (
              <div className="stat-card">
                <span className="stat-label">Account Balance</span>
                <p className={`stat-value ${balance >= 0 ? 'text-green' : 'text-red'}`}>¥ {fmt(Math.abs(balance))}</p>
                <p className="text-xs text-grey-500">{balance >= 0 ? 'Credit' : 'Outstanding'}</p>
              </div>
            )}

            {ledger && ledger.length > 0 && (
              <div>
                <p className="label">Recent Transactions</p>
                <div className="card divide-y divide-grey-100">
                  {ledger.slice(-5).reverse().map((e, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-navy truncate">{e.description}</p>
                        <p className="text-xs text-grey-400">{fmtDate(e.entry_date)} · {e.ref}</p>
                      </div>
                      <span className={`text-sm font-mono font-semibold ${e.credit > 0 ? 'text-green' : 'text-red'}`}>
                        {e.credit > 0 ? '+' : '-'}¥ {fmt(e.credit || e.debit)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>

      <Drawer open={showCreate} onClose={() => setShowCreate(false)} title="New User" width={440}>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Full Name *</label>
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Email *</label>
            <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Password *</label>
            <input className="input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Role</label>
              <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="ordinary">Ordinary</option>
                <option value="dealer">Dealer</option>
                <option value="agent">Agent</option>
              </select>
            </div>
            <div>
              <label className="label">Country</label>
              <input className="input" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />
            </div>
            <div>
              <label className="label">City</label>
              <input className="input" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Contact Number</label>
            <input className="input" value={form.contact_number} onChange={e => setForm(f => ({ ...f, contact_number: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary flex-1" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </form>
      </Drawer>
    </>
  )
}
