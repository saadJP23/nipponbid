import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { getAdminStats, getMyJapanBids, getMyJapanPurchases } from '../services/api'
import toast from 'react-hot-toast'

function fmtJpy(n) {
  const num = parseFloat(n)
  if (!num && num !== 0) return '¥0'
  return `¥${Math.round(num).toLocaleString()}`
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function BarChart({ data, receivedData }) {
  const now = new Date()
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    return { key, label: MONTH_NAMES[d.getMonth()], billed: 0, received: 0, commission: 0, sales: 0, payments: 0 }
  })
  if (data) data.forEach(d => {
    const s = months.find(m => m.key === d.month)
    if (s) { s.billed = Number(d.billed)||0; s.commission = Number(d.revenue)||0; s.sales = Number(d.sales)||0 }
  })
  if (receivedData) receivedData.forEach(d => {
    const s = months.find(m => m.key === d.month)
    if (s) { s.received = Number(d.received)||0; s.payments = Number(d.payments)||0 }
  })

  const peak   = Math.max(...months.map(m => Math.max(m.billed, m.received)), 1)
  const hasAny = months.some(m => m.billed > 0 || m.received > 0)
  const fmt    = n => n >= 1e6 ? `¥${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `¥${(n/1e3).toFixed(0)}K` : `¥${n}`

  return (
    <div className="relative">
      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none" style={{ bottom: 28, top: 0 }}>
        {[100,75,50,25].map(g => (
          <div key={g} className="flex items-center gap-2 w-full">
            <span className="text-[9px] text-on-surface-variant/50 w-12 text-right shrink-0">
              {hasAny ? fmt((peak * g) / 100) : ''}
            </span>
            <div className="flex-1 border-t border-outline-variant/20 border-dashed" />
          </div>
        ))}
      </div>

      <div className="flex items-end gap-[5px] h-[220px] pb-7 pl-14">
        {months.map((m, i) => {
          const isLatest = i === months.length - 1
          const bH = m.billed   > 0 ? Math.max(4, (m.billed   / peak) * 180) : 0
          const rH = m.received > 0 ? Math.max(4, (m.received / peak) * 180) : 0
          return (
            <div key={m.key} className="flex-1 flex flex-col items-center justify-end gap-1 group h-full relative">
              {(m.billed > 0 || m.received > 0) && (
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 rounded-lg px-2.5 py-2 text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-xl"
                  style={{ background:'#0F1729', color:'#fff', minWidth:130 }}>
                  <p className="font-bold mb-0.5">{m.label} {m.key.slice(0,4)}</p>
                  {m.billed   > 0 && <p><span style={{color:'#fca5a5'}}>Billed: </span>{fmtJpy(m.billed)} ({m.sales})</p>}
                  {m.received > 0 && <p><span style={{color:'#6ee7b7'}}>Received: </span>{fmtJpy(m.received)}</p>}
                  {m.commission > 0 && <p><span style={{color:'#fbbf24'}}>Commission: </span>{fmtJpy(m.commission)}</p>}
                </div>
              )}
              <div className="w-full flex items-end justify-center gap-[2px]" style={{ height: 180 }}>
                <div className="flex-1 rounded-t transition-all duration-500" style={{ height:bH, background: isLatest?'#b7102a':'#b7102a77' }} />
                <div className="flex-1 rounded-t transition-all duration-500" style={{ height:rH, background: isLatest?'#059669':'#05966977' }} />
              </div>
              <span className={`text-[10px] leading-none ${isLatest ? 'text-secondary font-bold' : 'text-on-surface-variant'}`}>{m.label}</span>
            </div>
          )
        })}
      </div>

      {!hasAny && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-body-sm text-on-surface-variant">No data yet</p>
        </div>
      )}

      <div className="flex items-center gap-4 pl-14 mt-1 text-[11px] text-on-surface-variant">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{background:'#b7102a'}} /> Billed</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{background:'#059669'}} /> Received</span>
      </div>
    </div>
  )
}

function MakeBars({ makes }) {
  if (!makes || makes.length === 0) {
    return <p className="text-body-sm text-on-surface-variant text-center py-md">No data available</p>
  }
  const maxCount = Math.max(...makes.map(m => m.count), 1)
  return (
    <div className="space-y-sm">
      {makes.map(m => (
        <div key={m.make}>
          <div className="flex justify-between text-body-sm mb-1">
            <span className="font-semibold text-on-surface">{m.make}</span>
            <span className="font-mono-data font-bold text-on-surface">{m.count} units</span>
          </div>
          <div className="h-2 bg-surface-container rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500"
                 style={{ width: `${Math.round((m.count / maxCount) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function BidResultsChart({ bidStats }) {
  const won     = bidStats.find(s => s.status === 'won')?.count     ?? 0
  const lost    = bidStats.find(s => s.status === 'lost')?.count    ?? 0
  const pending = bidStats.find(s => s.status === 'pending')?.count ?? 0
  const total   = won + lost + pending
  const decided = won + lost
  const winRate = decided > 0 ? Math.round((won / decided) * 100) : 0

  if (total === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center">
        <p className="text-body-sm text-on-surface-variant">No bid data yet</p>
      </div>
    )
  }

  const cx = 70, cy = 70, r = 52, strokeW = 22
  const circ = 2 * Math.PI * r
  const segments = [
    { label: 'Won',     count: won,     pct: decided > 0 ? (won/total)*100 : 0,     color: '#059669' },
    { label: 'Lost',    count: lost,    pct: decided > 0 ? (lost/total)*100 : 0,    color: '#b7102a' },
    { label: 'Pending', count: pending, pct: pending > 0 ? (pending/total)*100 : 0, color: '#d97706' },
  ]

  let offset = 0
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-6">
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e1e3e4" strokeWidth={strokeW} />
          {segments.map((seg, i) => {
            const dashLen = (seg.pct / 100) * circ
            const prevOffset = offset
            offset += seg.pct
            return (
              <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                      stroke={seg.color} strokeWidth={strokeW}
                      strokeDasharray={`${dashLen} ${circ}`}
                      strokeDashoffset={circ / 4 - prevOffset * (circ / 100)}
                      transform="rotate(-90 70 70)" />
            )
          })}
          <text x="70" y="66" textAnchor="middle" fontSize="13" fill="#191c1d" fontWeight="700">{winRate}%</text>
          <text x="70" y="82" textAnchor="middle" fontSize="10" fill="#76777d">Win Rate</text>
        </svg>

        <div className="space-y-2">
          {[
            { label: 'Won',     count: won,     color: '#059669' },
            { label: 'Lost',    count: lost,    color: '#b7102a' },
            { label: 'Pending', count: pending, color: '#d97706' },
            { label: 'Total',   count: total,   color: '#76777d' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
              <span className="text-label-sm text-on-surface-variant w-14">{s.label}</span>
              <span className="text-label-sm font-bold text-on-surface font-mono-data">{s.count}</span>
            </div>
          ))}
        </div>
      </div>

      {decided > 0 && (
        <p className="text-label-sm text-on-surface-variant text-center">
          {won} won from {decided} decided bids ·{' '}
          <span className="font-bold text-green-700">{winRate}% win rate</span>
        </p>
      )}
    </div>
  )
}

function CustomerSummaryChart({ customers }) {
  if (!customers || customers.length === 0) return null
  const pct = (part, total) => (!total || !part) ? 0 : Math.min(100, Math.round((part / total) * 100))
  return (
    <div className="space-y-3">
      {customers.slice(0, 6).map(c => {
        const collPct = pct(c.total_received, c.total_billed)
        const neg = c.balance < 0
        return (
          <div key={c.id} className="p-3 rounded-xl bg-surface-container">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-body-sm font-semibold text-on-surface">{c.name}</p>
                {c.country && <p className="text-label-sm text-on-surface-variant">{c.country} · {c.purchases} car{c.purchases !== 1 ? 's' : ''}</p>}
              </div>
              <span className={`text-label-sm font-semibold px-2 py-0.5 rounded-full ${neg ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                {neg ? `¥${Math.abs(c.balance).toLocaleString()} owed` : `¥${c.balance.toLocaleString()} credit`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-green-500 transition-all duration-500" style={{ width: `${collPct}%` }} />
              </div>
              <span className="text-label-sm text-on-surface-variant w-10 text-right">{collPct}%</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-on-surface-variant">Billed: ¥{Number(c.total_billed).toLocaleString()}</span>
              <span className="text-[10px] text-green-700">Received: ¥{Number(c.total_received).toLocaleString()}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CommissionByCustomer({ customers }) {
  if (!customers || customers.length === 0) return null
  const total  = customers.reduce((s, c) => s + (c.total_commission || 0), 0)
  if (!total) return null
  const colors = ['#b7102a', '#2563eb', '#059669', '#7c3aed', '#db2777', '#0891b2']
  return (
    <div className="space-y-3">
      {customers.filter(c => c.total_commission > 0).map((c, i) => {
        const p = total > 0 ? Math.round((c.total_commission / total) * 100) : 0
        return (
          <div key={c.id}>
            <div className="flex justify-between text-body-sm mb-1">
              <span className="text-on-surface-variant truncate pr-2">{c.name}</span>
              <span className="font-mono-data text-on-surface shrink-0">¥{Number(c.total_commission).toLocaleString()} <span className="text-on-surface-variant">({p}%)</span></span>
            </div>
            <div className="h-1.5 rounded-full bg-surface-container overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${p}%`, background: colors[i % colors.length] }} />
            </div>
          </div>
        )
      })}
      <div className="pt-2 border-t border-outline-variant/30 flex justify-between text-body-sm">
        <span className="text-on-surface-variant">Total Commission</span>
        <span className="font-mono-data font-bold text-secondary">¥{Number(total).toLocaleString()}</span>
      </div>
    </div>
  )
}

export default function Analytics() {
  const { user } = useAuth()
  const isAdmin  = user?.role === 'admin'
  const pageRef  = useRef(null)
  const [exporting, setExporting] = useState(false)

  const [loading, setLoading]         = useState(true)
  const [monthlyRev, setMonthlyRev]   = useState([])
  const [monthlyReceived, setMonthlyReceived] = useState([])
  const [stockMakes, setStockMakes]   = useState([])
  const [adminBidStats, setAdminBidStats] = useState([])
  const [adminCustomers, setAdminCustomers] = useState([])
  const [winRateByHouse, setWinRateByHouse] = useState([])
  const [bidSummary, setBidSummary]   = useState(null)
  const [kpis, setKpis] = useState({ k1: '—', k2: '—', k3: '—', k4: '—' })

  const handleExportPDF = async () => {
    if (!pageRef.current || exporting) return
    setExporting(true)
    toast.loading('Generating PDF…', { id: 'pdf' })
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])
      const canvas = await html2canvas(pageRef.current, {
        scale: 2, useCORS: true, backgroundColor: '#f1f3f5', logging: false,
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const imgW  = pageW
      const imgH  = (canvas.height * imgW) / canvas.width
      let yPos = 0, remaining = imgH
      while (remaining > 0) {
        pdf.addImage(imgData, 'PNG', 0, -yPos, imgW, imgH)
        remaining -= pageH
        yPos      += pageH
        if (remaining > 0) pdf.addPage()
      }
      pdf.save(`nipponbid-analytics-${new Date().toISOString().slice(0, 10)}.pdf`)
      toast.success('PDF downloaded!', { id: 'pdf' })
    } catch (err) {
      toast.error('Failed to generate PDF', { id: 'pdf' })
    } finally {
      setExporting(false)
    }
  }

  useEffect(() => {
    const load = async () => {
      try {
        if (isAdmin) {
          const { data } = await getAdminStats()
          const s = data.stats
          setMonthlyRev(data.monthly_revenue   ?? [])
          setMonthlyReceived(data.monthly_received ?? [])
          setStockMakes(data.stock_by_make     ?? [])
          setAdminBidStats(data.bid_stats      ?? [])
          setAdminCustomers(data.customer_summary ?? [])

          setKpis({
            k1: fmtJpy(s.total_billed     ?? 0),
            k2: fmtJpy(s.total_received   ?? 0),
            k3: fmtJpy(s.receivable_amount ?? 0),
            k4: fmtJpy(s.total_revenue    ?? 0),
          })
        } else {
          const [bidsRes, purchRes] = await Promise.all([
            getMyJapanBids(),
            getMyJapanPurchases(),
          ])
          const allBids      = bidsRes.data ?? []
          const allPurchases = purchRes.data?.purchases ?? (Array.isArray(purchRes.data) ? purchRes.data : [])

          const won     = allBids.filter(b => b.status === 'won').length
          const lost    = allBids.filter(b => b.status === 'lost').length
          const pending = allBids.filter(b => b.status === 'pending').length
          const totalDecided = won + lost
          const winRate = totalDecided > 0 ? Math.round((won / totalDecided) * 100) : '—'

          const totalSpent   = allPurchases.reduce((s, p) => s + (Number(p.total) || 0), 0)
          const avgPriceNum  = allPurchases.length > 0 ? totalSpent / allPurchases.length : 0

          setKpis({
            k1: totalSpent > 0 ? fmtJpy(totalSpent) : '—',
            k2: allPurchases.length,
            k3: winRate === '—' ? '—' : `${winRate}%`,
            k4: avgPriceNum > 0 ? fmtJpy(avgPriceNum) : '—',
          })

          setBidSummary({ won, lost, pending, total: allBids.length })

          const monthlyMap = {}
          allPurchases.forEach(p => {
            const dateStr = p.auction_date || p.created_at
            if (!dateStr) return
            const month = dateStr.slice(0, 7)
            if (!monthlyMap[month]) monthlyMap[month] = { revenue: 0, sales: 0 }
            monthlyMap[month].revenue += Number(p.total) || 0
            monthlyMap[month].sales++
          })
          setMonthlyRev(
            Object.entries(monthlyMap)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([month, d]) => ({ month, revenue: d.revenue, sales: d.sales }))
          )

          const makeMap = {}
          allPurchases.forEach(p => {
            if (p.make) makeMap[p.make] = (makeMap[p.make] || 0) + 1
          })
          setStockMakes(
            Object.entries(makeMap)
              .sort(([, a], [, b]) => b - a).slice(0, 8)
              .map(([make, count]) => ({ make, count }))
          )

          const houseMap = {}
          allBids.forEach(b => {
            if (!b.auction_house) return
            if (!houseMap[b.auction_house]) houseMap[b.auction_house] = { won: 0, lost: 0 }
            if (b.status === 'won')  houseMap[b.auction_house].won++
            if (b.status === 'lost') houseMap[b.auction_house].lost++
          })
          setWinRateByHouse(
            Object.entries(houseMap)
              .filter(([, d]) => d.won + d.lost > 0)
              .map(([house, d]) => ({ house, rate: Math.round((d.won / (d.won + d.lost)) * 100) }))
              .sort((a, b) => b.rate - a.rate)
          )
        }
      } catch (e) {
        toast.error('Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [isAdmin])

  const kpiCards = isAdmin
    ? [
        { label: 'Total Billed',       val: kpis.k1, icon: 'receipt_long',    color: 'text-primary' },
        { label: 'Total Received',      val: kpis.k2, icon: 'payments',        color: 'text-green-700' },
        { label: 'Outstanding Balance', val: kpis.k3, icon: 'account_balance', color: 'text-orange-600' },
        { label: 'Commission Earned',   val: kpis.k4, icon: 'monetization_on', color: 'text-secondary' },
      ]
    : [
        { label: 'Total Spent',      val: kpis.k1, icon: 'payments',       color: 'text-primary' },
        { label: 'Cars Won',         val: kpis.k2, icon: 'directions_car', color: 'text-primary' },
        { label: 'Win Rate',         val: kpis.k3, icon: 'emoji_events',   color: 'text-primary' },
        { label: 'Avg Price Paid',   val: kpis.k4, icon: 'calculate',      color: 'text-primary' },
      ]

  return (
    <div ref={pageRef} className="p-lg bg-background min-h-full">

      {/* Header */}
      <div className="flex justify-end items-center gap-sm mb-lg">
        <button className="flex items-center gap-xs px-md py-[9px] bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm font-semibold text-on-surface hover:bg-surface-container transition-colors">
          <span className="material-symbols-outlined text-[16px]">calendar_today</span>
          Last 12 Months
          <span className="material-symbols-outlined text-[14px]">expand_more</span>
        </button>
        <button
          onClick={handleExportPDF}
          disabled={exporting || loading}
          className="flex items-center gap-xs px-md py-[9px] bg-primary text-white rounded-lg text-body-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 shadow-sm"
        >
          {exporting
            ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <span className="material-symbols-outlined text-[16px]">download</span>
          }
          {exporting ? 'Generating…' : 'Export PDF'}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-md mb-lg">
        {kpiCards.map(k => (
          <div key={k.label} className="bg-surface-container-lowest rounded-xl shadow border border-outline-variant/30 p-md">
            <div className="flex justify-between items-start mb-md">
              <div className="p-xs bg-surface-container rounded-lg">
                <span className="material-symbols-outlined text-primary text-[18px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}>{k.icon}</span>
              </div>
            </div>
            <p className="text-label-sm text-on-surface-variant">{k.label}</p>
            {loading
              ? <div className="h-7 w-20 rounded skeleton mt-0.5" />
              : <p className={`text-[26px] font-bold font-mono-data leading-tight mt-0.5 ${k.color}`}>{k.val}</p>
            }
          </div>
        ))}
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-12 gap-md mb-md">
        {/* Monthly Billed vs Received */}
        <div className="col-span-12 xl:col-span-7 bg-surface-container-lowest rounded-xl shadow border border-outline-variant/30 p-md">
          <div className="flex justify-between items-center mb-md">
            <h3 className="text-headline-sm font-semibold text-primary">
              {isAdmin ? 'Monthly Billed vs Received' : 'Monthly Spending'}
            </h3>
            <span className="text-label-sm text-on-surface-variant">Last 12 months · hover for details</span>
          </div>
          {loading
            ? <div className="h-[180px] rounded skeleton" />
            : <BarChart data={monthlyRev} receivedData={monthlyReceived} />
          }
        </div>

        {/* Bid Results / Bid Activity */}
        <div className="col-span-12 xl:col-span-5 bg-surface-container-lowest rounded-xl shadow border border-outline-variant/30 p-md">
          <div className="flex justify-between items-center mb-md">
            <h3 className="text-headline-sm font-semibold text-primary">
              {isAdmin ? 'Bid Results' : 'Bid Activity'}
            </h3>
            <span className="text-label-sm text-on-surface-variant">All time</span>
          </div>
          {loading ? (
            <div className="h-[180px] rounded skeleton" />
          ) : isAdmin ? (
            <BidResultsChart bidStats={adminBidStats} />
          ) : !bidSummary || bidSummary.total === 0 ? (
            <div className="h-[180px] flex items-center justify-center">
              <p className="text-body-sm text-on-surface-variant">No bids placed yet</p>
            </div>
          ) : (
            <div className="space-y-md pt-xs">
              {[
                { label: 'Won',     count: bidSummary.won,     color: 'bg-green-500',  textColor: 'text-green-700' },
                { label: 'Lost',    count: bidSummary.lost,    color: 'bg-red-400',    textColor: 'text-red-600' },
                { label: 'Pending', count: bidSummary.pending, color: 'bg-amber-400',  textColor: 'text-amber-600' },
                { label: 'Total',   count: bidSummary.total,   color: 'bg-primary/40', textColor: 'text-on-surface' },
              ].map(s => (
                <div key={s.label}>
                  <div className="flex justify-between text-body-sm mb-1">
                    <span className="text-on-surface-variant">{s.label}</span>
                    <span className={`font-mono-data font-bold ${s.textColor}`}>{s.count}</span>
                  </div>
                  <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${s.color} transition-all duration-500`}
                         style={{ width: `${bidSummary.total > 0 ? Math.round((s.count / bidSummary.total) * 100) : 0}%` }} />
                  </div>
                </div>
              ))}
              {bidSummary.won + bidSummary.lost > 0 && (
                <p className="text-label-sm text-on-surface-variant pt-xs border-t border-outline-variant/20">
                  Win rate: <span className="font-bold text-green-700">
                    {Math.round((bidSummary.won / (bidSummary.won + bidSummary.lost)) * 100)}%
                  </span> from {bidSummary.won + bidSummary.lost} decided bids
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Charts Row */}
      <div className="grid grid-cols-12 gap-md mb-md">
        {/* Top Makes */}
        <div className="col-span-12 xl:col-span-6 bg-surface-container-lowest rounded-xl shadow border border-outline-variant/30 p-md">
          <h3 className="text-headline-sm font-semibold text-primary mb-md">
            {isAdmin ? 'Top Makes Purchased' : 'My Purchased Makes'}
          </h3>
          {loading
            ? <div className="space-y-sm">{[...Array(5)].map((_, i) => <div key={i} className="h-8 rounded skeleton" />)}</div>
            : <MakeBars makes={stockMakes} />
          }
        </div>

        {/* Commission breakdown (admin) / Win rate by house (user) */}
        <div className="col-span-12 xl:col-span-6 bg-surface-container-lowest rounded-xl shadow border border-outline-variant/30 p-md">
          <h3 className="text-headline-sm font-semibold text-primary mb-md">
            {isAdmin ? 'Commission by Customer' : 'Win Rate by Auction House'}
          </h3>
          {loading ? (
            <div className="space-y-sm">{[...Array(4)].map((_, i) => <div key={i} className="h-8 rounded skeleton" />)}</div>
          ) : isAdmin ? (
            adminCustomers.length > 0
              ? <CommissionByCustomer customers={adminCustomers} />
              : <p className="text-body-sm text-on-surface-variant text-center py-md">No data yet</p>
          ) : (
            winRateByHouse.length === 0
              ? <p className="text-body-sm text-on-surface-variant text-center py-md">No completed bids yet</p>
              : (
                <div className="space-y-sm">
                  {winRateByHouse.map(w => (
                    <div key={w.house}>
                      <div className="flex justify-between text-body-sm mb-1">
                        <span className="text-on-surface">{w.house}</span>
                        <span className={`font-mono-data font-bold ${w.rate >= 65 ? 'text-green-700' : 'text-amber-700'}`}>{w.rate}%</span>
                      </div>
                      <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${w.rate >= 65 ? 'bg-green-500' : 'bg-amber-500'}`}
                             style={{ width: `${w.rate}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )
          )}
        </div>
      </div>

      {/* Admin: Customer Collection Summary */}
      {isAdmin && !loading && adminCustomers.length > 0 && (
        <div className="bg-surface-container-lowest rounded-xl shadow border border-outline-variant/30 p-md mb-md">
          <div className="flex items-center gap-xs mb-md">
            <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>group</span>
            <h3 className="text-headline-sm font-semibold text-primary">Customer Collection Status</h3>
          </div>
          <CustomerSummaryChart customers={adminCustomers} />
        </div>
      )}

      {/* Admin: Outstanding Alert */}
      {isAdmin && !loading && (() => {
        const outstanding = adminCustomers.filter(c => c.balance < 0)
        if (outstanding.length === 0) return null
        const totalOwed = outstanding.reduce((s, c) => s + Math.abs(c.balance), 0)
        return (
          <div className="rounded-xl p-md mb-md border border-orange-200 bg-orange-50 flex items-start gap-3">
            <span className="material-symbols-outlined text-orange-500 text-[20px] mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
            <div>
              <p className="text-body-sm font-semibold text-orange-800">
                Outstanding Balance: ¥{totalOwed.toLocaleString()}
              </p>
              <p className="text-label-sm text-orange-700 mt-0.5">
                {outstanding.length} customer{outstanding.length !== 1 ? 's' : ''} have unpaid balances —{' '}
                {outstanding.map(c => c.name).join(', ')}
              </p>
            </div>
          </div>
        )
      })()}

    </div>
  )
}
