import { useEffect, useState } from 'react'
import { getMyRemittances, addRemittance } from '../services/api'
import { Banknote, Plus, Upload, X } from 'lucide-react'
import Drawer from '../components/Drawer'
import toast from 'react-hot-toast'

const fmt = (n) => Number(n || 0).toLocaleString()
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export default function Remittances() {
  const [data, setData] = useState({ remittances: [], total_confirmed: 0, total_pending: 0 })
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ sender_name: '', deposit_amount: '', tt_date: '', remarks: '' })
  const [receipt, setReceipt] = useState(null)

  const load = () => {
    setLoading(true)
    getMyRemittances()
      .then(r => setData(r.data || {}))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.deposit_amount) return toast.error('Amount is required')
    setSubmitting(true)
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v) })
    if (receipt) fd.append('receipt', receipt)
    try {
      await addRemittance(fd)
      toast.success('Remittance submitted')
      setShowForm(false)
      setForm({ sender_name: '', deposit_amount: '', tt_date: '', remarks: '' })
      setReceipt(null)
      load()
    } catch {
      toast.error('Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  const remittances = data.remittances || []

  return (
    <>
      <div className="space-y-4 animate-slide-up">
        <div className="page-header">
          <div>
            <h1 className="page-title">Remittances</h1>
            <p className="page-subtitle">Payment submissions</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={15} /> New Payment
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="stat-card">
            <span className="stat-label">Total Confirmed</span>
            <p className="stat-value text-green">¥ {fmt(data.total_confirmed)}</p>
          </div>
          <div className="stat-card">
            <span className="stat-label">Total Pending</span>
            <p className="stat-value text-amber">{data.total_pending > 0 ? `¥ ${fmt(data.total_pending)}` : '—'}</p>
          </div>
        </div>

        <div className="card">
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-12 rounded" />)}</div>
          ) : remittances.length === 0 ? (
            <div className="py-16 text-center">
              <Banknote size={32} className="mx-auto text-grey-300 mb-3" />
              <p className="text-grey-500 text-sm">No remittances yet</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead><tr>
                  <th>Ref No.</th>
                  <th>Sender</th>
                  <th>Amount</th>
                  <th>TT Date</th>
                  <th>Status</th>
                  <th>Confirmed</th>
                </tr></thead>
                <tbody>
                  {remittances.map(r => (
                    <tr key={r.remittance_id}>
                      <td className="font-mono text-xs font-semibold">{r.ref_no}</td>
                      <td>{r.sender_name}</td>
                      <td className="font-mono font-semibold">¥ {fmt(r.deposit_amount)}</td>
                      <td>{fmtDate(r.tt_date)}</td>
                      <td>
                        <span className={`badge ${r.status === 'confirmed' ? 'badge-green' : 'badge-amber'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td>{r.confirmed_at ? fmtDate(r.confirmed_at) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Drawer open={showForm} onClose={() => setShowForm(false)} title="Submit Payment" width={440}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Sender Name</label>
            <input className="input" placeholder="Your name or company" value={form.sender_name}
              onChange={e => setForm(f => ({ ...f, sender_name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Amount (¥) *</label>
            <input className="input" type="number" placeholder="0" required value={form.deposit_amount}
              onChange={e => setForm(f => ({ ...f, deposit_amount: e.target.value }))} />
          </div>
          <div>
            <label className="label">TT Date</label>
            <input className="input" type="date" value={form.tt_date}
              onChange={e => setForm(f => ({ ...f, tt_date: e.target.value }))} />
          </div>
          <div>
            <label className="label">Remarks</label>
            <textarea className="input" rows={3} placeholder="Optional notes..." value={form.remarks}
              onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
          </div>
          <div>
            <label className="label">Receipt (optional)</label>
            {receipt ? (
              <div className="flex items-center gap-2 p-3 card">
                <Upload size={14} className="text-grey-400" />
                <span className="text-sm text-navy flex-1 truncate">{receipt.name}</span>
                <button type="button" onClick={() => setReceipt(null)} className="btn-icon w-6 h-6">
                  <X size={12} />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 p-3 card border-dashed cursor-pointer hover:border-red/50 transition-colors">
                <Upload size={14} className="text-grey-400" />
                <span className="text-sm text-grey-500">Upload receipt</span>
                <input type="file" className="hidden" accept="image/*,.pdf"
                  onChange={e => setReceipt(e.target.files?.[0] || null)} />
              </label>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary flex-1" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Payment'}
            </button>
          </div>
        </form>
      </Drawer>
    </>
  )
}
