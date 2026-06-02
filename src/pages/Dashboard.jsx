import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  getAdminStats,
  getAllJapanBids,
  getMyJapanBids,
  getMyJapanPurchases,
  getMyParts,
  getMyLedger,
  resolveImageUrl,
} from '../services/api'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

function fmtJpy(n) {
  const num = parseFloat(n)
  if (!num && num !== 0) return '—'
  return `¥${Math.round(num).toLocaleString()}`
}

function fmtFull(n) {
  return `¥${Number(n || 0).toLocaleString()}`
}

function fmtDate(iso) {
  if (!iso) return '—'
  try { return format(new Date(iso), 'dd MMM yy') } catch { return '—' }
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good Morning'
  if (h < 17) return 'Good Afternoon'
  return 'Good Evening'
}

function pct(part, total) {
  if (!total || !part) return 0
  return Math.min(100, Math.round((part / total) * 100))
}

function KpiCard({ icon, label, value, loading, to }) {
  const inner = (
    <div className="bg-surface-container-lowest rounded-xl p-md shadow flex flex-col justify-between h-[136px] border border-outline-variant/30 transition-all hover:shadow-md">
      <div className="flex justify-between items-start">
        <div className="p-xs bg-surface-container rounded-lg">
          <span className="material-symbols-outlined text-primary text-[20px]"
                style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
        </div>
      </div>
      <div>
        <p className="text-label-sm text-on-surface-variant font-medium mb-1">{label}</p>
        {loading
          ? <div className="h-7 w-24 rounded skeleton" />
          : <p className="text-[28px] font-bold text-primary leading-none font-mono-data">{value}</p>
        }
      </div>
    </div>
  )
  return to ? <Link to={to}>{inner}</Link> : inner
}

const STATUS_STYLE = {
  won:       'bg-green-100 text-green-800',
  pending:   'bg-blue-100 text-blue-800',
  lost:      'bg-surface-container-high text-on-surface-variant',
  purchased: 'bg-purple-100 text-purple-800',
}

function FinancialBar({ billed, received, receivable }) {
  const recvPct = pct(received, billed)
  const owedPct = pct(receivable, billed)
  return (
    <div className="bg-surface-container-lowest rounded-xl shadow border border-outline-variant/30 p-md">
      <h3 className="text-label-sm text-on-surface-variant uppercase tracking-widest mb-md">Financial Overview</h3>
      <div className="flex flex-wrap gap-lg mb-md">
        <div>
          <p className="text-label-sm text-on-surface-variant">Total Billed</p>
          <p className="text-[22px] font-bold text-on-surface font-mono-data">{fmtFull(billed)}</p>
        </div>
        <div>
          <p className="text-label-sm text-on-surface-variant">Total Received</p>
          <p className="text-[22px] font-bold text-green-700 font-mono-data">{fmtFull(received)}</p>
        </div>
        <div>
          <p className="text-label-sm text-on-surface-variant">Outstanding</p>
          <p className="text-[22px] font-bold text-orange-600 font-mono-data">{fmtFull(receivable)}</p>
        </div>
        {billed > 0 && (
          <div className="ml-auto text-right">
            <p className="text-label-sm text-on-surface-variant">Collection Rate</p>
            <p className="text-[22px] font-bold text-primary font-mono-data">{recvPct}%</p>
          </div>
        )}
      </div>
      <div className="h-3 rounded-full bg-surface-container overflow-hidden flex">
        <div className="h-full bg-green-500 transition-all duration-700" style={{ width: `${recvPct}%` }} title={`Received: ${fmtFull(received)}`} />
        <div className="h-full bg-orange-400 transition-all duration-700" style={{ width: `${owedPct}%` }} title={`Outstanding: ${fmtFull(receivable)}`} />
      </div>
      <div className="flex gap-md mt-xs">
        <span className="flex items-center gap-1 text-label-sm text-on-surface-variant">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Received
        </span>
        <span className="flex items-center gap-1 text-label-sm text-on-surface-variant">
          <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" /> Outstanding
        </span>
        <span className="flex items-center gap-1 text-label-sm text-on-surface-variant">
          <span className="w-2 h-2 rounded-full bg-surface-container-high inline-block" /> Unbilled
        </span>
      </div>
    </div>
  )
}

function RevenueChart({ data, isFiltered }) {
  const hasData = data && data.length > 0
  const maxRevenue = hasData ? Math.max(...data.map(m => Number(m.revenue)), 1) : 1
  const maxSales   = hasData ? Math.max(...data.map(m => Number(m.sales)), 1)   : 1

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow border border-outline-variant/30 p-md">
      <h3 className="text-headline-sm font-semibold text-primary mb-xs">Revenue by Month</h3>
      <p className="text-label-sm text-on-surface-variant mb-md">
        {isFiltered ? 'Filtered date range' : 'Last 12 months'} · commission per auction month
      </p>
      {!hasData ? (
        <div className="h-40 flex items-center justify-center">
          <p className="text-body-sm text-on-surface-variant">No revenue data for this period</p>
        </div>
      ) : (
        <>
          <div className="flex items-end gap-1 h-40 mb-2">
            {data.map(m => {
              const h  = (Number(m.revenue) / maxRevenue) * 100
              const sH = (Number(m.sales)   / maxSales)   * 100
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-primary text-white rounded-lg px-2 py-1.5 text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                    <p className="font-semibold">{fmtFull(m.revenue)}</p>
                    <p className="text-white/70">{m.sales} car{m.sales !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="w-1 rounded-full bg-blue-300 opacity-60" style={{ height: `${Math.max(3, sH)}%` }} />
                  <div className="w-full rounded-t bg-secondary/70 group-hover:bg-secondary transition-colors" style={{ height: `${Math.max(3, h)}%` }} />
                  <span className="text-[9px] text-on-surface-variant mt-0.5">{m.month.slice(5)}</span>
                </div>
              )
            })}
          </div>
          <div className="flex justify-between text-label-sm text-on-surface-variant border-t border-outline-variant/30 pt-xs">
            <span>0</span>
            <span className="flex gap-3">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-secondary/70 inline-block" /> Revenue</span>
              <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-blue-300 inline-block" /> Cars sold</span>
            </span>
            <span>{fmtJpy(maxRevenue)}</span>
          </div>
        </>
      )}
    </div>
  )
}

function CustomerChart({ customers }) {
  if (!customers || customers.length === 0) return null
  const maxBilled = Math.max(...customers.map(c => c.total_billed), 1)
  return (
    <div className="bg-surface-container-lowest rounded-xl shadow border border-outline-variant/30 overflow-hidden">
      <div className="px-md py-sm border-b border-outline-variant/30 flex items-center gap-xs">
        <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>group</span>
        <h3 className="text-headline-sm font-semibold text-primary">Customer Breakdown</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-surface-container-low">
              {['Customer', 'Cars', 'Total Billed', 'Received', 'Balance', 'Collection'].map(h => (
                <th key={h} className="px-md py-xs text-label-sm text-on-surface-variant uppercase tracking-wide font-semibold border-b border-outline-variant/30 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20">
            {customers.map(c => {
              const neg     = c.balance < 0
              const collPct = pct(c.total_received, c.total_billed)
              return (
                <tr key={c.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-md py-sm">
                    <p className="text-body-sm font-semibold text-on-surface">{c.name}</p>
                    {c.country && <p className="text-label-sm text-on-surface-variant">{c.country}</p>}
                  </td>
                  <td className="px-md py-sm text-body-sm text-on-surface-variant">{c.purchases}</td>
                  <td className="px-md py-sm text-body-sm font-mono-data text-on-surface">{fmtFull(c.total_billed)}</td>
                  <td className="px-md py-sm text-body-sm font-mono-data text-green-700">{fmtFull(c.total_received)}</td>
                  <td className={`px-md py-sm text-body-sm font-mono-data font-semibold ${neg ? 'text-orange-600' : 'text-green-700'}`}>
                    {neg ? fmtFull(Math.abs(c.balance)) : '+' + fmtFull(c.balance)}
                    <span className="text-on-surface-variant font-normal text-label-sm"> {neg ? 'owed' : 'credit'}</span>
                  </td>
                  <td className="px-md py-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-surface-container rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-green-500 transition-all duration-500" style={{ width: `${collPct}%` }} />
                      </div>
                      <span className="text-label-sm text-on-surface-variant w-8 text-right">{collPct}%</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="px-md py-sm border-t border-outline-variant/30">
        <p className="text-label-sm text-on-surface-variant uppercase tracking-widest mb-sm">Billed Comparison</p>
        <div className="space-y-2">
          {customers.map(c => (
            <div key={c.id} className="flex items-center gap-3">
              <span className="text-body-sm text-on-surface-variant w-28 truncate shrink-0">{c.name}</span>
              <div className="flex-1 h-5 bg-surface-container rounded overflow-hidden relative">
                <div className="absolute inset-y-0 left-0 bg-outline-variant/40 rounded" style={{ width: `${pct(c.total_billed, maxBilled)}%` }} />
                <div className="absolute inset-y-0 left-0 bg-green-400/60 rounded" style={{ width: `${pct(c.total_received, maxBilled)}%` }} />
              </div>
              <span className="text-label-sm text-on-surface-variant w-24 text-right shrink-0">{fmtFull(c.total_billed)}</span>
            </div>
          ))}
          <div className="flex gap-md mt-xs">
            <span className="flex items-center gap-1 text-label-sm text-on-surface-variant"><span className="w-2 h-2 rounded-full bg-outline-variant/40 inline-block" /> Billed</span>
            <span className="flex items-center gap-1 text-label-sm text-on-surface-variant"><span className="w-2 h-2 rounded-full bg-green-400/60 inline-block" /> Received</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function CommissionBreakdown({ customers }) {
  if (!customers || customers.length === 0) return null
  const total = customers.reduce((s, c) => s + (c.total_commission || 0), 0)
  if (!total) return null
  const colors = ['bg-secondary', 'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-pink-500', 'bg-cyan-500']
  return (
    <div className="bg-surface-container-lowest rounded-xl shadow border border-outline-variant/30 p-md">
      <h3 className="text-headline-sm font-semibold text-primary mb-md">Commission by Customer</h3>
      <div className="space-y-3">
        {customers.map((c, i) => {
          const p = pct(c.total_commission, total)
          return (
            <div key={c.id}>
              <div className="flex justify-between text-body-sm mb-1">
                <span className="text-on-surface-variant">{c.name}</span>
                <span className="font-mono-data text-on-surface">{fmtFull(c.total_commission)} <span className="text-on-surface-variant">({p}%)</span></span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-container overflow-hidden">
                <div className={`h-full rounded-full ${colors[i % colors.length]} transition-all duration-500`} style={{ width: `${p}%` }} />
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-sm pt-sm border-t border-outline-variant/30 flex justify-between text-body-sm">
        <span className="text-on-surface-variant">Total Commission</span>
        <span className="font-mono-data font-bold text-secondary">{fmtFull(total)}</span>
      </div>
    </div>
  )
}

const EMPTY = { dateFrom: '', dateTo: '', userId: '', country: '' }

export default function Dashboard() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const isAdmin   = user?.role === 'admin'

  const [loading, setLoading]       = useState(true)
  const [kpis, setKpis]             = useState({ activeBids: 0, carsWon: 0, partsOrders: 0, revenue: '—' })
  const [tableRows, setTableRows]   = useState([])
  const [summaryRows, setSummaryRows] = useState([])
  const [partsRows, setPartsRows]   = useState([])
  const [fleet, setFleet]           = useState([])

  const [adminData, setAdminData]   = useState(null)
  const [draft, setDraft]           = useState(EMPTY)
  const [applied, setApplied]       = useState(EMPTY)
  const [filterLoading, setFilterLoading] = useState(false)

  useEffect(() => {
    if (isAdmin) return
    const load = async () => {
      try {
        const [myBidsRes, myPurchasesRes, myPartsRes, ledgerRes] = await Promise.all([
          getMyJapanBids(),
          getMyJapanPurchases(),
          getMyParts(),
          getMyLedger().catch(() => ({ data: { balance: 0 } })),
        ])
        const allBids      = myBidsRes.data ?? []
        const allPurchases = myPurchasesRes.data?.purchases ?? (Array.isArray(myPurchasesRes.data) ? myPurchasesRes.data : [])
        const allParts     = myPartsRes.data?.parts ?? (Array.isArray(myPartsRes.data) ? myPartsRes.data : [])

        const purchasePids = new Set(allPurchases.map(p => p.pid))
        const activeBids = allBids.filter(b => b.status === 'pending').length
        const carsWon    = allPurchases.length

        const balance = ledgerRes.data?.balance ?? 0
        const balanceStr = balance > 0
          ? `+¥${Math.abs(Math.round(balance)).toLocaleString()}`
          : balance < 0
            ? `-¥${Math.abs(Math.round(balance)).toLocaleString()}`
            : '¥0'
        setKpis({ activeBids, carsWon, partsOrders: allParts.length, revenue: balanceStr })

        const purchaseRows = allPurchases.map(p => ({
          car:      `${p.year ?? ''} ${p.make ?? ''} ${p.model ?? ''}`.trim() || '—',
          auction:  p.auction_house ?? '—',
          grade:    '—',
          price:    fmtJpy(p.total || p.bid_price),
          status:   'won',
          date:     fmtDate(p.auction_date),
          _sort:    p.auction_date || '',
        }))

        const bidRows = allBids
          .filter(b => b.status === 'pending')
          .map(b => ({
            car:     `${b.year ?? ''} ${b.make ?? ''} ${b.model ?? ''}`.trim() || '—',
            auction: b.auction_house ?? '—',
            grade:   '—',
            price:   fmtJpy(b.amount),
            status:  b.status ?? 'pending',
            date:    fmtDate(b.auction_date),
            _sort:   b.auction_date || '',
          }))

        const combined = [...purchaseRows, ...bidRows]
          .sort((a, b) => (b._sort > a._sort ? 1 : b._sort < a._sort ? -1 : 0))
          .slice(0, 6)
          .map(({ _sort, ...r }) => r)

        setTableRows(combined)

        setSummaryRows([
          { label: 'Active Bids',  val: activeBids },
          { label: 'Cars Won',     val: carsWon },
          { label: 'Parts Orders', val: allParts.length },
          { label: 'Total Bids',   val: allBids.length },
        ])

        const delivered = allParts.filter(p => p.status === 'delivered').length
        const shipped   = allParts.filter(p => p.status === 'shipped').length
        const pending   = allParts.filter(p => ['pending', 'submitted'].includes(p.status)).length
        const total     = allParts.length

        setPartsRows(total === 0 ? [] : [
          { label: 'Delivered', count: delivered, pct: total ? Math.round(delivered / total * 100) : 0, color: 'bg-green-500' },
          { label: 'Shipped',   count: shipped,   pct: total ? Math.round(shipped   / total * 100) : 0, color: 'bg-blue-500' },
          { label: 'Pending',   count: pending,   pct: total ? Math.round(pending   / total * 100) : 0, color: 'bg-amber-500' },
        ])

        setFleet([
          { label: 'Active Bids', count: activeBids,     color: 'bg-blue-500' },
          { label: 'Cars Won',    count: carsWon,         color: 'bg-green-500' },
          { label: 'Parts',       count: allParts.length, color: 'bg-amber-500' },
          { label: 'Total Bids',  count: allBids.length,  color: 'bg-outline' },
        ])
      } catch (e) {
        console.error('Dashboard load error:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [isAdmin])

  useEffect(() => {
    if (!isAdmin) return
    const isInitial = !adminData
    if (isInitial) setLoading(true)
    else setFilterLoading(true)

    const params = {}
    if (applied.dateFrom) params.date_from = applied.dateFrom
    if (applied.dateTo)   params.date_to   = applied.dateTo
    if (applied.userId)   params.user_id   = applied.userId
    if (applied.country)  params.country   = applied.country

    const filterActive = !!(applied.dateFrom || applied.dateTo || applied.userId || applied.country)

    Promise.all([
      getAdminStats(params),
      filterActive ? Promise.resolve({ data: { bids: [] } }) : getAllJapanBids({ limit: 6 }),
    ])
      .then(([statsRes, bidsRes]) => {
        const d = statsRes.data
        const s = d.stats
        const recentPurchases = d.recent_purchases ?? []
        const shinchBids      = bidsRes.data.bids   ?? []

        setAdminData(d)

        setKpis({
          activeBids:  s.pending_bids    ?? 0,
          carsWon:     s.total_purchases ?? 0,
          partsOrders: s.total_parts     ?? 0,
          revenue:     fmtJpy(s.total_revenue ?? 0),
        })

        if (!filterActive && shinchBids.length > 0) {
          setTableRows(shinchBids.map(b => ({
            car:     `${b.year ?? ''} ${b.make ?? ''} ${b.model ?? ''}`.trim() || '—',
            auction: b.auction_house ?? '—',
            grade:   b.grade ?? '—',
            price:   fmtJpy(b.amount),
            status:  b.status ?? 'pending',
            date:    fmtDate(b.auction_date),
          })))
        } else {
          setTableRows(recentPurchases.slice(0, 6).map(p => ({
            car:     `${p.year ?? ''} ${p.make ?? ''} ${p.model ?? ''}`.trim() || '—',
            auction: p.auction_house ?? '—',
            grade:   '—',
            price:   fmtJpy(p.total),
            status:  'purchased',
            date:    fmtDate(p.auction_date),
          })))
        }

        setSummaryRows(filterActive ? [
          { label: 'Purchases (filtered)', val: s.total_purchases  ?? 0 },
          { label: 'Revenue (filtered)',   val: fmtJpy(s.total_revenue     ?? 0) },
          { label: 'Remittance In',        val: fmtJpy(s.remittance_confirmed ?? 0) },
          { label: 'Receivable',           val: fmtJpy(s.receivable_amount    ?? 0) },
        ] : [
          { label: 'Total Users',     val: s.total_users      ?? '—' },
          { label: 'Total Purchases', val: s.total_purchases  ?? 0 },
          { label: 'Remittance In',   val: fmtJpy(s.remittance_confirmed ?? 0) },
          { label: 'Receivable',      val: fmtJpy(s.receivable_amount    ?? 0) },
        ])

        const statusMap = {}
        recentPurchases.forEach(p => {
          const st = p.bl_status ?? 'unknown'
          statusMap[st] = (statusMap[st] ?? 0) + 1
        })
        setFleet([
          { label: 'In Transit', count: (statusMap['loaded'] ?? 0) + (statusMap['in_transit'] ?? 0), color: 'bg-blue-500' },
          { label: 'At Port',    count: (statusMap['arrived'] ?? 0) + (statusMap['consigned'] ?? 0),  color: 'bg-amber-500' },
          { label: 'Delivered',  count: statusMap['delivered'] ?? 0,                                   color: 'bg-green-500' },
          { label: 'Purchased',  count: recentPurchases.length,                                        color: 'bg-outline' },
        ])

        setPartsRows(
          s.total_parts > 0
            ? [{ label: 'Total Parts', count: s.total_parts, pct: 100, color: 'bg-primary' }]
            : []
        )
      })
      .catch(() => toast.error('Failed to load stats'))
      .finally(() => {
        setLoading(false)
        setFilterLoading(false)
      })
  }, [isAdmin, applied])

  const handleApply = () => setApplied({ ...draft })
  const handleClear = () => { setDraft(EMPTY); setApplied(EMPTY) }
  const hasActive   = applied.dateFrom || applied.dateTo || applied.userId || applied.country

  const nowJST = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Tokyo', weekday: 'long', year: 'numeric',
    month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  const users_list    = adminData?.users_list    ?? []
  const countries_list = adminData?.countries_list ?? []
  const stats          = adminData?.stats         ?? {}

  return (
    <div className="p-lg bg-background min-h-full">

      <div className="flex justify-between items-center mb-lg">
        <div>
          <h2 className="text-headline-sm font-bold text-primary">
            {greeting()}, {user?.name?.split(' ')[0] ?? 'there'}
          </h2>
          <p className="text-body-sm text-on-surface-variant mt-0.5">{nowJST} JST</p>
        </div>
        <button
          onClick={() => navigate('/japanese-auctions')}
          className="flex items-center gap-xs bg-secondary text-white px-md py-[9px] rounded-lg text-body-sm font-semibold hover:bg-secondary/90 transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Bid
        </button>
      </div>

      {isAdmin && (
        <div className="bg-surface-container-lowest rounded-xl shadow border border-outline-variant/30 p-md mb-lg">
          <div className="flex flex-wrap gap-sm items-end">
            <div className="flex items-center gap-xs text-on-surface-variant text-body-sm font-medium shrink-0 self-center">
              <span className="material-symbols-outlined text-[16px] text-secondary">filter_list</span>
              <span>Filter</span>
              {hasActive && (
                <span className="bg-secondary/10 text-secondary text-label-sm px-xs py-0.5 rounded-full">Active</span>
              )}
            </div>

            <div className="flex flex-col gap-0.5">
              <label className="text-label-sm text-on-surface-variant">From</label>
              <input type="date" value={draft.dateFrom}
                onChange={e => setDraft(d => ({ ...d, dateFrom: e.target.value }))}
                className="border border-outline-variant/50 rounded-lg px-xs py-1.5 text-body-sm bg-surface-container text-on-surface w-36 focus:outline-none focus:border-primary/40"
              />
            </div>

            <div className="flex flex-col gap-0.5">
              <label className="text-label-sm text-on-surface-variant">To</label>
              <input type="date" value={draft.dateTo}
                onChange={e => setDraft(d => ({ ...d, dateTo: e.target.value }))}
                className="border border-outline-variant/50 rounded-lg px-xs py-1.5 text-body-sm bg-surface-container text-on-surface w-36 focus:outline-none focus:border-primary/40"
              />
            </div>

            <div className="flex flex-col gap-0.5">
              <label className="text-label-sm text-on-surface-variant">Customer</label>
              <select value={draft.userId}
                onChange={e => setDraft(d => ({ ...d, userId: e.target.value }))}
                className="border border-outline-variant/50 rounded-lg px-xs py-1.5 text-body-sm bg-surface-container text-on-surface min-w-[150px] focus:outline-none focus:border-primary/40"
              >
                <option value="">All Customers</option>
                {users_list.map(u => (
                  <option key={u.id} value={u.id}>{u.name}{u.country ? ` (${u.country})` : ''}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-0.5">
              <label className="text-label-sm text-on-surface-variant">Country</label>
              <select value={draft.country}
                onChange={e => setDraft(d => ({ ...d, country: e.target.value }))}
                className="border border-outline-variant/50 rounded-lg px-xs py-1.5 text-body-sm bg-surface-container text-on-surface min-w-[130px] focus:outline-none focus:border-primary/40"
              >
                <option value="">All Countries</option>
                {countries_list.map(c => (
                  <option key={c.country} value={c.country}>{c.country}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-xs">
              <button onClick={handleApply}
                className="bg-primary text-white px-md py-1.5 rounded-lg text-body-sm font-semibold hover:bg-primary/90 transition-colors">
                Apply
              </button>
              {hasActive && (
                <button onClick={handleClear}
                  className="flex items-center gap-1 text-body-sm text-on-surface-variant hover:text-on-surface transition-colors py-1.5">
                  <span className="material-symbols-outlined text-[14px]">close</span> Clear
                </button>
              )}
            </div>

            {filterLoading && (
              <span className="text-label-sm text-on-surface-variant self-center ml-auto">Refreshing…</span>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-md mb-lg">
        <KpiCard loading={loading} icon="gavel"        label="Active Bids"   value={kpis.activeBids}  to={isAdmin ? '/admin/bids' : '/my-bids'} />
        <KpiCard loading={loading} icon="emoji_events" label="Cars Won"      value={kpis.carsWon}     to={isAdmin ? '/admin/purchases' : '/my-japan-purchases'} />
        <KpiCard loading={loading} icon="inventory_2"  label="Parts Orders"  value={kpis.partsOrders} to={isAdmin ? '/admin/parts' : '/my-parts'} />
        <KpiCard loading={loading} icon="payments"     label={isAdmin ? 'Revenue' : 'My Balance'} value={kpis.revenue} to={isAdmin ? '/admin/accounting' : '/remittance'} />
      </div>

      {isAdmin && !loading && adminData && (
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-md mb-lg">
          {[
            { icon: 'group',           label: 'Total Users',   value: stats.total_users      ?? '—',            to: '/admin/users' },
            { icon: 'local_shipping',  label: 'In Transit',    value: stats.in_transit_count ?? 0,              to: '/admin/shipments' },
            { icon: 'receipt_long',    label: 'Proforma Due',  value: fmtJpy(stats.proforma_unpaid  ?? 0),      to: '/admin/invoices' },
            { icon: 'menu_book',       label: 'Final Inv Due', value: fmtJpy(stats.final_unpaid     ?? 0),      to: '/admin/invoices' },
            { icon: 'account_balance', label: 'Remittance In', value: fmtJpy(stats.remittance_confirmed ?? 0),  to: '/admin/remittances' },
          ].map(card => (
            <KpiCard key={card.label} loading={false} icon={card.icon} label={card.label} value={card.value} to={card.to} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-12 gap-md mb-md">
        <div className="col-span-12 xl:col-span-8 bg-surface-container-lowest rounded-xl shadow border border-outline-variant/30 overflow-hidden">
          <div className="px-md py-sm border-b border-outline-variant/30 flex justify-between items-center">
            <h3 className="text-headline-sm font-semibold text-primary">Recent Auction Results</h3>
            <Link to={isAdmin ? '/admin/bids' : '/my-bids'} className="text-secondary text-body-sm font-semibold hover:underline">View All</Link>
          </div>
          {loading ? (
            <div className="p-lg space-y-sm">
              {[...Array(4)].map((_, i) => <div key={i} className="h-10 rounded skeleton" />)}
            </div>
          ) : tableRows.length === 0 ? (
            <div className="p-xl text-center text-on-surface-variant text-body-sm">No auction activity yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low">
                    {['Car Model', 'Auction', 'Grade', 'Price', 'Status', 'Date'].map(h => (
                      <th key={h} className="px-md py-xs text-label-sm text-on-surface-variant uppercase tracking-wide font-semibold border-b border-outline-variant/30 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {tableRows.map((r, i) => (
                    <tr key={i} className="hover:bg-surface-container-low transition-colors">
                      <td className="px-md py-sm text-body-sm font-semibold text-on-surface">{r.car}</td>
                      <td className="px-md py-sm text-body-sm text-on-surface-variant">{r.auction}</td>
                      <td className="px-md py-sm">
                        <span className="bg-surface-container px-xs py-[2px] rounded text-on-surface text-body-sm font-mono-data font-bold">{r.grade}</span>
                      </td>
                      <td className="px-md py-sm text-body-sm font-mono-data text-on-surface">{r.price}</td>
                      <td className="px-md py-sm">
                        <span className={`${STATUS_STYLE[r.status] ?? STATUS_STYLE.pending} text-[10px] font-bold px-xs py-[2px] rounded uppercase tracking-wide`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-md py-sm text-body-sm text-on-surface-variant whitespace-nowrap">{r.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="col-span-12 xl:col-span-4 flex flex-col gap-md">
          <div className="bg-surface-container-lowest rounded-xl shadow border border-outline-variant/30 p-md">
            <h3 className="text-headline-sm font-semibold text-primary mb-md">
              {isAdmin ? 'Platform Summary' : 'My Summary'}
            </h3>
            {loading ? (
              <div className="space-y-sm">
                {[...Array(4)].map((_, i) => <div key={i} className="h-8 rounded skeleton" />)}
              </div>
            ) : (
              <div className="space-y-xs">
                {summaryRows.map(row => (
                  <div key={row.label} className="flex justify-between items-center py-xs border-b border-outline-variant/20 last:border-0">
                    <span className="text-body-sm text-on-surface-variant">{row.label}</span>
                    <span className="text-body-sm font-mono-data font-bold text-on-surface">{row.val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-surface-container-lowest rounded-xl shadow border border-outline-variant/30 p-md">
            <h3 className="text-headline-sm font-semibold text-primary mb-md">Parts Orders</h3>
            {loading ? (
              <div className="space-y-sm">
                {[...Array(3)].map((_, i) => <div key={i} className="h-8 rounded skeleton" />)}
              </div>
            ) : partsRows.length === 0 ? (
              <p className="text-body-sm text-on-surface-variant text-center py-md">No parts orders yet.</p>
            ) : (
              <div className="space-y-sm">
                {partsRows.map(s => (
                  <div key={s.label}>
                    <div className="flex justify-between text-body-sm mb-1">
                      <span className="text-on-surface-variant">{s.label}</span>
                      <span className="font-mono-data font-semibold text-on-surface">{s.count}</span>
                    </div>
                    <div className="h-1.5 bg-surface-container rounded-full overflow-hidden">
                      <div className={`h-full ${s.color} rounded-full`} style={{ width: `${s.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow border border-outline-variant/30 p-md mb-md">
        <h3 className="text-headline-sm font-semibold text-primary mb-md">
          {isAdmin ? 'Fleet Overview' : 'My Activity'}
        </h3>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
            {[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded skeleton" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
            {fleet.map(s => (
              <div key={s.label} className="flex items-center gap-sm p-sm bg-surface-container rounded-lg">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.color}`} />
                <div>
                  <p className="text-label-sm text-on-surface-variant">{s.label}</p>
                  <p className="text-[22px] font-bold text-on-surface font-mono-data leading-tight">{s.count}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isAdmin && !loading && adminData && (
        <>
          <div className="mb-md">
            <FinancialBar
              billed={stats.total_billed       || 0}
              received={stats.total_received   || 0}
              receivable={stats.receivable_amount || 0}
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-md mb-md">
            <RevenueChart data={adminData.monthly_revenue} isFiltered={!!(applied.dateFrom || applied.dateTo)} />
            <CommissionBreakdown customers={adminData.customer_summary} />
          </div>

          {adminData.customer_summary?.length > 0 && (
            <div className="mb-md">
              <CustomerChart customers={adminData.customer_summary} />
            </div>
          )}

          {adminData.recent_purchases?.length > 0 && (
            <div className="bg-surface-container-lowest rounded-xl shadow border border-outline-variant/30 overflow-hidden mb-md">
              <div className="px-md py-sm border-b border-outline-variant/30 flex justify-between items-center">
                <div className="flex items-center gap-xs">
                  <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>shopping_bag</span>
                  <h3 className="text-headline-sm font-semibold text-primary">Recent Purchases</h3>
                </div>
                <Link to="/admin/purchases" className="text-secondary text-body-sm font-semibold hover:underline flex items-center gap-1">
                  View All <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-surface-container-low">
                      {['Car', 'Client', 'Country', 'Auction Date', 'Total', 'Commission'].map(h => (
                        <th key={h} className="px-md py-xs text-label-sm text-on-surface-variant uppercase tracking-wide font-semibold border-b border-outline-variant/30 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20">
                    {adminData.recent_purchases.map(p => (
                      <tr key={p.id} className="hover:bg-surface-container-low transition-colors">
                        <td className="px-md py-sm">
                          <div className="flex items-center gap-sm">
                            {p.image_url && <img src={resolveImageUrl(p.image_url.split(',')[0].trim())} alt="" className="w-10 h-8 rounded object-cover shrink-0" />}
                            <span className="text-body-sm font-semibold text-on-surface">{p.make} {p.model} {p.year}</span>
                          </div>
                        </td>
                        <td className="px-md py-sm text-body-sm text-on-surface-variant">{p.user_name}</td>
                        <td className="px-md py-sm text-body-sm text-on-surface-variant">{p.user_country || '—'}</td>
                        <td className="px-md py-sm text-body-sm text-on-surface-variant whitespace-nowrap">{fmtDate(p.auction_date)}</td>
                        <td className="px-md py-sm text-body-sm font-mono-data text-on-surface">{fmtFull(p.total)}</td>
                        <td className="px-md py-sm text-body-sm font-mono-data text-secondary font-semibold">{fmtFull(p.commission)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {adminData.in_transit?.length > 0 && (
            <div className="bg-surface-container-lowest rounded-xl shadow border border-outline-variant/30 overflow-hidden mb-md">
              <div className="px-md py-sm border-b border-outline-variant/30 flex justify-between items-center">
                <div className="flex items-center gap-xs">
                  <span className="material-symbols-outlined text-blue-600 text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>local_shipping</span>
                  <h3 className="text-headline-sm font-semibold text-primary">In Transit ({stats.in_transit_count})</h3>
                </div>
                <Link to="/admin/shipments" className="text-secondary text-body-sm font-semibold hover:underline flex items-center gap-1">
                  Manage <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-surface-container-low">
                      {['Car', 'Client', 'File', 'Ship', 'ETA', 'Port'].map(h => (
                        <th key={h} className="px-md py-xs text-label-sm text-on-surface-variant uppercase tracking-wide font-semibold border-b border-outline-variant/30 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20">
                    {adminData.in_transit.map(r => (
                      <tr key={r.purchase_id} className="hover:bg-surface-container-low transition-colors">
                        <td className="px-md py-sm text-body-sm font-semibold text-on-surface">{r.year} {r.make} {r.model}</td>
                        <td className="px-md py-sm text-body-sm text-on-surface-variant">{r.user_name}</td>
                        <td className="px-md py-sm text-body-sm font-mono-data text-secondary">{r.file_code || '—'}</td>
                        <td className="px-md py-sm text-body-sm text-on-surface-variant">{r.ship_name || '—'}</td>
                        <td className="px-md py-sm text-body-sm text-on-surface-variant whitespace-nowrap">{fmtDate(r.eta)}</td>
                        <td className="px-md py-sm text-body-sm text-on-surface-variant">{r.port_of_discharge || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {adminData.stock_by_make?.length > 0 && (
            <div className="bg-surface-container-lowest rounded-xl shadow border border-outline-variant/30 p-md">
              <div className="flex items-center gap-xs mb-md">
                <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>directions_car</span>
                <h3 className="text-headline-sm font-semibold text-primary">Stock by Make</h3>
              </div>
              <div className="flex flex-wrap gap-sm">
                {adminData.stock_by_make.map(s => (
                  <div key={s.make} className="bg-surface-container rounded-xl px-md py-sm flex items-center gap-xs border border-outline-variant/30">
                    <span className="text-body-sm font-semibold text-on-surface">{s.make}</span>
                    <span className="text-body-sm font-bold text-secondary font-mono-data">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

    </div>
  )
}
