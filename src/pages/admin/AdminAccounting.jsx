import { useEffect, useState } from 'react'
import { getAccountingSummary, getUserLedger, getAdminUsers, adminDownloadAccountExcel, adminDownloadAllAccountsExcel } from '../../services/api'
import { Wallet, Download, ChevronRight } from 'lucide-react'
import Drawer from '../../components/Drawer'
import toast from 'react-hot-toast'

const fmt = (n) => Number(n || 0).toLocaleString()
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const TYPE_BADGE = {
  purchase: 'badge-red',
  remittance: 'badge-green',
  invoice: 'badge-blue',
  adjustment: 'badge-grey',
}

export default function AdminAccounting() {
  const [summary, setSummary] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [ledger, setLedger] = useState(null)
  const [ledgerLoading, setLedgerLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    getAccountingSummary()
      .then(r => setSummary(r.data?.summary || r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const openUser = (u) => {
    setSelected(u)
    setLedger(null)
    setLedgerLoading(true)
    getUserLedger(u.user_id)
      .then(r => setLedger(r.data?.ledger || []))
      .catch(() => setLedger([]))
      .finally(() => setLedgerLoading(false))
  }

  const [exportingAll, setExportingAll] = useState(false)

  const handleExport = async (userId) => {
    try {
      const r = await adminDownloadAccountExcel(userId)
      const a = document.createElement('a')
      a.href = URL.createObjectURL(new Blob([r.data]))
      a.download = `account-${userId}.xlsx`
      a.click()
    } catch { toast.error('Export failed') }
  }

  const handleExportAll = async () => {
    setExportingAll(true)
    try {
      const r = await adminDownloadAllAccountsExcel()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(new Blob([r.data]))
      a.download = `nipponbid-all-accounts-${Date.now()}.xlsx`
      a.click()
    } catch { toast.error('Export failed') }
    finally { setExportingAll(false) }
  }

  const ledgerBalance = ledger?.length ? ledger[ledger.length - 1].balance : null

  return (
    <>
      <div className="space-y-4 animate-slide-up">
        <div className="page-header">
          <h1 className="page-title">Accounting</h1>
          <button className="btn btn-secondary" onClick={handleExportAll} disabled={exportingAll}>
            <Download size={15} />
            {exportingAll ? 'Exporting…' : 'Export All'}
          </button>
        </div>

        <div className="card">
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-12 rounded" />)}</div>
          ) : summary.length === 0 ? (
            <div className="py-16 text-center">
              <Wallet size={32} className="mx-auto text-grey-300 mb-3" />
              <p className="text-grey-500 text-sm">No accounting data</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead><tr>
                  <th>User</th>
                  <th>Country</th>
                  <th>Total Billed</th>
                  <th>Total Paid</th>
                  <th>Balance</th>
                  <th></th>
                </tr></thead>
                <tbody>
                  {summary.map(u => (
                    <tr key={u.user_id} onClick={() => openUser(u)} className="cursor-pointer">
                      <td>
                        <p className="font-semibold text-navy">{u.name}</p>
                        <p className="text-xs text-grey-400">{u.email}</p>
                      </td>
                      <td>{u.country || '—'}</td>
                      <td className="font-mono">¥ {fmt(u.total_billed || u.total_debit)}</td>
                      <td className="font-mono text-green">¥ {fmt(u.total_paid || u.total_credit)}</td>
                      <td className={`font-mono font-semibold ${(u.balance || 0) >= 0 ? 'text-green' : 'text-red'}`}>
                        ¥ {fmt(Math.abs(u.balance || 0))}
                      </td>
                      <td>
                        <ChevronRight size={15} className="text-grey-400" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.name || ''} subtitle="Ledger Detail" width={520}>
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                {ledgerBalance !== null && (
                  <p className={`text-2xl font-bold font-mono ${ledgerBalance >= 0 ? 'text-green' : 'text-red'}`}>
                    ¥ {fmt(Math.abs(ledgerBalance))}
                  </p>
                )}
                <p className="text-xs text-grey-500">{ledgerBalance >= 0 ? 'Credit' : 'Outstanding'}</p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => handleExport(selected.user_id)}>
                <Download size={13} /> Export Excel
              </button>
            </div>

            {ledgerLoading ? (
              <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-10 rounded" />)}</div>
            ) : ledger && ledger.length > 0 ? (
              <div className="card divide-y divide-grey-100">
                {[...ledger].reverse().map((e, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`badge ${TYPE_BADGE[e.entry_type] || 'badge-grey'}`}>{e.entry_type}</span>
                        <span className="text-xs font-mono text-grey-400">{e.ref}</span>
                      </div>
                      <p className="text-xs text-grey-600 truncate">{e.description}</p>
                      <p className="text-xs text-grey-400">{fmtDate(e.entry_date)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-mono font-semibold ${e.credit > 0 ? 'text-green' : 'text-red'}`}>
                        {e.credit > 0 ? '+' : '-'}¥ {fmt(e.credit || e.debit)}
                      </p>
                      <p className={`text-xs font-mono ${e.balance >= 0 ? 'text-green' : 'text-red'}`}>
                        bal: ¥ {fmt(Math.abs(e.balance))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-grey-400 text-center py-8">No ledger entries</p>
            )}
          </div>
        )}
      </Drawer>
    </>
  )
}
