import { useEffect, useState, useCallback } from 'react'
import { getAllShipments, createShipment, updateShipment, uploadShipmentDoc, resolveImageUrl } from '../../services/api'
import { Ship, Plus, ChevronLeft, ChevronRight, Upload } from 'lucide-react'
import Drawer from '../../components/Drawer'
import toast from 'react-hot-toast'
import { toDateInputValue } from '../../utils/dates'

const fmt = (n) => Number(n || 0).toLocaleString()
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const BL_BADGE = { pending: 'badge-amber', issued: 'badge-green', requested: 'badge-blue' }

const BLANK = {
  purchase_id: '', shipping_company: '', ship_name: '', route: '',
  etd: '', eta: '', port_of_loading: '', port_of_discharge: '',
  result_of_inspection: '', bl_status: 'pending',
}

export default function AdminShipments() {
  const [shipments, setShipments] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState(BLANK)
  const [submitting, setSubmitting] = useState(false)
  const [docFile, setDocFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  const load = useCallback((p) => {
    setLoading(true)
    getAllShipments({ page: p, limit: 15 })
      .then(r => { setShipments(r.data.shipments || []); setTotal(r.data.total || 0); setPages(r.data.pages || 1) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(page) }, [page, load])

  const openShipment = (s) => {
    setSelected(s)
    setEditForm({
      shipping_company: s.shipping_company || '',
      ship_name: s.ship_name || '',
      route: s.route || '',
      etd: toDateInputValue(s.etd),
      eta: toDateInputValue(s.eta),
      port_of_loading: s.port_of_loading || '',
      port_of_discharge: s.port_of_discharge || '',
      result_of_inspection: s.result_of_inspection || '',
      bl_status: s.bl_status || 'pending',
    })
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await updateShipment(selected.shipping_id, editForm)
      toast.success('Updated')
      setSelected(null)
      load(page)
    } catch { toast.error('Failed') }
    finally { setSubmitting(false) }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await createShipment({ ...createForm, purchase_id: Number(createForm.purchase_id) })
      toast.success('Shipment created')
      setShowCreate(false)
      setCreateForm(BLANK)
      load(page)
    } catch { toast.error('Failed') }
    finally { setSubmitting(false) }
  }

  const handleUploadDoc = async () => {
    if (!docFile) return toast.error('Select a file')
    setUploading(true)
    const fd = new FormData()
    fd.append('document', docFile)
    try {
      await uploadShipmentDoc(selected.shipping_id, fd)
      toast.success('Document uploaded')
      setDocFile(null)
    } catch { toast.error('Upload failed') }
    finally { setUploading(false) }
  }

  return (
    <>
      <div className="space-y-4 animate-slide-up">
        <div className="page-header">
          <div>
            <h1 className="page-title">Shipments</h1>
            <p className="page-subtitle">{fmt(total)} records</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={15} /> New Shipment
          </button>
        </div>

        <div className="card">
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-16 rounded" />)}</div>
          ) : shipments.length === 0 ? (
            <div className="py-16 text-center">
              <Ship size={32} className="mx-auto text-grey-300 mb-3" />
              <p className="text-grey-500 text-sm">No shipments</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead><tr>
                  <th>Vehicle</th>
                  <th>User</th>
                  <th>Ship</th>
                  <th>Route</th>
                  <th>ETD</th>
                  <th>ETA</th>
                  <th>BL</th>
                </tr></thead>
                <tbody>
                  {shipments.map(s => (
                    <tr key={s.shipping_id} onClick={() => openShipment(s)} className="cursor-pointer">
                      <td>
                        <div className="flex items-center gap-3">
                          {s.car_image ? (
                            <img src={resolveImageUrl(s.car_image)} className="w-12 h-9 object-cover rounded flex-shrink-0" alt="" />
                          ) : (
                            <div className="w-12 h-9 bg-grey-100 rounded flex-shrink-0" />
                          )}
                          <div>
                            <p className="font-semibold text-navy">{s.year} {s.make} {s.model}</p>
                            <p className="text-xs text-grey-400">{s.chassis_no}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <p className="font-medium">{s.user_name}</p>
                        <p className="text-xs text-grey-400">{s.user_country}</p>
                      </td>
                      <td>
                        <p>{s.ship_name || '—'}</p>
                        <p className="text-xs text-grey-400">{s.shipping_company}</p>
                      </td>
                      <td>{s.route || '—'}</td>
                      <td>{fmtDate(s.etd)}</td>
                      <td>{fmtDate(s.eta)}</td>
                      <td><span className={`badge ${BL_BADGE[s.bl_status] || 'badge-grey'}`}>{s.bl_status || 'pending'}</span></td>
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

      <Drawer open={!!selected} onClose={() => setSelected(null)}
        title={selected ? `${selected.year} ${selected.make} ${selected.model}` : ''}
        subtitle={selected?.chassis_no} width={480}>
        {selected && editForm && (
          <div className="space-y-5">
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Shipping Company</label>
                  <input className="input" value={editForm.shipping_company}
                    onChange={e => setEditForm(f => ({ ...f, shipping_company: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Ship Name</label>
                  <input className="input" value={editForm.ship_name}
                    onChange={e => setEditForm(f => ({ ...f, ship_name: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="label">Route</label>
                  <input className="input" value={editForm.route}
                    onChange={e => setEditForm(f => ({ ...f, route: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Port of Loading</label>
                  <input className="input" value={editForm.port_of_loading}
                    onChange={e => setEditForm(f => ({ ...f, port_of_loading: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Port of Discharge</label>
                  <input className="input" value={editForm.port_of_discharge}
                    onChange={e => setEditForm(f => ({ ...f, port_of_discharge: e.target.value }))} />
                </div>
                <div>
                  <label className="label">ETD</label>
                  <input className="input" type="date" value={editForm.etd}
                    onChange={e => setEditForm(f => ({ ...f, etd: e.target.value }))} />
                </div>
                <div>
                  <label className="label">ETA</label>
                  <input className="input" type="date" value={editForm.eta}
                    onChange={e => setEditForm(f => ({ ...f, eta: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="label">Inspection Result</label>
                  <input className="input" value={editForm.result_of_inspection}
                    onChange={e => setEditForm(f => ({ ...f, result_of_inspection: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="label">BL Status</label>
                  <select className="input" value={editForm.bl_status}
                    onChange={e => setEditForm(f => ({ ...f, bl_status: e.target.value }))}>
                    <option value="pending">Pending</option>
                    <option value="requested">Requested</option>
                    <option value="issued">Issued</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
                {submitting ? 'Saving…' : 'Save Changes'}
              </button>
            </form>

            <div className="border-t border-grey-200 pt-4 space-y-3">
              <p className="label">Upload Document</p>
              <input type="file" className="input text-sm" onChange={e => setDocFile(e.target.files?.[0] || null)} />
              <button className="btn btn-secondary btn-sm" onClick={handleUploadDoc} disabled={uploading}>
                <Upload size={13} /> {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </div>
          </div>
        )}
      </Drawer>

      <Drawer open={showCreate} onClose={() => setShowCreate(false)} title="New Shipment" width={440}>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Purchase ID *</label>
            <input className="input" type="number" value={createForm.purchase_id}
              onChange={e => setCreateForm(f => ({ ...f, purchase_id: e.target.value }))} required placeholder="Enter purchase_id" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Shipping Company</label>
              <input className="input" value={createForm.shipping_company}
                onChange={e => setCreateForm(f => ({ ...f, shipping_company: e.target.value }))} />
            </div>
            <div>
              <label className="label">Ship Name</label>
              <input className="input" value={createForm.ship_name}
                onChange={e => setCreateForm(f => ({ ...f, ship_name: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Route</label>
              <input className="input" value={createForm.route}
                onChange={e => setCreateForm(f => ({ ...f, route: e.target.value }))} placeholder="Japan → UK" />
            </div>
            <div>
              <label className="label">ETD</label>
              <input className="input" type="date" value={createForm.etd}
                onChange={e => setCreateForm(f => ({ ...f, etd: e.target.value }))} />
            </div>
            <div>
              <label className="label">ETA</label>
              <input className="input" type="date" value={createForm.eta}
                onChange={e => setCreateForm(f => ({ ...f, eta: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary flex-1" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create Shipment'}
            </button>
          </div>
        </form>
      </Drawer>
    </>
  )
}
