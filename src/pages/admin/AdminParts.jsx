import { useEffect, useState, useCallback } from 'react'
import { getAllParts, updatePart, exportAllParts } from '../../services/api'
import { Package, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import Drawer from '../../components/Drawer'
import toast from 'react-hot-toast'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const STATUS_BADGE = {
  pending: 'badge-amber',
  processing: 'badge-blue',
  shipped: 'badge-green',
  delivered: 'badge-green',
  cancelled: 'badge-red',
}

const STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']

export default function AdminParts() {
  const [parts, setParts] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [editStatus, setEditStatus] = useState('')
  const [tracking, setTracking] = useState('')
  const [updating, setUpdating] = useState(false)

  const load = useCallback((p) => {
    setLoading(true)
    getAllParts({ page: p, limit: 20 })
      .then(r => { setParts(r.data.parts || []); setTotal(r.data.total || 0); setPages(r.data.pages || 1) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(page) }, [page, load])

  const openPart = (p) => {
    setSelected(p)
    setEditStatus(p.status || 'pending')
    setTracking(p.tracking_number || '')
  }

  const handleUpdate = async () => {
    setUpdating(true)
    try {
      await updatePart(selected.part_id, { status: editStatus, tracking_number: tracking })
      toast.success('Updated')
      setSelected(null)
      load(page)
    } catch { toast.error('Failed') }
    finally { setUpdating(false) }
  }

  const handleExport = async () => {
    try {
      const r = await exportAllParts()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(new Blob([r.data]))
      a.download = 'parts-orders.xlsx'
      a.click()
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
          <button className="btn btn-secondary" onClick={handleExport} disabled={parts.length === 0}>
            <Download size={15} /> Export Excel
          </button>
        </div>

        <div className="card">
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-12 rounded" />)}</div>
          ) : parts.length === 0 ? (
            <div className="py-16 text-center">
              <Package size={32} className="mx-auto text-grey-300 mb-3" />
              <p className="text-grey-500 text-sm">No parts orders</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead><tr>
                  <th>Part Name</th>
                  <th>Part No.</th>
                  <th>Vehicle</th>
                  <th>User</th>
                  <th>Qty</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr></thead>
                <tbody>
                  {parts.map(p => (
                    <tr key={p.part_id} onClick={() => openPart(p)} className="cursor-pointer">
                      <td className="font-semibold text-navy">{p.part_name}</td>
                      <td className="font-mono text-xs">{p.part_number || '—'}</td>
                      <td>{p.year} {p.make} {p.model}</td>
                      <td>
                        <p className="font-medium">{p.user_name}</p>
                        <p className="text-xs text-grey-400">{p.user_country}</p>
                      </td>
                      <td>{p.quantity}</td>
                      <td><span className={`badge ${STATUS_BADGE[p.status] || 'badge-grey'}`}>{p.status || 'pending'}</span></td>
                      <td>{fmtDate(p.created_at)}</td>
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

      <Drawer open={!!selected} onClose={() => setSelected(null)} title="Parts Order" width={420}>
        {selected && (
          <div className="space-y-5">
            <div className="card p-4">
              {[
                ['Part Name', selected.part_name],
                ['Part Number', selected.part_number || '—'],
                ['Quantity', selected.quantity],
                ['Vehicle', `${selected.year || ''} ${selected.make || ''} ${selected.model || ''}`.trim() || '—'],
                ['Chassis No.', selected.chassis_no],
                ['User', selected.user_name],
                ['Submitted', fmtDate(selected.created_at)],
                ['Remarks', selected.remarks || '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-2 border-b border-grey-100 last:border-0">
                  <span className="text-sm text-grey-600">{k}</span>
                  <span className="text-sm font-medium text-navy">{v}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <div>
                <label className="label">Status</label>
                <select className="input" value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                  {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Tracking Number</label>
                <input className="input" value={tracking} onChange={e => setTracking(e.target.value)} placeholder="Optional tracking…" />
              </div>
              <button className="btn btn-primary w-full" onClick={handleUpdate} disabled={updating}>
                {updating ? 'Saving…' : 'Update Order'}
              </button>
            </div>
          </div>
        )}
      </Drawer>
    </>
  )
}
