import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { getMyLedger, getMyPurchases, getMyBids, getAdminStats, getAdminUsers } from '../services/api'
import { TrendingUp, ShoppingBag, Gavel, Clock, DollarSign, Users, Package, AlertCircle, Filter, X } from 'lucide-react'

const fmt = (n) => Number(n || 0).toLocaleString()
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

function StatCard({ label, value, sub, icon: Icon, color = 'text-navy' }) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <span className="stat-label">{label}</span>
        {Icon && <Icon size={16} className="text-grey-400" />}
      </div>
      <p className={`stat-value ${color}`}>{value}</p>
      {sub && <p className="text-xs text-grey-500">{sub}</p>}
    </div>
  )
}

function BidStatusBadge({ status }) {
  const map = { pending: 'badge-amber', approved: 'badge-green', won: 'badge-green', rejected: 'badge-red', lost: 'badge-red' }
  return <span className={`badge ${map[status] || 'badge-grey'}`}>{status}</span>
}

function UserDashboard() {
  const [ledger, setLedger] = useState(null)
  const [purchases, setPurchases] = useState([])
  const [bids, setBids] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getMyLedger(),
      getMyPurchases({ page: 1, limit: 5 }),
      getMyBids({ status: 'pending', limit: 5 }),
    ]).then(([l, p, b]) => {
      setLedger(l.data)
      setPurchases(p.data.purchases || [])
      setBids(b.data.bids || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const balance = ledger?.ledger?.length
    ? ledger.ledger[ledger.ledger.length - 1].balance
    : 0

  if (loading) return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-28 rounded-lg" />)}
      </div>
    </div>
  )

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Account Balance"
          value={`¥ ${fmt(Math.abs(balance))}`}
          sub={balance >= 0 ? 'Credit' : 'Outstanding'}
          icon={DollarSign}
          color={balance >= 0 ? 'text-green' : 'text-red'}
        />
        <StatCard label="Total Purchases" value={purchases.length > 0 ? fmt(purchases.length) : '—'} sub="Vehicles purchased" icon={ShoppingBag} />
        <StatCard label="Active Bids" value={fmt(bids.length)} sub="Awaiting review" icon={Gavel} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="px-5 py-4 border-b border-grey-200 flex items-center justify-between">
            <h2 className="font-bold text-navy text-sm">Recent Purchases</h2>
            <a href="/my-purchases" className="text-xs text-red font-semibold hover:underline">View all</a>
          </div>
          <div className="divide-y divide-grey-100">
            {purchases.length === 0 ? (
              <p className="px-5 py-8 text-sm text-grey-400 text-center">No purchases yet</p>
            ) : purchases.slice(0, 5).map(p => (
              <div key={p.purchase_id} className="px-5 py-3 flex items-center gap-3">
                {p.car_image ? (
                  <img src={p.car_image} className="w-12 h-9 object-cover rounded flex-shrink-0" alt="" />
                ) : (
                  <div className="w-12 h-9 bg-grey-100 rounded flex-shrink-0 flex items-center justify-center">
                    <ShoppingBag size={14} className="text-grey-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy truncate">{p.year} {p.make} {p.model}</p>
                  <p className="text-xs text-grey-500">{p.chassis_no} · {fmtDate(p.auction_date)}</p>
                </div>
                <p className="text-xs text-grey-400 flex-shrink-0">{p.auction_name}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="px-5 py-4 border-b border-grey-200 flex items-center justify-between">
            <h2 className="font-bold text-navy text-sm">Pending Bids</h2>
            <a href="/my-bids" className="text-xs text-red font-semibold hover:underline">View all</a>
          </div>
          <div className="divide-y divide-grey-100">
            {bids.length === 0 ? (
              <p className="px-5 py-8 text-sm text-grey-400 text-center">No pending bids</p>
            ) : bids.slice(0, 5).map(b => (
              <div key={b.bid_id} className="px-5 py-3 flex items-center gap-3">
                {b.car_image ? (
                  <img src={b.car_image} className="w-12 h-9 object-cover rounded flex-shrink-0" alt="" />
                ) : (
                  <div className="w-12 h-9 bg-grey-100 rounded flex-shrink-0 flex items-center justify-center">
                    <Gavel size={14} className="text-grey-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy truncate">{b.year} {b.make} {b.model}</p>
                  <p className="text-xs text-grey-500">¥ {fmt(b.amount)} · {b.auction_name}</p>
                </div>
                <BidStatusBadge status={b.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [countries, setCountries] = useState([])
  const [filters, setFilters] = useState({ user_id: '', country: '', date_from: '', date_to: '' })
  const [applied, setApplied] = useState({})

  useEffect(() => {
    getAdminUsers({ limit: 200 }).then(r => {
      const u = r.data.users || []
      setUsers(u)
      const unique = [...new Set(u.map(x => x.country).filter(Boolean))].sort()
      setCountries(unique)
    }).catch(() => {})
  }, [])

  const load = useCallback((params) => {
    setLoading(true)
    getAdminStats(params).then(r => setStats(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load({}) }, [load])

  const setF = (k) => (e) => setFilters(f => ({ ...f, [k]: e.target.value }))

  const handleApply = () => {
    const params = {}
    if (filters.user_id)   params.user_id   = filters.user_id
    if (filters.country)   params.country   = filters.country
    if (filters.date_from) params.date_from = filters.date_from
    if (filters.date_to)   params.date_to   = filters.date_to
    setApplied(params)
    load(params)
  }

  const handleClear = () => {
    setFilters({ user_id: '', country: '', date_from: '', date_to: '' })
    setApplied({})
    load({})
  }

  const hasFilters = Object.values(applied).some(Boolean)

  if (loading) return (
    <div className="space-y-4">
      <div className="skeleton h-14 rounded-lg" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-24 rounded-lg" />)}
      </div>
    </div>
  )

  const s = stats?.stats || {}

  return (
    <div className="space-y-6 animate-slide-up">

      {/* Filter bar */}
      <div className="card p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Customer</label>
          <select className="input min-w-[180px]" value={filters.user_id} onChange={setF('user_id')}>
            <option value="">All Customers</option>
            {users.filter(u => u.role !== 'admin').map(u => (
              <option key={u.user_id} value={u.user_id}>{u.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Country</label>
          <select className="input min-w-[150px]" value={filters.country} onChange={setF('country')}>
            <option value="">All Countries</option>
            {countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Date From</label>
          <input className="input" type="date" value={filters.date_from} onChange={setF('date_from')} />
        </div>
        <div>
          <label className="label">Date To</label>
          <input className="input" type="date" value={filters.date_to} onChange={setF('date_to')} />
        </div>
        <div className="flex gap-2 pb-0.5">
          <button className="btn btn-primary" onClick={handleApply}>
            <Filter size={14} /> Apply
          </button>
          {hasFilters && (
            <button className="btn btn-secondary" onClick={handleClear}>
              <X size={14} /> Clear
            </button>
          )}
        </div>
        {hasFilters && (
          <span className="badge badge-blue pb-0.5 self-end">Filtered</span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={fmt(s.total_users)} icon={Users} />
        <StatCard label="Total Purchases" value={fmt(s.total_purchases)} icon={ShoppingBag} />
        <StatCard label="Pending Bids" value={fmt(s.pending_bids)} icon={Clock} />
        <StatCard label="In Transit" value={fmt(s.in_transit_count)} icon={Package} />
        <StatCard label="Total Billed" value={`¥ ${fmt(s.total_billed)}`} icon={TrendingUp} />
        <StatCard label="Total Received" value={`¥ ${fmt(s.total_received)}`} icon={DollarSign} color="text-green" />
        <StatCard label="Receivable" value={`¥ ${fmt(s.receivable_amount)}`} icon={AlertCircle} color="text-amber" />
        <StatCard label="Proforma Unpaid" value={`¥ ${fmt(s.proforma_unpaid)}`} icon={AlertCircle} color="text-red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="px-5 py-4 border-b border-grey-200">
            <h2 className="font-bold text-navy text-sm">Recent Purchases</h2>
          </div>
          <div className="divide-y divide-grey-100">
            {(stats?.recent_purchases || []).length === 0 ? (
              <p className="px-5 py-8 text-sm text-grey-400 text-center">No recent purchases</p>
            ) : (stats?.recent_purchases || []).map(p => (
              <div key={p.purchase_id} className="px-5 py-3 flex items-center gap-3">
                {p.car_image ? (
                  <img src={p.car_image} className="w-12 h-9 object-cover rounded flex-shrink-0" alt="" />
                ) : (
                  <div className="w-12 h-9 bg-grey-100 rounded flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy truncate">{p.year} {p.make} {p.model}</p>
                  <p className="text-xs text-grey-500">{p.user_name} · {p.user_country}</p>
                </div>
                <p className="text-sm font-mono text-navy">¥ {fmt(p.admin_total)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="px-5 py-4 border-b border-grey-200">
            <h2 className="font-bold text-navy text-sm">Customer Summary</h2>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead><tr>
                <th>Customer</th>
                <th>Purchases</th>
                <th>Billed</th>
                <th>Balance</th>
              </tr></thead>
              <tbody>
                {(stats?.customer_summary || []).slice(0, 8).map(c => (
                  <tr key={c.user_id}>
                    <td>
                      <p className="font-semibold text-navy">{c.name}</p>
                      <p className="text-xs text-grey-400">{c.country}</p>
                    </td>
                    <td>{c.purchases}</td>
                    <td className="font-mono">¥ {fmt(c.total_billed)}</td>
                    <td className={`font-mono font-semibold ${c.balance >= 0 ? 'text-green' : 'text-red'}`}>
                      ¥ {fmt(Math.abs(c.balance))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { isAdmin } = useAuth()
  return isAdmin ? <AdminDashboard /> : <UserDashboard />
}
