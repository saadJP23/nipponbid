import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Gavel, ShoppingBag, TrendingUp, DollarSign, Clock,
  Package, ArrowRight, Ship, Receipt, BookOpen, AlertCircle,
  Filter, X, ChevronDown, BarChart2,
} from 'lucide-react';
import { getAdminStats, resolveImageUrl } from '../../services/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const EMPTY = { dateFrom: '', dateTo: '', userId: '', country: '' };
const fmt   = n => `¥${Number(n || 0).toLocaleString()}`;

function pct(part, total) {
  if (!total || !part) return 0;
  return Math.min(100, Math.round((part / total) * 100));
}

function HBar({ value, max, color = 'bg-gold-500', className = '' }) {
  const w = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className={`h-2 rounded-full bg-white/5 overflow-hidden ${className}`}>
      <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${w}%` }} />
    </div>
  );
}

function FinancialBar({ billed, received, receivable }) {
  const recvPct = pct(received, billed);
  const owedPct = pct(receivable, billed);
  return (
    <div className="card p-5">
      <h3 className="text-white/60 text-xs uppercase tracking-widest mb-4">Financial Overview</h3>
      <div className="flex gap-6 mb-4">
        <div>
          <p className="text-white/40 text-xs">Total Billed</p>
          <p className="text-white font-bold text-lg">{fmt(billed)}</p>
        </div>
        <div>
          <p className="text-white/40 text-xs">Total Received</p>
          <p className="text-green-400 font-bold text-lg">{fmt(received)}</p>
        </div>
        <div>
          <p className="text-white/40 text-xs">Outstanding</p>
          <p className="text-orange-400 font-bold text-lg">{fmt(receivable)}</p>
        </div>
        {billed > 0 && (
          <div className="ml-auto text-right">
            <p className="text-white/40 text-xs">Collection Rate</p>
            <p className="text-white font-bold text-lg">{recvPct}%</p>
          </div>
        )}
      </div>
      <div className="h-4 rounded-full bg-white/5 overflow-hidden flex">
        <div
          className="h-full bg-green-500 transition-all duration-700"
          style={{ width: `${recvPct}%` }}
          title={`Received: ${fmt(received)}`}
        />
        <div
          className="h-full bg-orange-500/80 transition-all duration-700"
          style={{ width: `${owedPct}%` }}
          title={`Outstanding: ${fmt(receivable)}`}
        />
      </div>
      <div className="flex gap-4 mt-2">
        <span className="flex items-center gap-1.5 text-xs text-white/40">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Received
        </span>
        <span className="flex items-center gap-1.5 text-xs text-white/40">
          <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" /> Outstanding
        </span>
        <span className="flex items-center gap-1.5 text-xs text-white/40">
          <span className="w-2 h-2 rounded-full bg-white/10 inline-block" /> Unbilled
        </span>
      </div>
    </div>
  );
}

function CustomerChart({ customers }) {
  if (!customers || customers.length === 0) return null;
  const maxBilled = Math.max(...customers.map(c => c.total_billed), 1);

  return (
    <div className="card p-5">
      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
        <BarChart2 size={16} className="text-gold-400" /> Customer Breakdown
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-white/40 border-b border-white/5 text-right">
              <th className="py-2 pr-3 text-left">Customer</th>
              <th className="py-2 px-2">Cars</th>
              <th className="py-2 px-2">Total Billed</th>
              <th className="py-2 px-2">Received</th>
              <th className="py-2 px-2">Balance</th>
              <th className="py-2 pl-3 text-left w-40">Collection</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(c => {
              const neg = c.balance < 0;
              const collPct = pct(c.total_received, c.total_billed);
              return (
                <tr key={c.id} className="border-b border-white/5 hover:bg-white/2">
                  <td className="py-2.5 pr-3">
                    <p className="text-white font-medium">{c.name}</p>
                    {c.country && <p className="text-white/30 text-xs">{c.country}</p>}
                  </td>
                  <td className="py-2.5 px-2 text-right text-white/70">{c.purchases}</td>
                  <td className="py-2.5 px-2 text-right text-white">{fmt(c.total_billed)}</td>
                  <td className="py-2.5 px-2 text-right text-green-400">{fmt(c.total_received)}</td>
                  <td className={`py-2.5 px-2 text-right font-semibold ${neg ? 'text-orange-400' : 'text-green-400'}`}>
                    {neg ? fmt(Math.abs(c.balance)) : '+' + fmt(c.balance)}
                    <span className="text-white/30 font-normal"> {neg ? 'owed' : 'credit'}</span>
                  </td>
                  <td className="py-2.5 pl-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-green-500 transition-all duration-500"
                          style={{ width: `${collPct}%` }}
                        />
                      </div>
                      <span className="text-white/40 w-8 text-right">{collPct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-5 space-y-2.5">
        <p className="text-white/40 text-xs uppercase tracking-widest mb-3">Billed Comparison</p>
        {customers.map(c => (
          <div key={c.id} className="flex items-center gap-3">
            <span className="text-white/60 text-xs w-24 truncate shrink-0">{c.name}</span>
            <div className="flex-1 h-5 bg-white/5 rounded overflow-hidden relative">
              <div
                className="absolute inset-y-0 left-0 bg-white/10 rounded"
                style={{ width: `${pct(c.total_billed, maxBilled)}%` }}
              />
              <div
                className="absolute inset-y-0 left-0 bg-green-500/60 rounded"
                style={{ width: `${pct(c.total_received, maxBilled)}%` }}
              />
            </div>
            <span className="text-white/50 text-xs w-24 text-right shrink-0">{fmt(c.total_billed)}</span>
          </div>
        ))}
        <div className="flex gap-4 mt-2">
          <span className="flex items-center gap-1.5 text-xs text-white/30">
            <span className="w-2 h-2 rounded-full bg-white/20 inline-block" /> Billed
          </span>
          <span className="flex items-center gap-1.5 text-xs text-white/30">
            <span className="w-2 h-2 rounded-full bg-green-500/60 inline-block" /> Received
          </span>
        </div>
      </div>
    </div>
  );
}

function RevenueChart({ data, isFiltered }) {
  const hasData = data && data.length > 0;
  const maxRevenue = hasData ? Math.max(...data.map(m => Number(m.revenue)), 1) : 1;
  const maxSales   = hasData ? Math.max(...data.map(m => Number(m.sales)),   1) : 1;

  return (
    <div className="card p-5">
      <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
        <TrendingUp size={16} className="text-gold-500" /> Revenue by Month
      </h3>
      <p className="text-white/30 text-xs mb-5">
        {isFiltered ? 'Filtered date range' : 'Last 12 months'} · commission per auction month
      </p>

      {!hasData ? (
        <div className="h-40 flex items-center justify-center">
          <p className="text-white/20 text-sm">No revenue data for this period</p>
        </div>
      ) : (
        <>
          <div className="flex items-end gap-1.5 h-40 mb-2">
            {data.map(m => {
              const h  = (Number(m.revenue) / maxRevenue) * 100;
              const sH = (Number(m.sales)   / maxSales)   * 100;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-dark-200 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <p className="text-gold-400 font-semibold">{fmt(m.revenue)}</p>
                    <p className="text-white/50">{m.sales} car{m.sales !== 1 ? 's' : ''}</p>
                  </div>
                  <div
                    className="w-1.5 rounded-full bg-blue-400/50 mb-0.5"
                    style={{ height: `${Math.max(4, sH)}%` }}
                  />
                  <div
                    className="w-full rounded-t bg-gold-500/70 group-hover:bg-gold-500 transition-colors"
                    style={{ height: `${Math.max(4, h)}%` }}
                  />
                  <span className="text-white/30 text-xs mt-1">{m.month.slice(5)}</span>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between text-xs text-white/20 mt-1 border-t border-white/5 pt-2">
            <span>0</span>
            <span className="flex gap-3">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gold-500/70 inline-block" /> Revenue</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400/50 inline-block" /> Cars sold</span>
            </span>
            <span>{fmt(maxRevenue)}</span>
          </div>
        </>
      )}
    </div>
  );
}

function CommissionBreakdown({ customers }) {
  if (!customers || customers.length === 0) return null;
  const total = customers.reduce((s, c) => s + c.total_commission, 0);
  if (!total) return null;

  const colors = ['bg-gold-500', 'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-pink-500', 'bg-cyan-500'];

  return (
    <div className="card p-5">
      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
        <TrendingUp size={16} className="text-gold-400" /> Commission by Customer
      </h3>
      <div className="space-y-3">
        {customers.map((c, i) => {
          const p = pct(c.total_commission, total);
          return (
            <div key={c.id}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white/70">{c.name}</span>
                <span className="text-white/50">{fmt(c.total_commission)} <span className="text-white/30">({p}%)</span></span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${colors[i % colors.length]} transition-all duration-500`}
                  style={{ width: `${p}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 pt-3 border-t border-white/5 flex justify-between text-xs">
        <span className="text-white/40">Total Commission</span>
        <span className="text-gold-400 font-semibold">{fmt(total)}</span>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [draft,   setDraft]   = useState(EMPTY);
  const [applied, setApplied] = useState(EMPTY);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (applied.dateFrom) params.date_from = applied.dateFrom;
    if (applied.dateTo)   params.date_to   = applied.dateTo;
    if (applied.userId)   params.user_id   = applied.userId;
    if (applied.country)  params.country   = applied.country;

    getAdminStats(params)
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load stats'))
      .finally(() => setLoading(false));
  }, [applied]);

  const handleApply = () => setApplied({ ...draft });
  const handleClear = () => { setDraft(EMPTY); setApplied(EMPTY); };

  const hasActive = applied.dateFrom || applied.dateTo || applied.userId || applied.country;

  if (!data && loading) return (
    <div className="page-container">
      <div className="skeleton h-16 rounded-2xl mb-6" />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {Array.from({ length: 10 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
      </div>
    </div>
  );

  if (!data) return null;

  const {
    stats, recent_purchases, monthly_revenue, in_transit,
    stock_by_make, customer_summary = [], users_list = [], countries_list = [],
  } = data;

  const statCards = [
    { label: 'Total Users',   value: stats.total_users,                                              icon: Users,       color: 'text-blue-400',   bg: 'bg-blue-500/10',   to: '/admin/users' },
    { label: 'Purchases',     value: stats.total_purchases,                                          icon: ShoppingBag, color: 'text-emerald-400', bg: 'bg-emerald-500/10',to: '/admin/purchases' },
    { label: 'Remittance In', value: fmt(stats.total_received),                                     icon: DollarSign,  color: 'text-green-400',   bg: 'bg-green-500/10',  to: '/admin/remittances' },
    { label: 'Receivable',    value: fmt(stats.receivable_amount),                                   icon: AlertCircle, color: 'text-orange-400',  bg: 'bg-orange-500/10', to: '/admin/accounting' },
    { label: 'Revenue',       value: fmt(stats.total_revenue),                                       icon: TrendingUp,  color: 'text-gold-400',    bg: 'bg-gold-500/10',   to: '/admin/purchases' },
    { label: 'In Transit',    value: stats.in_transit_count || 0,                                    icon: Ship,        color: 'text-cyan-400',    bg: 'bg-cyan-500/10',   to: '/admin/shipments' },
    { label: 'Proforma Due',  value: fmt(stats.proforma_unpaid),                                     icon: Receipt,     color: 'text-orange-400',  bg: 'bg-orange-500/10', to: '/admin/invoices' },
    { label: 'Final Inv Due', value: fmt(stats.final_unpaid),                                        icon: BookOpen,    color: 'text-red-400',     bg: 'bg-red-500/10',    to: '/admin/invoices' },
    { label: 'Pending Bids',  value: stats.pending_bids,                                             icon: Clock,       color: 'text-amber-400',   bg: 'bg-amber-500/10',  to: '/admin/bids' },
    { label: 'Parts Orders',  value: stats.total_parts,                                              icon: Package,     color: 'text-pink-400',    bg: 'bg-pink-500/10',   to: '/admin/parts' },
  ];

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of NipponBid platform</p>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex items-center gap-2 text-white/60 text-sm font-medium shrink-0 self-center">
            <Filter size={14} className="text-gold-400" />
            <span>Filter</span>
            {hasActive && (
              <span className="bg-gold-500/20 text-gold-400 text-xs px-2 py-0.5 rounded-full">Active</span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-white/30 text-xs">From</label>
            <input
              type="date"
              value={draft.dateFrom}
              onChange={e => setDraft(d => ({ ...d, dateFrom: e.target.value }))}
              className="input-field text-xs py-1.5 px-2 w-36"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-white/30 text-xs">To</label>
            <input
              type="date"
              value={draft.dateTo}
              onChange={e => setDraft(d => ({ ...d, dateTo: e.target.value }))}
              className="input-field text-xs py-1.5 px-2 w-36"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-white/30 text-xs">Customer</label>
            <div className="relative">
              <select
                value={draft.userId}
                onChange={e => setDraft(d => ({ ...d, userId: e.target.value }))}
                className="input-field text-xs py-1.5 pl-2 pr-7 appearance-none min-w-[150px]"
              >
                <option value="">All Customers</option>
                {users_list.map(u => (
                  <option key={u.id} value={u.id}>{u.name}{u.country ? ` (${u.country})` : ''}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-white/30 text-xs">Country</label>
            <div className="relative">
              <select
                value={draft.country}
                onChange={e => setDraft(d => ({ ...d, country: e.target.value }))}
                className="input-field text-xs py-1.5 pl-2 pr-7 appearance-none min-w-[130px]"
              >
                <option value="">All Countries</option>
                {countries_list.map(c => (
                  <option key={c.country} value={c.country}>{c.country}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-end gap-2 pb-0.5">
            <button onClick={handleApply} className="btn-primary text-xs py-2 px-5">
              Apply
            </button>
            {hasActive && (
              <button
                onClick={handleClear}
                className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors py-2"
              >
                <X size={13} /> Clear
              </button>
            )}
          </div>

          {loading && (
            <span className="text-white/30 text-xs self-center ml-auto">Refreshing…</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {statCards.map(({ label, value, icon: Icon, color, bg, to }) => (
          <Link key={label} to={to} className="card-hover p-4">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon size={16} className={color} />
              </div>
            </div>
            <p className="text-white font-black text-xl truncate">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            <p className="text-gray-500 text-xs mt-0.5">{label}</p>
          </Link>
        ))}
      </div>

      <div className="mb-6">
        <FinancialBar
          billed={stats.total_billed || 0}
          received={stats.total_received || 0}
          receivable={stats.receivable_amount || 0}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <RevenueChart data={monthly_revenue} isFiltered={!!(applied.dateFrom || applied.dateTo)} />
        <CommissionBreakdown customers={customer_summary} />
      </div>

      <div className="mb-6">
        <CustomerChart customers={customer_summary} />
      </div>

      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <ShoppingBag size={16} className="text-emerald-400" /> Recent Purchases
          </h2>
          <Link to="/admin/purchases" className="text-gold-500 text-xs hover:text-gold-400 flex items-center gap-1">
            View all <ArrowRight size={12} />
          </Link>
        </div>
        {recent_purchases.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-6">No purchases found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-white/40 border-b border-white/5">
                  <th className="px-3 py-2 text-left">Car</th>
                  <th className="px-3 py-2 text-left">Client</th>
                  <th className="px-3 py-2 text-left">Country</th>
                  <th className="px-3 py-2 text-left">Auction Date</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-right">Commission</th>
                </tr>
              </thead>
              <tbody>
                {recent_purchases.map(p => (
                  <tr key={p.id} className="border-b border-white/5 hover:bg-white/2">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {p.image_url && (
                          <img src={resolveImageUrl(p.image_url.split(',')[0].trim())} alt="" className="w-10 h-8 rounded object-cover shrink-0" />
                        )}
                        <span className="text-white font-medium">{p.make} {p.model} {p.year}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-white/60">{p.user_name}</td>
                    <td className="px-3 py-2 text-white/40">{p.user_country || '—'}</td>
                    <td className="px-3 py-2 text-white/50">
                      {p.auction_date ? format(new Date(p.auction_date), 'dd MMM yy') : '—'}
                    </td>
                    <td className="px-3 py-2 text-right text-white">
                      {fmt(p.total)}
                    </td>
                    <td className="px-3 py-2 text-right text-gold-400">
                      {fmt(p.commission)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {in_transit && in_transit.length > 0 && (
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Ship size={16} className="text-cyan-400" /> In Transit ({stats.in_transit_count})
            </h2>
            <Link to="/admin/shipments" className="text-gold-500 text-xs hover:text-gold-400 flex items-center gap-1">
              Manage <ArrowRight size={12} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-white/40 border-b border-white/5">
                  <th className="px-3 py-2 text-left">Car</th>
                  <th className="px-3 py-2 text-left">Client</th>
                  <th className="px-3 py-2 text-left">File</th>
                  <th className="px-3 py-2 text-left">Ship</th>
                  <th className="px-3 py-2 text-left">ETA</th>
                  <th className="px-3 py-2 text-left">Port</th>
                </tr>
              </thead>
              <tbody>
                {in_transit.map(r => (
                  <tr key={r.purchase_id} className="border-b border-white/5 hover:bg-white/2">
                    <td className="px-3 py-2 text-white">{r.year} {r.make} {r.model}</td>
                    <td className="px-3 py-2 text-white/60">{r.user_name}</td>
                    <td className="px-3 py-2 text-gold-400 font-mono">{r.file_code || '—'}</td>
                    <td className="px-3 py-2 text-white/60">{r.ship_name || '—'}</td>
                    <td className="px-3 py-2 text-white/60">
                      {r.eta ? format(new Date(r.eta), 'dd MMM yy') : '—'}
                    </td>
                    <td className="px-3 py-2 text-white/60">{r.port_of_discharge || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {stock_by_make && stock_by_make.length > 0 && (
        <div className="card p-5">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <ShoppingBag size={16} className="text-gold-500" /> Stock by Make
          </h2>
          <div className="flex flex-wrap gap-3">
            {stock_by_make.map(s => (
              <div key={s.make} className="bg-dark-400 rounded-xl px-4 py-2.5 flex items-center gap-2">
                <span className="text-white font-medium">{s.make}</span>
                <span className="text-gold-400 font-bold">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
