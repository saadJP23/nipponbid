import { useEffect, useState, useCallback } from 'react'
import { getAllPurchases, getPurchase, updatePurchase, createPurchase, uploadDocument, deleteDocument, resolveImageUrl, getAdminUsers } from '../../services/api'
import { ShoppingBag, ChevronLeft, ChevronRight, Upload, Trash2, FileText, Save, ChevronDown, Plus } from 'lucide-react'
import Drawer from '../../components/Drawer'
import toast from 'react-hot-toast'

const fmt = (n) => Number(n || 0).toLocaleString()
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const n = (v) => Number(v) || 0

const COST_FIELDS = [
  { key: 'bid_price',          label: 'Bid Price' },
  { key: 'auction_commission', label: 'Auction Commission' },
  { key: 'transportation',     label: 'Transportation' },
  { key: 'loading_custom',     label: 'Loading / Custom' },
  { key: 'commission',         label: 'Commission' },
  { key: 'tax_10_percent',     label: 'Tax (10%)' },
  { key: 'radiation_photos',   label: 'Radiation / Photos' },
  { key: 'custom_fee',         label: 'Custom Fee' },
  { key: 'freight',            label: 'Freight' },
  { key: 'recycle',            label: 'Recycle' },
  { key: 'others',             label: 'Others' },
]

function blankForm(detail, purchase) {
  return {
    destination:     purchase?.destination     || '',
    pro_invoice_no:  purchase?.pro_invoice_no  || '',
    file_code_no:    purchase?.file_code_no    || '',
    lot_no:          purchase?.lot_no          || '',
    remarks:         purchase?.remarks         || '',
    bid_price:          detail?.bid_price          || 0,
    auction_commission: detail?.auction_commission || 0,
    transportation:     detail?.transportation     || 0,
    loading_custom:     detail?.loading_custom     || 0,
    commission:         detail?.commission         || 0,
    tax_10_percent:     detail?.tax_10_percent     || 0,
    radiation_photos:   detail?.radiation_photos   || 0,
    custom_fee:         detail?.custom_fee         || 0,
    freight:            detail?.freight            || 0,
    recycle:            detail?.recycle            || 0,
    others:             detail?.others             || 0,
  }
}

export default function AdminPurchases() {
  const [purchases, setPurchases] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [userFilter, setUserFilter] = useState('')
  const [users, setUsers] = useState([])
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [docName, setDocName] = useState('')
  const [docFile, setDocFile] = useState(null)
  const [docType, setDocType] = useState('user_and_admin')
  const [showCreate, setShowCreate] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [createForm, setCreateForm] = useState({
    user_id: '', car_id: '', auction_id: '', auction_date: '', lot_no: '',
    destination: '', pro_invoice_no: '', file_code_no: '', remarks: '',
    bid_price: '', auction_commission: '', transportation: '', loading_custom: '',
    commission: '', tax_10_percent: '0', radiation_photos: '0', custom_fee: '0',
    freight: '', recycle: '0', others: '0',
  })

  useEffect(() => {
    getAdminUsers({ limit: 200 }).then(r => setUsers(r.data.users || [])).catch(() => {})
  }, [])

  const load = useCallback((p, uid) => {
    setLoading(true)
    getAllPurchases({ page: p, limit: 15, ...(uid ? { user_id: uid } : {}) })
      .then(r => { setPurchases(r.data.purchases || []); setTotal(r.data.total || 0); setPages(r.data.pages || 1) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(page, userFilter) }, [page, userFilter, load])

  const handleUserFilter = (uid) => { setUserFilter(uid); setPage(1) }

  const setC = (k) => (e) => setCreateForm(f => ({ ...f, [k]: e.target.value }))

  const handleCreate = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await createPurchase({
        ...createForm,
        user_id:        Number(createForm.user_id),
        car_id:         Number(createForm.car_id),
        auction_id:     createForm.auction_id ? Number(createForm.auction_id) : null,
        bid_price:      Number(createForm.bid_price) || 0,
        auction_commission: Number(createForm.auction_commission) || 0,
        transportation: Number(createForm.transportation) || 0,
        loading_custom: Number(createForm.loading_custom) || 0,
        commission:     Number(createForm.commission) || 0,
        tax_10_percent: Number(createForm.tax_10_percent) || 0,
        radiation_photos: Number(createForm.radiation_photos) || 0,
        custom_fee:     Number(createForm.custom_fee) || 0,
        freight:        Number(createForm.freight) || 0,
        recycle:        Number(createForm.recycle) || 0,
        others:         Number(createForm.others) || 0,
      })
      toast.success('Purchase created')
      setShowCreate(false)
      load(page, userFilter)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setSubmitting(false) }
  }

  const openDetail = (p) => {
    setSelected(p)
    setDetail(null)
    setDetailLoading(true)
    getPurchase(p.purchase_id)
      .then(r => { setDetail(r.data); setForm(blankForm(r.data.details, r.data)) })
      .catch(() => {})
      .finally(() => setDetailLoading(false))
  }

  const reloadDetail = () => {
    if (!selected) return
    getPurchase(selected.purchase_id)
      .then(r => { setDetail(r.data); setForm(blankForm(r.data.details, r.data)) })
      .catch(() => {})
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const total_cost = COST_FIELDS.reduce((sum, f) => sum + n(form[f.key]), 0)

  const handleSave = async () => {
    setSaving(true)
    try {
      await updatePurchase(selected.purchase_id, { ...form })
      toast.success('Purchase updated')
      load(page)
      reloadDetail()
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!docFile || !docName) return toast.error('Name and file required')
    setUploading(true)
    const fd = new FormData()
    fd.append('document', docFile)
    fd.append('name', docName)
    fd.append('type', docType)
    try {
      await uploadDocument(selected.purchase_id, fd)
      toast.success('Document uploaded')
      setDocName(''); setDocFile(null); setDocType('user_and_admin')
      reloadDetail()
    } catch { toast.error('Upload failed') }
    finally { setUploading(false) }
  }

  const handleDeleteDoc = async (docId) => {
    try {
      await deleteDocument(selected.purchase_id, docId)
      toast.success('Deleted')
      reloadDetail()
    } catch { toast.error('Failed') }
  }

  return (
    <>
      <div className="space-y-4 animate-slide-up">
        <div className="page-header">
          <div>
            <h1 className="page-title">Purchases</h1>
            <p className="page-subtitle">{fmt(total)} total{userFilter ? ` · ${users.find(u => u.user_id === Number(userFilter))?.name}` : ''}</p>
          </div>
          <div className="flex gap-2 items-center">
            <div className="relative">
              <select
                className="input pr-8 appearance-none min-w-[200px]"
                value={userFilter}
                onChange={e => handleUserFilter(e.target.value)}
              >
                <option value="">All Users</option>
                {users.map(u => (
                  <option key={u.user_id} value={u.user_id}>{u.name} ({u.country || 'N/A'})</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-400 pointer-events-none" />
            </div>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <Plus size={15} /> Add Manual
            </button>
          </div>
        </div>

        <div className="card">
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-16 rounded" />)}</div>
          ) : purchases.length === 0 ? (
            <div className="py-16 text-center">
              <ShoppingBag size={32} className="mx-auto text-grey-300 mb-3" />
              <p className="text-grey-500 text-sm">No purchases</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead><tr>
                  <th>Vehicle</th>
                  <th>User</th>
                  <th>Auction</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Invoice No.</th>
                </tr></thead>
                <tbody>
                  {purchases.map(p => (
                    <tr key={p.purchase_id} onClick={() => openDetail(p)} className="cursor-pointer">
                      <td>
                        <div className="flex items-center gap-3">
                          {p.car_image ? (
                            <img src={resolveImageUrl(p.car_image)} className="w-12 h-9 object-cover rounded flex-shrink-0" alt="" />
                          ) : (
                            <div className="w-12 h-9 bg-grey-100 rounded flex-shrink-0" />
                          )}
                          <div>
                            <p className="font-semibold text-navy">{p.year} {p.make} {p.model}</p>
                            <p className="text-xs text-grey-400">{p.chassis_no}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <p className="font-medium">{p.user_name}</p>
                        <p className="text-xs text-grey-400">{p.user_country}</p>
                      </td>
                      <td>{p.auction_name}</td>
                      <td>{fmtDate(p.auction_date)}</td>
                      <td className="font-mono font-semibold">¥ {fmt(p.purchase_total)}</td>
                      <td className="font-mono text-xs">{p.pro_invoice_no || '—'}</td>
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
        width={540}
      >
        {detailLoading ? (
          <div className="space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="skeleton h-8 rounded" />)}</div>
        ) : detail ? (
          <div className="space-y-6">

            {/* Car images */}
            {detail.images?.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {detail.images.slice(0, 6).map(img => (
                  <img key={img.car_image_id} src={resolveImageUrl(img.url)} className="w-full h-20 object-cover rounded" alt="" />
                ))}
              </div>
            )}

            {/* User info */}
            <div>
              <p className="label">User</p>
              <div className="card p-3">
                {[['Name', detail.user_name], ['Email', detail.user_email], ['Country', detail.user_country]].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-1.5 border-b border-grey-100 last:border-0">
                    <span className="text-sm text-grey-600">{k}</span>
                    <span className="text-sm font-medium text-navy">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Editable purchase info */}
            <div>
              <p className="label">Purchase Info</p>
              <div className="card p-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'pro_invoice_no', label: 'Pro-Invoice No.' },
                    { key: 'file_code_no',   label: 'File Code No.' },
                    { key: 'lot_no',         label: 'Lot No.' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="label">{label}</label>
                      <input className="input" value={form[key] || ''} onChange={set(key)} />
                    </div>
                  ))}
                  <div className="col-span-2">
                    <label className="label">Destination</label>
                    <input className="input" value={form.destination || ''} onChange={set('destination')} />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Remarks</label>
                    <textarea className="input" rows={2} value={form.remarks || ''} onChange={set('remarks')} />
                  </div>
                </div>
              </div>
            </div>

            {/* Editable cost breakdown */}
            <div>
              <p className="label">Cost Breakdown</p>
              <div className="card p-3 space-y-2">
                {COST_FIELDS.map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-sm text-grey-600 w-44 flex-shrink-0">{label}</span>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-400 text-sm">¥</span>
                      <input
                        type="number"
                        className="input pl-7 font-mono text-right"
                        value={form[key] ?? 0}
                        onChange={set(key)}
                        min="0"
                      />
                    </div>
                  </div>
                ))}
                <div className="flex justify-between pt-3 mt-1 border-t-2 border-navy">
                  <span className="font-bold text-navy">Total</span>
                  <span className="font-bold font-mono text-navy text-base">¥ {fmt(total_cost)}</span>
                </div>
              </div>
            </div>

            {/* Save button */}
            <button className="btn btn-primary w-full" onClick={handleSave} disabled={saving}>
              <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
            </button>

            {/* Documents */}
            <div>
              <p className="label">Documents</p>
              <div className="space-y-2 mb-4">
                {(detail.documents || []).length === 0 ? (
                  <p className="text-xs text-grey-400">No documents yet</p>
                ) : detail.documents.map(doc => (
                  <div key={doc.document_id} className="flex items-center gap-3 card p-3">
                    <FileText size={15} className="text-grey-400 flex-shrink-0" />
                    <a href={resolveImageUrl(doc.url)} target="_blank" rel="noreferrer"
                      className="flex-1 text-sm text-navy font-medium hover:text-red truncate">
                      {doc.name}
                    </a>
                    <span className="badge badge-grey text-[10px]">{doc.type === 'admin_only' ? 'admin' : 'shared'}</span>
                    <button className="btn-icon text-grey-400 hover:text-red" onClick={() => handleDeleteDoc(doc.document_id)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              <form onSubmit={handleUpload} className="space-y-3 border-t border-grey-200 pt-4">
                <p className="text-xs font-bold text-grey-500">Upload Document</p>
                <div>
                  <label className="label">Document Name</label>
                  <input className="input" value={docName} onChange={e => setDocName(e.target.value)} placeholder="e.g. BL Document" />
                </div>
                <div>
                  <label className="label">Visibility</label>
                  <select className="input" value={docType} onChange={e => setDocType(e.target.value)}>
                    <option value="user_and_admin">Shared (user + admin)</option>
                    <option value="admin_only">Admin only</option>
                  </select>
                </div>
                <input type="file" className="input text-sm" onChange={e => setDocFile(e.target.files?.[0] || null)} />
                <button type="submit" className="btn btn-secondary btn-sm" disabled={uploading}>
                  <Upload size={13} /> {uploading ? 'Uploading…' : 'Upload'}
                </button>
              </form>
            </div>
          </div>
        ) : null}
      </Drawer>

      {/* Create Drawer */}
      <Drawer open={showCreate} onClose={() => setShowCreate(false)} title="Add Manual Purchase" width={540}>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">User *</label>
              <select className="input" value={createForm.user_id} onChange={setC('user_id')} required>
                <option value="">Select user…</option>
                {users.filter(u => u.role !== 'admin').map(u => (
                  <option key={u.user_id} value={u.user_id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Car ID *</label>
              <input className="input font-mono" type="number" value={createForm.car_id} onChange={setC('car_id')} required placeholder="e.g. 42" />
            </div>
            <div>
              <label className="label">Auction ID</label>
              <input className="input font-mono" type="number" value={createForm.auction_id} onChange={setC('auction_id')} placeholder="Optional" />
            </div>
            <div>
              <label className="label">Auction Date</label>
              <input className="input" type="date" value={createForm.auction_date} onChange={setC('auction_date')} />
            </div>
            <div>
              <label className="label">Pro-Invoice No.</label>
              <input className="input" value={createForm.pro_invoice_no} onChange={setC('pro_invoice_no')} placeholder="e.g. ERD-1" />
            </div>
            <div>
              <label className="label">File Code No.</label>
              <input className="input" value={createForm.file_code_no} onChange={setC('file_code_no')} />
            </div>
            <div>
              <label className="label">Lot No.</label>
              <input className="input" value={createForm.lot_no} onChange={setC('lot_no')} />
            </div>
            <div>
              <label className="label">Destination</label>
              <input className="input" value={createForm.destination} onChange={setC('destination')} placeholder="e.g. Birmingham, England" />
            </div>
            <div className="col-span-2">
              <label className="label">Remarks</label>
              <textarea className="input" rows={2} value={createForm.remarks} onChange={setC('remarks')} />
            </div>
          </div>

          <div className="border-t border-grey-100 pt-3">
            <p className="text-xs font-bold text-grey-500 mb-3">Cost Breakdown</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'bid_price',          label: 'Bid Price' },
                { key: 'auction_commission', label: 'Auction Commission' },
                { key: 'transportation',     label: 'Transportation' },
                { key: 'loading_custom',     label: 'Loading / Custom' },
                { key: 'commission',         label: 'Commission' },
                { key: 'tax_10_percent',     label: 'Tax (10%)' },
                { key: 'radiation_photos',   label: 'Radiation / Photos' },
                { key: 'custom_fee',         label: 'Custom Fee' },
                { key: 'freight',            label: 'Freight' },
                { key: 'recycle',            label: 'Recycle' },
                { key: 'others',             label: 'Others' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-400 text-sm">¥</span>
                    <input className="input pl-7 font-mono" type="number" min="0"
                      value={createForm[key]} onChange={setC(key)} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary flex-1" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create Purchase'}
            </button>
          </div>
        </form>
      </Drawer>
    </>
  )
}
