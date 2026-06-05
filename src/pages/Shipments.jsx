import { useEffect, useState, useCallback } from 'react'
import { getMyShipments, resolveImageUrl } from '../services/api'
import { Ship, ChevronLeft, ChevronRight, FileText, ExternalLink } from 'lucide-react'
import Drawer from '../components/Drawer'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const BL_BADGE = { pending: 'badge-amber', issued: 'badge-green', requested: 'badge-blue' }

export default function Shipments() {
  const [shipments, setShipments] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  const load = useCallback((p) => {
    setLoading(true)
    getMyShipments({ page: p, limit: 15 })
      .then(r => {
        setShipments(r.data.shipments || [])
        setTotal(r.data.total || 0)
        setPages(r.data.pages || 1)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(page) }, [page, load])

  return (
    <>
      <div className="space-y-4 animate-slide-up">
        <div className="page-header">
          <div>
            <h1 className="page-title">Shipments</h1>
            <p className="page-subtitle">{total} shipments</p>
          </div>
        </div>

        <div className="card">
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-16 rounded" />)}</div>
          ) : shipments.length === 0 ? (
            <div className="py-16 text-center">
              <Ship size={32} className="mx-auto text-grey-300 mb-3" />
              <p className="text-grey-500 text-sm">No shipments found</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead><tr>
                  <th>Vehicle</th>
                  <th>Ship</th>
                  <th>Route</th>
                  <th>ETD</th>
                  <th>ETA</th>
                  <th>BL Status</th>
                </tr></thead>
                <tbody>
                  {shipments.map(s => (
                    <tr key={s.shipping_id} onClick={() => setSelected(s)} className="cursor-pointer">
                      <td>
                        <div className="flex items-center gap-3">
                          {s.car_image ? (
                            <img src={resolveImageUrl(s.car_image)} className="w-12 h-9 object-cover rounded flex-shrink-0" alt="" />
                          ) : (
                            <div className="w-12 h-9 bg-grey-100 rounded flex-shrink-0 flex items-center justify-center">
                              <Ship size={13} className="text-grey-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-navy">{s.year} {s.make} {s.model}</p>
                            <p className="text-xs text-grey-400">{s.chassis_no}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <p className="font-medium text-navy">{s.ship_name || '—'}</p>
                        <p className="text-xs text-grey-400">{s.shipping_company}</p>
                      </td>
                      <td className="text-sm">{s.route || '—'}</td>
                      <td>{fmtDate(s.etd)}</td>
                      <td>{fmtDate(s.eta)}</td>
                      <td>
                        <span className={`badge ${BL_BADGE[s.bl_status] || 'badge-grey'}`}>
                          {s.bl_status || 'pending'}
                        </span>
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

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.year} ${selected.make} ${selected.model}` : ''}
        subtitle={selected?.chassis_no}
        width={460}
      >
        {selected && (
          <div className="space-y-5">
            {selected.car_image && (
              <img src={resolveImageUrl(selected.car_image)} className="w-full h-44 object-cover rounded-lg" alt="" />
            )}
            <div>
              <p className="label">Shipping Info</p>
              <div className="card p-3">
                {[
                  ['Shipping Company', selected.shipping_company || '—'],
                  ['Ship Name', selected.ship_name || '—'],
                  ['Route', selected.route || '—'],
                  ['Port of Loading', selected.port_of_loading || '—'],
                  ['Port of Discharge', selected.port_of_discharge || '—'],
                  ['ETD', fmtDate(selected.etd)],
                  ['ETA', fmtDate(selected.eta)],
                  ['BL Status', selected.bl_status || 'pending'],
                  ['Inspection', selected.result_of_inspection || '—'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-1.5 border-b border-grey-100 last:border-0">
                    <span className="text-sm text-grey-600">{k}</span>
                    <span className="text-sm font-medium text-navy">
                      {k === 'BL Status'
                        ? <span className={`badge ${BL_BADGE[v] || 'badge-grey'}`}>{v}</span>
                        : v}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="label">Vehicle</p>
              <div className="card p-3">
                {[
                  ['Chassis No.', selected.chassis_no],
                  ['Lot No.', selected.lot_no || '—'],
                  ['File Code', selected.file_code_no || '—'],
                  ['Destination', selected.destination || '—'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-1.5 border-b border-grey-100 last:border-0">
                    <span className="text-sm text-grey-600">{k}</span>
                    <span className="text-sm font-medium text-navy">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </>
  )
}
