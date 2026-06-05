import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getMyLedger, getMyPurchases, getMyBids, getAdminStats } from '../services/api'
import { TrendingUp, ShoppingBag, Gavel, Clock, DollarSign, Users, Package, AlertCircle } from 'lucide-react'

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

  useEffect(() => {
    getAdminStats().then(r => setStats(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-24 rounded-lg" />)}
    </div>
  )

  const s = stats?.stats || {}

  return (
    <div className="space-y-6 animate-slide-up">
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
