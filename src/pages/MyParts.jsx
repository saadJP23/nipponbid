import { useEffect, useState } from 'react'
import { getMyParts, submitPart, exportMyParts } from '../services/api'
import { Package, Plus, Download } from 'lucide-react'
import Drawer from '../components/Drawer'
import toast from 'react-hot-toast'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const STATUS_BADGE = {
  pending: 'badge-amber',
  processing: 'badge-blue',
  shipped: 'badge-green',
  delivered: 'badge-green',
  cancelled: 'badge-red',
}

export default function MyParts() {
  const [parts, setParts] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({
    chassis_no: '', make: '', model: '', year: '', part_name: '',
    part_number: '', quantity: '1', remarks: '',
  })

  const load = () => {
    setLoading(true)
    getMyParts({ page: 1, limit: 50 })
      .then(r => { setParts(r.data.parts || []); setTotal(r.data.total || 0) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.chassis_no || !form.part_name) return toast.error('Chassis No. and Part Name are required')
    setSubmitting(true)
    try {
      await submitPart({ ...form, quantity: Number(form.quantity) || 1 })
      toast.success('Parts order submitted')
      setShowForm(false)
      setForm({ chassis_no: '', make: '', model: '', year: '', part_name: '', part_number: '', quantity: '1', remarks: '' })
      load()
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
              <Plus size={15} /> New Order
            </button>
          </div>
        </div>

        <div className="card">
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-12 rounded" />)}</div>
          ) : parts.length === 0 ? (
            <div className="py-16 text-center">
              <Package size={32} className="mx-auto text-grey-300 mb-3" />
              <p className="text-grey-500 text-sm">No parts orders yet</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead><tr>
                  <th>Part Name</th>
                  <th>Part No.</th>
                  <th>Vehicle</th>
                  <th>Chassis No.</th>
                  <th>Qty</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr></thead>
                <tbody>
                  {parts.map(p => (
                    <tr key={p.part_id} onClick={() => setSelected(p)} className="cursor-pointer">
                      <td className="font-semibold text-navy">{p.part_name}</td>
                      <td className="font-mono text-xs">{p.part_number || '—'}</td>
                      <td>{p.year} {p.make} {p.model}</td>
                      <td className="font-mono text-xs">{p.chassis_no}</td>
                      <td>{p.quantity}</td>
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
              ['Part Number', selected.part_number || '—'],
              ['Quantity', selected.quantity],
              ['Make / Model', `${selected.year || ''} ${selected.make || ''} ${selected.model || ''}`.trim() || '—'],
              ['Chassis No.', selected.chassis_no],
              ['Status', selected.status || 'pending'],
              ['Submitted', fmtDate(selected.created_at)],
              ['Remarks', selected.remarks || '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2 border-b border-grey-100 last:border-0">
                <span className="text-sm text-grey-600">{k}</span>
                <span className="text-sm font-medium text-navy">
                  {k === 'Status'
                    ? <span className={`badge ${STATUS_BADGE[v] || 'badge-grey'}`}>{v}</span>
                    : v}
                </span>
              </div>
            ))}
          </div>
        )}
      </Drawer>

      <Drawer open={showForm} onClose={() => setShowForm(false)} title="New Parts Order" width={440}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Chassis No. *</label>
              <input className="input" placeholder="e.g. GP5-3010084" value={form.chassis_no}
                onChange={e => setForm(f => ({ ...f, chassis_no: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Make</label>
              <input className="input" placeholder="Toyota" value={form.make}
                onChange={e => setForm(f => ({ ...f, make: e.target.value }))} />
            </div>
            <div>
              <label className="label">Model</label>
              <input className="input" placeholder="FIT" value={form.model}
                onChange={e => setForm(f => ({ ...f, model: e.target.value }))} />
            </div>
            <div>
              <label className="label">Year</label>
              <input className="input" placeholder="2013" value={form.year}
                onChange={e => setForm(f => ({ ...f, year: e.target.value }))} />
            </div>
            <div>
              <label className="label">Quantity</label>
              <input className="input" type="number" min="1" value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Part Name *</label>
              <input className="input" placeholder="e.g. Front bumper" value={form.part_name}
                onChange={e => setForm(f => ({ ...f, part_name: e.target.value }))} required />
            </div>
            <div className="col-span-2">
              <label className="label">Part Number</label>
              <input className="input" placeholder="Optional OEM number" value={form.part_number}
                onChange={e => setForm(f => ({ ...f, part_number: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Remarks</label>
              <textarea className="input" rows={3} placeholder="Additional notes..." value={form.remarks}
                onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary flex-1" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Order'}
            </button>
          </div>
        </form>
      </Drawer>
    </>
  )
}
