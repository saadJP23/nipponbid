import { useEffect, useState, useCallback } from 'react'
import { getAllPurchases, getPurchase, uploadDocument, deleteDocument, resolveImageUrl } from '../../services/api'
import { ShoppingBag, ChevronLeft, ChevronRight, Upload, Trash2, ExternalLink, FileText } from 'lucide-react'
import Drawer from '../../components/Drawer'
import toast from 'react-hot-toast'

const fmt = (n) => Number(n || 0).toLocaleString()
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

function CostRow({ label, value }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-grey-100 last:border-0">
      <span className="text-sm text-grey-600">{label}</span>
      <span className="text-sm font-mono text-navy">¥ {fmt(value)}</span>
    </div>
  )
}

export default function AdminPurchases() {
  const [purchases, setPurchases] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [docName, setDocName] = useState('')
  const [docFile, setDocFile] = useState(null)
  const [docType, setDocType] = useState('user_and_admin')

  const load = useCallback((p) => {
    setLoading(true)
    getAllPurchases({ page: p, limit: 15 })
      .then(r => { setPurchases(r.data.purchases || []); setTotal(r.data.total || 0); setPages(r.data.pages || 1) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(page) }, [page, load])

  const openDetail = (p) => {
    setSelected(p)
    setDetail(null)
    setDetailLoading(true)
    getPurchase(p.purchase_id)
      .then(r => setDetail(r.data))
      .catch(() => {})
      .finally(() => setDetailLoading(false))
  }

  const reloadDetail = () => {
    if (!selected) return
    getPurchase(selected.purchase_id).then(r => setDetail(r.data)).catch(() => {})
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
            <p className="page-subtitle">{fmt(total)} total</p>
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
        width={520}
      >
        {detailLoading ? (
          <div className="space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="skeleton h-8 rounded" />)}</div>
        ) : detail ? (
          <div className="space-y-6">
            {detail.images?.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {detail.images.slice(0, 6).map(img => (
                  <img key={img.car_image_id} src={resolveImageUrl(img.url)} className="w-full h-20 object-cover rounded" alt="" />
                ))}
              </div>
            )}

            <div>
              <p className="label">User</p>
              <div className="card p-3">
                {[
                  ['Name', detail.user_name],
                  ['Email', detail.user_email],
                  ['Country', detail.user_country],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-1.5 border-b border-grey-100 last:border-0">
                    <span className="text-sm text-grey-600">{k}</span>
                    <span className="text-sm font-medium text-navy">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {detail.details && (
              <div>
                <p className="label">Cost Breakdown</p>
                <div className="card p-3">
                  <CostRow label="Bid Price" value={detail.details.bid_price} />
                  <CostRow label="Auction Commission" value={detail.details.auction_commission} />
                  <CostRow label="Transportation" value={detail.details.transportation} />
                  <CostRow label="Loading / Custom" value={detail.details.loading_custom} />
                  <CostRow label="Commission" value={detail.details.commission} />
                  <CostRow label="Tax (10%)" value={detail.details.tax_10_percent} />
                  <CostRow label="Radiation / Photos" value={detail.details.radiation_photos} />
                  <CostRow label="Custom Fee" value={detail.details.custom_fee} />
                  <CostRow label="Freight" value={detail.details.freight} />
                  <CostRow label="Recycle" value={detail.details.recycle} />
                  {Number(detail.details.others) > 0 && <CostRow label="Others" value={detail.details.others} />}
                  <div className="flex justify-between pt-3 mt-1 border-t-2 border-navy">
                    <span className="font-bold text-navy">Total</span>
                    <span className="font-bold font-mono text-navy text-base">¥ {fmt(detail.details.total)}</span>
                  </div>
                </div>
              </div>
            )}

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
                <div>
                  <input type="file" className="input text-sm" onChange={e => setDocFile(e.target.files?.[0] || null)} />
                </div>
                <button type="submit" className="btn btn-secondary btn-sm" disabled={uploading}>
                  <Upload size={13} /> {uploading ? 'Uploading…' : 'Upload'}
                </button>
              </form>
            </div>
          </div>
        ) : null}
      </Drawer>
    </>
  )
}
