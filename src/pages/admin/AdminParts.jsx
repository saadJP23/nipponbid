import { useEffect, useState, useCallback } from 'react'
import { getAllParts, updatePart, exportAllParts, adminCreatePart, getAdminUsers } from '../../services/api'
import { Package, ChevronLeft, ChevronRight, Download, Save, Plus } from 'lucide-react'
import Drawer from '../../components/Drawer'
import toast from 'react-hot-toast'

const fmt = (n) => Number(n || 0).toLocaleString()
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const STATUS_BADGE = {
  pending:    'badge-amber',
  processing: 'badge-blue',
  ordered:    'badge-blue',
  shipped:    'badge-blue',
  delivered:  'badge-green',
  cancelled:  'badge-red',
}

const STATUSES        = ['pending', 'processing', 'ordered', 'shipped', 'delivered', 'cancelled']
const DELIVERY_STATUSES = ['pending', 'shipped', 'delivered', 'cancelled']

export default function AdminParts() {
  const [parts, setParts]     = useState([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [pages, setPages]     = useState(1)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [saving, setSaving]     = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [users, setUsers]       = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [createForm, setCreateForm] = useState({
    user_id: '', part_name: '', part_description: '', platform_name: '', auction_id: '',
    quantity: '1', bid_price: '', delivery_charges: '', bank_charges: '',
    shinchuo_commission: '', commission: '', delivery_company: '',
    tracking_no: '', delivery_status: 'pending', status: 'pending', admin_note: '',
  })

  const load = useCallback((p) => {
    setLoading(true)
    getAllParts({ page: p, limit: 20 })
      .then(r => {
        setParts(r.data.parts || [])
        setTotal(r.data.total || 0)
        setPages(r.data.pages || 1)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(page) }, [page, load])

  useEffect(() => {
    getAdminUsers({ limit: 200 }).then(r => setUsers(r.data.users || [])).catch(() => {})
  }, [])

  const setC = (k) => (e) => setCreateForm(f => ({ ...f, [k]: e.target.value }))

  const handleCreate = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await adminCreatePart({ ...createForm, user_id: Number(createForm.user_id) })
      toast.success('Parts order created')
      setShowCreate(false)
      setCreateForm({
        user_id: '', part_name: '', part_description: '', platform_name: '', auction_id: '',
        quantity: '1', bid_price: '', delivery_charges: '', bank_charges: '',
        shinchuo_commission: '', commission: '', delivery_company: '',
        tracking_no: '', delivery_status: 'pending', status: 'pending', admin_note: '',
      })
      load(page)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setSubmitting(false) }
  }

  const openPart = (p) => {
    setSelected(p)
    setEditForm({
      status:              p.status              || 'pending',
      delivery_status:     p.delivery_status     || 'pending',
      tracking_no:         p.tracking_no         || '',
      delivery_company:    p.delivery_company    || '',
      admin_note:          p.admin_note          || '',
      bid_price:           p.bid_price           ?? '',
      delivery_charges:    p.delivery_charges    ?? '',
      bank_charges:        p.bank_charges        ?? '',
      shinchuo_commission: p.shinchuo_commission ?? '',
      commission:          p.commission          ?? '',
    })
  }

  const setF = (k) => (e) => setEditForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updatePart(selected.parts_purchase_id, {
        ...editForm,
        delivery_charges:    editForm.delivery_charges    !== '' ? Number(editForm.delivery_charges)    : null,
        bank_charges:        editForm.bank_charges        !== '' ? Number(editForm.bank_charges)        : null,
        shinchuo_commission: editForm.shinchuo_commission !== '' ? Number(editForm.shinchuo_commission) : null,
        commission:          editForm.commission          !== '' ? Number(editForm.commission)          : null,
      })
      toast.success('Updated')
      setSelected(null)
      load(page)
    } catch { toast.error('Failed to update') }
    finally { setSaving(false) }
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
            <p className="page-subtitle">{fmt(total)} orders</p>
          </div>
          <button className="btn btn-secondary" onClick={handleExport} disabled={parts.length === 0}>
            <Download size={15} /> Export Excel
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={15} /> Add Manual
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
                  <th>Date</th>
                  <th>User</th>
                  <th>Part Name</th>
                  <th>Platform</th>
                  <th>Bid Price</th>
                  <th>Tracking No.</th>
                  <th>Status</th>
                  <th>Delivery</th>
                </tr></thead>
                <tbody>
                  {parts.map(p => (
                    <tr key={p.parts_purchase_id} onClick={() => openPart(p)} className="cursor-pointer">
                      <td className="whitespace-nowrap">{fmtDate(p.created_at)}</td>
                      <td>
                        <p className="font-medium whitespace-nowrap">{p.user_name}</p>
                        <p className="text-xs text-grey-400">{p.user_country}</p>
                      </td>
                      <td>
                        <p className="font-semibold text-navy">{p.part_name}</p>
                        <p className="text-xs text-grey-400 truncate max-w-[180px]">{p.part_description || '—'}</p>
                      </td>
                      <td>{p.platform_name || '—'}</td>
                      <td className="font-mono font-semibold">{p.bid_price != null ? `¥ ${fmt(p.bid_price)}` : '—'}</td>
                      <td className="font-mono text-xs">{p.tracking_no || '—'}</td>
                      <td><span className={`badge ${STATUS_BADGE[p.status] || 'badge-grey'}`}>{p.status}</span></td>
                      <td><span className={`badge ${STATUS_BADGE[p.delivery_status] || 'badge-grey'}`}>{p.delivery_status || 'pending'}</span></td>
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

      {/* Create Drawer */}
      <Drawer open={showCreate} onClose={() => setShowCreate(false)} title="Add Manual Parts Order" width={500}>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">User *</label>
            <select className="input" value={createForm.user_id} onChange={setC('user_id')} required>
              <option value="">Select user…</option>
              {users.filter(u => u.role !== 'admin').map(u => (
                <option key={u.user_id} value={u.user_id}>{u.name} — {u.country}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Part Name *</label>
              <input className="input" value={createForm.part_name} onChange={setC('part_name')} required placeholder="e.g. Head Light" />
            </div>
            <div className="col-span-2">
              <label className="label">Description</label>
              <input className="input" value={createForm.part_description} onChange={setC('part_description')} placeholder="e.g. Head Light for Honda FIT" />
            </div>
            <div>
              <label className="label">Platform</label>
              <input className="input" value={createForm.platform_name} onChange={setC('platform_name')} placeholder="e.g. Yahoo Auction" />
            </div>
            <div>
              <label className="label">Auction ID</label>
              <input className="input" value={createForm.auction_id} onChange={setC('auction_id')} />
            </div>
            <div>
              <label className="label">Quantity</label>
              <input className="input" type="number" min="1" value={createForm.quantity} onChange={setC('quantity')} />
            </div>
            <div>
              <label className="label">Delivery Company</label>
              <input className="input" value={createForm.delivery_company} onChange={setC('delivery_company')} placeholder="e.g. Yamato" />
            </div>
            <div className="col-span-2">
              <label className="label">Tracking No.</label>
              <input className="input font-mono" value={createForm.tracking_no} onChange={setC('tracking_no')} />
            </div>
          </div>
          <div className="border-t border-grey-100 pt-3">
            <p className="text-xs font-bold text-grey-500 mb-3">Cost Breakdown</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'bid_price',           label: 'Bid Price' },
                { key: 'delivery_charges',    label: 'Delivery Charges' },
                { key: 'bank_charges',        label: 'Bank Charges' },
                { key: 'shinchuo_commission', label: 'Shinchuo Commission' },
                { key: 'commission',          label: 'Commission' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-400 text-sm">¥</span>
                    <input className="input pl-7 font-mono" type="number" min="0" value={createForm[key]} onChange={setC(key)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Status</label>
              <select className="input" value={createForm.status} onChange={setC('status')}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Delivery Status</label>
              <select className="input" value={createForm.delivery_status} onChange={setC('delivery_status')}>
                {DELIVERY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Admin Note</label>
            <textarea className="input" rows={2} value={createForm.admin_note} onChange={setC('admin_note')} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary flex-1" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create Order'}
            </button>
          </div>
        </form>
      </Drawer>

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.part_name || 'Parts Order'}
        subtitle={selected ? `${selected.user_name} · ${fmtDate(selected.created_at)}` : ''}
        width={480}
      >
        {selected && editForm && (
          <div className="space-y-5">
            {/* Read-only info */}
            <div>
              <p className="label">Order Info</p>
              <div className="card p-3">
                {[
                  ['Part Name',    selected.part_name],
                  ['Description',  selected.part_description || '—'],
                  ['Platform',     selected.platform_name    || '—'],
                  ['Auction ID',   selected.auction_id       || '—'],
                  ['Quantity',     selected.quantity],
                  ['Bid Price',    selected.bid_price != null ? `¥ ${fmt(selected.bid_price)}` : '—'],
                  ['User',         selected.user_name],
                  ['Email',        selected.user_email],
                  ['Country',      selected.user_country],
                  ['Phone',        selected.user_phone || '—'],
                  ['Submitted',    fmtDate(selected.created_at)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-1.5 border-b border-grey-100 last:border-0">
                    <span className="text-sm text-grey-600">{k}</span>
                    <span className="text-sm font-medium text-navy text-right max-w-[240px] truncate">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Editable fields */}
            <form onSubmit={handleSave} className="space-y-4">
              <p className="label">Update Order</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Status</label>
                  <select className="input" value={editForm.status} onChange={setF('status')}>
                    {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Delivery Status</label>
                  <select className="input" value={editForm.delivery_status} onChange={setF('delivery_status')}>
                    {DELIVERY_STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Tracking No.</label>
                  <input className="input font-mono" value={editForm.tracking_no} onChange={setF('tracking_no')} placeholder="e.g. 389886975870" />
                </div>
                <div>
                  <label className="label">Delivery Company</label>
                  <input className="input" value={editForm.delivery_company} onChange={setF('delivery_company')} placeholder="e.g. Yamato" />
                </div>
              </div>

              <div className="border-t border-grey-100 pt-3">
                <p className="text-xs font-bold text-grey-500 mb-3">Cost Fields</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'delivery_charges',    label: 'Delivery Charges' },
                    { key: 'bank_charges',        label: 'Bank Charges' },
                    { key: 'shinchuo_commission', label: 'Shinchuo Commission' },
                    { key: 'commission',          label: 'Commission' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="label">{label}</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-400 text-sm">¥</span>
                        <input className="input pl-7 font-mono" type="number" min="0"
                          value={editForm[key]} onChange={setF(key)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Admin Note</label>
                <textarea className="input" rows={3} value={editForm.admin_note}
                  onChange={setF('admin_note')} placeholder="Internal note visible to admin only…" />
              </div>

              <button type="submit" className="btn btn-primary w-full" disabled={saving}>
                <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </form>
          </div>
        )}
      </Drawer>
    </>
  )
}
