import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { getAdminStats, getMyJapanBids, getMyJapanPurchases, getMyParts } from '../services/api'
import toast from 'react-hot-toast'

function fmtJpy(n) {
  const num = parseFloat(n)
  if (!num && num !== 0) return '¥0'
  return `¥${Math.round(num).toLocaleString()}`
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function BarChart({ data }) {
  const now = new Date()
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return { key, label: MONTH_NAMES[d.getMonth()], revenue: 0, sales: 0 }
  })

  if (data && data.length > 0) {
    data.forEach(d => {
      const slot = months.find(m => m.key === d.month)
      if (slot) { slot.revenue = Number(d.revenue) || 0; slot.sales = Number(d.sales) || 0 }
    })
  }

  const maxVal    = Math.max(...months.map(m => m.revenue), 1)
  const hasAnyVal = months.some(m => m.revenue > 0)

  const gridLines = [25, 50, 75, 100]

  return (
    <div className="relative">
      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none" style={{ bottom: 28, top: 0 }}>
        {gridLines.slice().reverse().map(g => (
          <div key={g} className="flex items-center gap-2 w-full">
            <span className="text-[9px] text-on-surface-variant/50 w-10 text-right shrink-0">
              {hasAnyVal ? fmtJpy((maxVal * g) / 100) : ''}
            </span>
            <div className="flex-1 border-t border-outline-variant/30 border-dashed" />
          </div>
        ))}
      </div>

      <div className="flex items-end gap-[6px] h-[220px] pb-7 pl-12">
        {months.map((m, i) => {
          const isLatest  = i === months.length - 1
          const hasRev    = m.revenue > 0
          const barHeight = hasRev ? Math.max(6, Math.round((m.revenue / maxVal) * 100)) : 0

          return (
            <div key={m.key} className="flex-1 flex flex-col items-center justify-end gap-1 group h-full">
              {hasRev && (
                <div className="absolute bottom-[calc(100%+4px)] left-1/2 -translate-x-1/2 bg-primary text-white rounded-lg px-2 py-1.5 text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-lg text-center">
                  <p className="font-bold">{fmtJpy(m.revenue)}</p>
                  {m.sales > 0 && <p className="text-white/60">{m.sales} car{m.sales !== 1 ? 's' : ''}</p>}
                </div>
              )}

              <div className="relative w-full flex items-end justify-end flex-1">
                <div className="absolute bottom-0 w-full rounded-t bg-surface-container" style={{ height: '100%' }} />
                {hasRev && (
                  <div
                    className="relative w-full rounded-t transition-all duration-500"
                    style={{
                      height: `${barHeight}%`,
                      background: isLatest
                        ? '#b7102a'
                        : 'linear-gradient(to top, #0F1729cc, #457b9dcc)',
                    }}
                  />
                )}
              </div>

              <span className={`text-[10px] leading-none ${isLatest ? 'text-secondary font-bold' : 'text-on-surface-variant'}`}>
                {m.label}
              </span>
            </div>
          )
        })}
      </div>

      {!hasAnyVal && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-body-sm text-on-surface-variant">No revenue data yet</p>
        </div>
      )}
    </div>
  )
}

function MakeBars({ makes }) {
  if (!makes || makes.length === 0) {
    return <p className="text-body-sm text-on-surface-variant text-center py-md">No stock data available</p>
  }
  const maxCount = Math.max(...makes.map(m => m.count), 1)
  const total    = makes.reduce((s, m) => s + m.count, 0)
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

const PIE_DATA = [
  { label: 'USS Tokyo',   pct: 40, color: '#0F1729' },
  { label: 'TAA Group',   pct: 30, color: '#457b9d' },
  { label: 'JU Network',  pct: 20, color: '#76777d' },
  { label: 'Others',      pct: 10, color: '#c6c6cd' },
]

function DonutChart({ winRate }) {
  const cx = 80, cy = 80, r = 60, strokeW = 28
  const circ = 2 * Math.PI * r
  let offset = 0
  return (
    <div className="flex flex-col items-center">
      <svg width="160" height="160" viewBox="0 0 160 160">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e1e3e4" strokeWidth={strokeW} />
        {PIE_DATA.map((seg, i) => {
          const dashLen = (seg.pct / 100) * circ
          offset += seg.pct
          return (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                    stroke={seg.color} strokeWidth={strokeW}
                    strokeDasharray={`${dashLen} ${circ}`}
                    strokeDashoffset={circ / 4 - (offset - seg.pct) * (circ / 100)}
                    transform="rotate(-90 80 80)" />
          )
        })}
        <text x="80" y="76" textAnchor="middle" fontSize="12" fill="#191c1d" fontWeight="700">{winRate}%</text>
        <text x="80" y="92" textAnchor="middle" fontSize="10" fill="#76777d">Win Rate</text>
      </svg>
      <div className="grid grid-cols-2 gap-x-lg gap-y-[6px] mt-sm w-full">
        {PIE_DATA.map(s => (
          <div key={s.label} className="flex items-center gap-xs">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <span className="text-label-sm text-on-surface-variant truncate">{s.label}</span>
            <span className="text-label-sm font-bold text-on-surface ml-auto">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Analytics() {
  const { user } = useAuth()
  const isAdmin     = user?.role === 'admin'
  const pageRef     = useRef(null)
  const [exporting, setExporting] = useState(false)

  const [loading, setLoading]  = useState(true)
  const [stats, setStats]      = useState(null)
  const [monthlyRev, setMonthlyRev] = useState([])
  const [stockMakes, setStockMakes] = useState([])
  const [winRateByHouse, setWinRateByHouse] = useState([])
  const [bidSummary, setBidSummary] = useState(null)
  const [kpis, setKpis]        = useState({
    revenue: '—', cars: 0, winRate: '—', avgPrice: '—'
  })

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
        scale: 2,
        useCORS: true,
        backgroundColor: '#f1f3f5',
        logging: false,
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const imgW  = pageW
      const imgH  = (canvas.height * imgW) / canvas.width
      let yPos    = 0
      let remaining = imgH

      while (remaining > 0) {
        pdf.addImage(imgData, 'PNG', 0, -yPos, imgW, imgH)
        remaining -= pageH
        yPos      += pageH
        if (remaining > 0) pdf.addPage()
      }

      const date = new Date().toISOString().slice(0, 10)
      pdf.save(`nipponbid-analytics-${date}.pdf`)
      toast.success('PDF downloaded!', { id: 'pdf' })
    } catch (err) {
      console.error(err)
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
          setStats(s)
          setMonthlyRev(data.monthly_revenue ?? [])
          setStockMakes(data.stock_by_make   ?? [])

          const totalBids = (s.pending_bids ?? 0) + (s.won_bids ?? 0) + (s.lost_bids ?? 0)
          const winRate   = totalBids > 0 ? Math.round(((s.won_bids ?? 0) / totalBids) * 100) : '—'
          const avgPrice  = s.total_purchases > 0
            ? fmtJpy((s.total_billed ?? 0) / s.total_purchases)
            : '—'

          setKpis({
            revenue:  fmtJpy(s.total_revenue  ?? 0),
            cars:     s.total_purchases         ?? 0,
            winRate:  winRate === '—' ? '—' : `${winRate}%`,
            avgPrice,
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

          const totalSpent = allPurchases.reduce((s, p) => s + (Number(p.total) || 0), 0)
          const avgPriceNum = allPurchases.length > 0 ? totalSpent / allPurchases.length : 0

          setKpis({
            revenue:  totalSpent > 0 ? fmtJpy(totalSpent) : '—',
            cars:     allPurchases.length,
            winRate:  winRate === '—' ? '—' : `${winRate}%`,
            avgPrice: avgPriceNum > 0 ? fmtJpy(avgPriceNum) : '—',
          })

          setBidSummary({
            won, lost, pending, total: allBids.length,
          })

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
              .sort(([, a], [, b]) => b - a)
              .slice(0, 8)
              .map(([make, count]) => ({ make, count }))
          )

          const houseMap = {}
          allBids.forEach(b => {
            if (!b.auction_house) return
            if (!houseMap[b.auction_house]) houseMap[b.auction_house] = { won: 0, lost: 0, total: 0 }
            houseMap[b.auction_house].total++
            if (b.status === 'won')  houseMap[b.auction_house].won++
            if (b.status === 'lost') houseMap[b.auction_house].lost++
          })
          setWinRateByHouse(
            Object.entries(houseMap)
              .filter(([, d]) => d.won + d.lost > 0)
              .map(([house, d]) => ({
                house,
                rate: Math.round((d.won / (d.won + d.lost)) * 100),
              }))
              .sort((a, b) => b.rate - a.rate)
          )
        }
      } catch (e) {
        console.error('Analytics load error:', e)
        toast.error('Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [isAdmin])

  const winRateNum = typeof kpis.winRate === 'string' && kpis.winRate.endsWith('%')
    ? parseInt(kpis.winRate)
    : 68

  return (
    <div ref={pageRef} className="p-lg bg-background min-h-full">
      <div className="flex justify-end items-center gap-sm mb-lg">
        <button className="flex items-center gap-xs px-md py-[9px] bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm font-semibold text-on-surface hover:bg-surface-container transition-colors">
          <span className="material-symbols-outlined text-[16px]">calendar_today</span>
          Last 12 Months
          <span className="material-symbols-outlined text-[14px]">expand_more</span>
        </button>
        <button
          onClick={handleExportPDF}
          disabled={exporting || loading}
          className="flex items-center gap-xs px-md py-[9px] bg-primary text-white rounded-lg text-body-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
        >
          {exporting
            ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <span className="material-symbols-outlined text-[16px]">download</span>
          }
          {exporting ? 'Generating…' : 'Export PDF'}
        </button>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-md mb-lg">
        {[
          { label: isAdmin ? 'Total Revenue'      : 'Total Spent',      val: kpis.revenue,  icon: 'payments' },
          { label: isAdmin ? 'Cars Purchased'     : 'Cars Won',          val: kpis.cars,     icon: 'directions_car' },
          { label: 'Auction Win Rate',                                    val: kpis.winRate,  icon: 'emoji_events' },
          { label: isAdmin ? 'Avg Purchase Price' : 'Avg Price Paid',    val: kpis.avgPrice, icon: 'calculate' },
        ].map(k => (
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
              : <p className="text-[26px] font-bold text-on-surface font-mono-data leading-tight mt-0.5">{k.val}</p>
            }
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-md mb-md">
        <div className="col-span-12 xl:col-span-7 bg-surface-container-lowest rounded-xl shadow border border-outline-variant/30 p-md">
          <div className="flex justify-between items-center mb-md">
            <h3 className="text-headline-sm font-semibold text-primary">
              {isAdmin ? 'Monthly Revenue' : 'Monthly Spending'}
            </h3>
            <span className="text-label-sm text-on-surface-variant">Last 12 months · ¥</span>
          </div>
          {loading
            ? <div className="h-[180px] rounded skeleton" />
            : <BarChart data={monthlyRev} />
          }
        </div>

        <div className="col-span-12 xl:col-span-5 bg-surface-container-lowest rounded-xl shadow border border-outline-variant/30 p-md">
          <div className="flex justify-between items-center mb-md">
            <h3 className="text-headline-sm font-semibold text-primary">
              {isAdmin ? 'By Auction House' : 'Bid Activity'}
            </h3>
            <span className="text-label-sm text-on-surface-variant">
              {isAdmin ? 'Estimated' : 'All time'}
            </span>
          </div>
          {isAdmin ? (
            <DonutChart winRate={winRateNum} />
          ) : loading ? (
            <div className="h-[180px] rounded skeleton" />
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

      <div className="grid grid-cols-12 gap-md mb-md">
        <div className="col-span-12 xl:col-span-6 bg-surface-container-lowest rounded-xl shadow border border-outline-variant/30 p-md">
          <h3 className="text-headline-sm font-semibold text-primary mb-md">
            {isAdmin ? 'Top Makes Purchased' : 'My Purchased Makes'}
          </h3>
          {loading
            ? <div className="space-y-sm">{[...Array(5)].map((_, i) => <div key={i} className="h-8 rounded skeleton" />)}</div>
            : <MakeBars makes={stockMakes} />
          }
        </div>

        <div className="col-span-12 xl:col-span-6 bg-surface-container-lowest rounded-xl shadow border border-outline-variant/30 p-md">
          <h3 className="text-headline-sm font-semibold text-primary mb-md">Win Rate by Auction House</h3>
          {loading ? (
            <div className="space-y-sm">{[...Array(4)].map((_, i) => <div key={i} className="h-8 rounded skeleton" />)}</div>
          ) : (() => {
            const rows = isAdmin
              ? [
                  { house: 'USS Tokyo',   rate: 71 },
                  { house: 'TAA Group',   rate: 68 },
                  { house: 'JU Network',  rate: 65 },
                  { house: 'HAA Tokyo',   rate: 58 },
                  { house: 'LAA Okayama', rate: 52 },
                ]
              : winRateByHouse
            if (!isAdmin && rows.length === 0) {
              return <p className="text-body-sm text-on-surface-variant text-center py-md">No completed bids yet to calculate win rates</p>
            }
            return (
              <div className="space-y-sm">
                {rows.map(w => (
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
          })()}
        </div>
      </div>

      {isAdmin && !loading && stats && (
        <div className="bg-surface-container-lowest rounded-xl shadow border border-outline-variant/30 overflow-hidden">
          <div className="px-md py-sm border-b border-outline-variant/30 flex justify-between items-center">
            <h3 className="text-headline-sm font-semibold text-primary">Platform Summary</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y divide-outline-variant/20">
            {[
              { label: 'Total Users',     val: stats.total_users      ?? 0 },
              { label: 'Total Purchases', val: stats.total_purchases  ?? 0 },
              { label: 'Total Parts',     val: stats.total_parts      ?? 0 },
              { label: 'Pending Bids',    val: stats.pending_bids     ?? 0 },
              { label: 'Total Billed',    val: fmtJpy(stats.total_billed    ?? 0) },
              { label: 'Total Received',  val: fmtJpy(stats.total_received  ?? 0) },
              { label: 'Receivable',      val: fmtJpy(stats.receivable_amount ?? 0) },
              { label: 'Total Revenue',   val: fmtJpy(stats.total_revenue   ?? 0) },
            ].map(item => (
              <div key={item.label} className="px-md py-sm">
                <p className="text-label-sm text-on-surface-variant">{item.label}</p>
                <p className="text-[20px] font-bold text-on-surface font-mono-data leading-tight mt-0.5">{item.val}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
