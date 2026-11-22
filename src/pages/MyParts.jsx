import { useEffect, useState, useCallback } from 'react'
import { getMyParts, submitPart, exportMyParts } from '../services/api'
import { Package, Plus, Download } from 'lucide-react'
import Drawer from '../components/Drawer'
import toast from 'react-hot-toast'

const fmt = (n) => Number(n || 0).toLocaleString()
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const STATUS_BADGE = {
  pending: 'badge-amber',
  processing: 'badge-blue',
  ordered: 'badge-blue',
  shipped: 'badge-blue',
  delivered: 'badge-green',
  cancelled: 'badge-red',
}

export default function MyParts() {
  const [parts, setParts] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('current') // 'current' = not yet billed, 'history' = everything
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({
    part_name: '', part_description: '', chassis: '', delivered_to: '',
    platform_name: '', auction_id: '', quantity: '1',
  })

  const load = useCallback((t) => {
    setLoading(true)
    getMyParts({ page: 1, limit: 50, ...(t === 'current' ? { billed_to_client: 'false' } : {}) })
      .then(r => { setParts(r.data.parts || []); setTotal(r.data.total || 0) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(tab) }, [tab, load])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.part_name) return toast.error('Part Name is required')
    setSubmitting(true)
    try {
      await submitPart({ ...form, quantity: Number(form.quantity) || 1 })
      toast.success('Parts request submitted')
      setShowForm(false)
      setForm({ part_name: '', part_description: '', chassis: '', delivered_to: '', platform_name: '', auction_id: '', quantity: '1' })
      load(tab)
    } catch {
      toast.error('Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  const handleExport = async () => {
    try {
      const r = await exportMyParts()
      const url = URL.createObjectURL(new Blob([r.data]))
      const a = document.createElement('a')
      a.href = url; a.download = 'parts-orders.xlsx'; a.click()
    } catch { toast.error('Export failed') }
  }

  return (
    <>
      <div className="space-y-4 animate-slide-up">
        <div className="page-header">
          <div>
            <h1 className="page-title">Parts Orders</h1>
            <p className="page-subtitle">{total} orders</p>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={handleExport} disabled={parts.length === 0}>
              <Download size={15} /> Export
            </button>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              <Plus size={15} /> New Request
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button className={`btn btn-sm ${tab === 'current' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('current')}>
            Current Bill
          </button>
          <button className={`btn btn-sm ${tab === 'history' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('history')}>
            Full History
          </button>
        </div>

        <div className="card">
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-12 rounded" />)}</div>
          ) : parts.length === 0 ? (
            <div className="py-16 text-center">
              <Package size={32} className="mx-auto text-grey-300 mb-3" />
              <p className="text-grey-500 text-sm">
                {tab === 'current' ? 'Nothing currently billed' : 'No parts orders yet'}
              </p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead><tr>
                  <th>Part Name</th>
                  <th>Chassis</th>
                  <th>Platform</th>
                  <th>Qty</th>
                  <th>Bid Price</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr></thead>
                <tbody>
                  {parts.map(p => (
                    <tr key={p.parts_purchase_id} onClick={() => setSelected(p)} className="cursor-pointer">
                      <td className="font-semibold text-navy">{p.part_name}</td>
                      <td className="font-mono text-xs">{p.chassis || '—'}</td>
                      <td>{p.platform_name || '—'}</td>
                      <td>{p.quantity}</td>
                      <td className="font-mono font-semibold">{p.bid_price != null ? `¥ ${fmt(p.bid_price)}` : '—'}</td>
                      <td><span className={`badge ${STATUS_BADGE[p.status] || 'badge-grey'}`}>{p.status || 'pending'}</span></td>
                      <td>{fmtDate(p.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title="Parts Order Detail" width={420}>
        {selected && (
          <div className="card p-4 space-y-0">
            {[
              ['Part Name', selected.part_name],
              ['Description', selected.part_description || '—'],
              ['Chassis', selected.chassis || '—'],
              ['Delivered To', selected.delivered_to || '—'],
              ['Platform', selected.platform_name || '—'],
              ['Auction ID', selected.auction_id || '—'],
              ['Quantity', selected.quantity],
              ['Bid Price', selected.bid_price != null ? `¥ ${fmt(selected.bid_price)}` : '—'],
              ['Status', selected.status || 'pending'],
              ['Delivery Status', selected.delivery_status || 'pending'],
              ['Tracking No.', selected.tracking_no || '—'],
              ['Submitted', fmtDate(selected.created_at)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2 border-b border-grey-100 last:border-0">
                <span className="text-sm text-grey-600">{k}</span>
                <span className="text-sm font-medium text-navy">
                  {k === 'Status' || k === 'Delivery Status'
                    ? <span className={`badge ${STATUS_BADGE[v] || 'badge-grey'}`}>{v}</span>
                    : v}
                </span>
              </div>
            ))}
          </div>
        )}
      </Drawer>

      <Drawer open={showForm} onClose={() => setShowForm(false)} title="New Parts Request" width={440}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Part Name *</label>
              <input className="input" placeholder="e.g. Front bumper" value={form.part_name}
                onChange={e => setForm(f => ({ ...f, part_name: e.target.value }))} required />
            </div>
            <div className="col-span-2">
              <label className="label">Description</label>
              <input className="input" placeholder="e.g. Front bumper for Honda FIT" value={form.part_description}
                onChange={e => setForm(f => ({ ...f, part_description: e.target.value }))} />
            </div>
            <div>
              <label className="label">Chassis No.</label>
              <input className="input" placeholder="e.g. GP5-3010084" value={form.chassis}
                onChange={e => setForm(f => ({ ...f, chassis: e.target.value }))} />
            </div>
            <div>
              <label className="label">Delivered To</label>
              <input className="input" placeholder="e.g. Aichi yard" value={form.delivered_to}
                onChange={e => setForm(f => ({ ...f, delivered_to: e.target.value }))} />
            </div>
            <div>
              <label className="label">Platform</label>
              <input className="input" placeholder="e.g. Yahoo Auction" value={form.platform_name}
                onChange={e => setForm(f => ({ ...f, platform_name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Auction ID / Link</label>
              <input className="input" value={form.auction_id}
                onChange={e => setForm(f => ({ ...f, auction_id: e.target.value }))} />
            </div>
            <div>
              <label className="label">Quantity</label>
              <input className="input" type="number" min="1" value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary flex-1" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </form>
      </Drawer>
    </>
  )
}
