import { useEffect, useState } from 'react'
import { getMyLedger } from '../services/api'
import { Wallet, TrendingUp, TrendingDown, Download } from 'lucide-react'

const fmt = (n) => Number(n || 0).toLocaleString()
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const TYPE_BADGE = {
  purchase: 'badge-red',
  remittance: 'badge-green',
  invoice: 'badge-blue',
  adjustment: 'badge-grey',
}

export default function Accounting() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMyLedger()
      .then(r => setEntries(r.data?.ledger || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const balance = entries.length ? entries[entries.length - 1].balance : 0
  const totalCredit = entries.reduce((s, e) => s + Number(e.credit || 0), 0)
  const totalDebit = entries.reduce((s, e) => s + Number(e.debit || 0), 0)

  const downloadCSV = () => {
    const rows = [
      ['Date', 'Ref', 'Description', 'Debit', 'Credit', 'Balance'],
      ...entries.map(e => [e.entry_date, e.ref, e.description, e.debit, e.credit, e.balance]),
    ]
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'ledger.csv'
    a.click()
  }

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Accounting</h1>
          <p className="page-subtitle">Running ledger</p>
        </div>
        <button className="btn btn-secondary" onClick={downloadCSV} disabled={entries.length === 0}>
          <Download size={15} /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-label">Balance</span>
            {balance >= 0 ? <TrendingUp size={16} className="text-green" /> : <TrendingDown size={16} className="text-red" />}
          </div>
          <p className={`stat-value ${balance >= 0 ? 'text-green' : 'text-red'}`}>¥ {fmt(Math.abs(balance))}</p>
          <p className="text-xs text-grey-500">{balance >= 0 ? 'Credit' : 'Outstanding'}</p>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Payments</span>
          <p className="stat-value text-green">¥ {fmt(totalCredit)}</p>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Charges</span>
          <p className="stat-value text-red">¥ {fmt(totalDebit)}</p>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="p-6 space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="skeleton h-10 rounded" />)}</div>
        ) : entries.length === 0 ? (
          <div className="py-16 text-center">
            <Wallet size={32} className="mx-auto text-grey-300 mb-3" />
            <p className="text-grey-500 text-sm">No ledger entries</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead><tr>
                <th>Date</th>
                <th>Type</th>
                <th>Ref</th>
                <th>Description</th>
                <th className="text-right">Bid Price</th>
                <th className="text-right">Others</th>
                <th className="text-right">Commission</th>
                <th className="text-right">Debit</th>
                <th className="text-right">Credit</th>
                <th className="text-right">Balance</th>
              </tr></thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={i}>
                    <td>{fmtDate(e.entry_date)}</td>
                    <td><span className={`badge ${TYPE_BADGE[e.entry_type] || 'badge-grey'}`}>{e.entry_type}</span></td>
                    <td className="font-mono text-xs">{e.ref}</td>
                    <td className="max-w-[200px] truncate">{e.description}</td>
                    <td className="text-right font-mono text-xs">
                      {e.entry_type === 'purchase' ? `¥ ${fmt(e.bid_price)}` : '—'}
                    </td>
                    <td className="text-right font-mono text-xs">
                      {e.entry_type === 'purchase' ? `¥ ${fmt(e.others)}` : '—'}
                    </td>
                    <td className="text-right font-mono text-xs">
                      {e.entry_type === 'purchase' ? `¥ ${fmt(e.commission)}` : '—'}
                    </td>
                    <td className="text-right font-mono">
                      {e.debit > 0 ? <span className="text-red">¥ {fmt(e.debit)}</span> : '—'}
                    </td>
                    <td className="text-right font-mono">
                      {e.credit > 0 ? <span className="text-green">¥ {fmt(e.credit)}</span> : '—'}
                    </td>
                    <td className={`text-right font-mono font-semibold ${e.balance >= 0 ? 'text-green' : 'text-red'}`}>
                      ¥ {fmt(Math.abs(e.balance))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
