import { useEffect, useState, useCallback } from 'react'
import { getAllBids, updateBid, resolveImageUrl } from '../../services/api'
import { Gavel, ChevronLeft, ChevronRight } from 'lucide-react'
import Drawer from '../../components/Drawer'
import toast from 'react-hot-toast'

const fmt = (n) => Number(n || 0).toLocaleString()
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const STATUS_BADGE = { pending: 'badge-amber', approved: 'badge-green', won: 'badge-green', rejected: 'badge-red', lost: 'badge-red' }
const FILTERS = ['all', 'pending', 'approved', 'won', 'rejected', 'lost']

export default function AdminBids() {
  const [bids, setBids] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [filter, setFilter] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [note, setNote] = useState('')
  const [updating, setUpdating] = useState(false)

  const load = useCallback((p, f) => {
    setLoading(true)
    getAllBids({ page: p, limit: 20, ...(f !== 'all' ? { status: f } : {}) })
      .then(r => { setBids(r.data.bids || []); setTotal(r.data.total || 0); setPages(r.data.pages || 1) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(page, filter) }, [page, filter, load])

  const changeFilter = (f) => { setFilter(f); setPage(1) }

  const openBid = (b) => { setSelected(b); setNote(b.admin_note || '') }

  const handleUpdate = async (status) => {
    setUpdating(true)
    try {
      await updateBid(selected.bid_id, { status, admin_note: note })
      toast.success(`Bid ${status}`)
      setSelected(null)
      load(page, filter)
    } catch { toast.error('Failed') }
    finally { setUpdating(false) }
  }

  return (
    <>
      <div className="space-y-4 animate-slide-up">
        <div className="page-header">
          <div>
            <h1 className="page-title">Bids</h1>
            <p className="page-subtitle">{fmt(total)} bids</p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(f => (
            <button key={f} onClick={() => changeFilter(f)}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors capitalize
                ${filter === f ? 'bg-navy text-white' : 'bg-white border border-grey-200 text-grey-600 hover:border-grey-400'}`}>
              {f}
            </button>
          ))}
        </div>

        <div className="card">
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-16 rounded" />)}</div>
          ) : bids.length === 0 ? (
            <div className="py-16 text-center">
              <Gavel size={32} className="mx-auto text-grey-300 mb-3" />
              <p className="text-grey-500 text-sm">No bids found</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead><tr>
                  <th>Vehicle</th>
                  <th>User</th>
                  <th>Auction</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr></thead>
                <tbody>
                  {bids.map(b => (
                    <tr key={b.bid_id} onClick={() => openBid(b)} className="cursor-pointer">
                      <td>
                        <div className="flex items-center gap-3">
                          {b.car_image ? (
                            <img src={resolveImageUrl(b.car_image)} className="w-12 h-9 object-cover rounded flex-shrink-0" alt="" />
                          ) : (
                            <div className="w-12 h-9 bg-grey-100 rounded flex-shrink-0" />
                          )}
                          <div>
                            <p className="font-semibold text-navy">{b.year} {b.make} {b.model}</p>
                            <p className="text-xs text-grey-400">{b.chassis_no}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <p className="font-medium">{b.user_name}</p>
                        <p className="text-xs text-grey-400">{b.user_country}</p>
                      </td>
                      <td>
                        <p>{b.auction_name}</p>
                        <p className="text-xs text-grey-400">{fmtDate(b.auction_date)}</p>
                      </td>
                      <td className="font-mono font-semibold">¥ {fmt(b.amount)}</td>
                      <td><span className={`badge ${STATUS_BADGE[b.status] || 'badge-grey'}`}>{b.status}</span></td>
                      <td>{fmtDate(b.created_at)}</td>
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

      <Drawer open={!!selected} onClose={() => setSelected(null)} title="Bid Detail" width={440}>
        {selected && (
          <div className="space-y-5">
            {selected.car_image && (
              <img src={resolveImageUrl(selected.car_image)} className="w-full h-44 object-cover rounded-lg" alt="" />
            )}
            <div className="card p-4">
              {[
                ['User', selected.user_name],
                ['Country', selected.user_country],
                ['Vehicle', `${selected.year} ${selected.make} ${selected.model}`],
                ['Chassis No.', selected.chassis_no],
                ['Auction', selected.auction_name],
                ['Date', fmtDate(selected.auction_date)],
                ['Amount', `¥ ${fmt(selected.amount)}`],
                ['Status', selected.status],
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

            {selected.status === 'pending' && (
              <div className="space-y-3">
                <div>
                  <label className="label">Admin Note (optional)</label>
                  <textarea className="input" rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Reason for approval/rejection…" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button className="btn btn-danger" onClick={() => handleUpdate('rejected')} disabled={updating}>Reject</button>
                  <button className="btn btn-primary" onClick={() => handleUpdate('approved')} disabled={updating}>Approve</button>
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </>
  )
}
