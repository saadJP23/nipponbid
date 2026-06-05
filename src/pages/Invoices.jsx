import { useEffect, useState } from 'react'
import { getMyProformaInvoices, getMyFinalInvoices } from '../services/api'
import { Receipt, FileText } from 'lucide-react'
import Drawer from '../components/Drawer'

const fmt = (n) => Number(n || 0).toLocaleString()
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const STATUS_BADGE = { pending: 'badge-amber', partial: 'badge-blue', paid: 'badge-green', archived: 'badge-grey' }

function InvoiceRow({ inv, type, onClick }) {
  const id = type === 'proforma' ? inv.proforma_id : inv.final_invoice_id
  const no = inv.invoice_no
  const amt = inv.amount
  const paid = inv.paid_amount
  const due = Number(amt) - Number(paid)
  return (
    <tr key={id} onClick={onClick} className="cursor-pointer">
      <td className="font-mono text-xs font-semibold">{no}</td>
      <td>{fmtDate(inv.invoice_date)}</td>
      <td>{fmtDate(inv.due_date)}</td>
      <td className="font-mono">¥ {fmt(amt)}</td>
      <td className="font-mono text-green">¥ {fmt(paid)}</td>
      <td className={`font-mono font-semibold ${due > 0 ? 'text-red' : 'text-green'}`}>¥ {fmt(due)}</td>
      <td><span className={`badge ${STATUS_BADGE[inv.status] || 'badge-grey'}`}>{inv.status}</span></td>
    </tr>
  )
}

export default function Invoices() {
  const [tab, setTab] = useState('proforma')
  const [proformas, setProformas] = useState([])
  const [finals, setFinals] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([getMyProformaInvoices(), getMyFinalInvoices()])
      .then(([p, f]) => { setProformas(p.data || []); setFinals(f.data || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const list = tab === 'proforma' ? proformas : finals

  return (
    <>
      <div className="space-y-4 animate-slide-up">
        <div className="page-header">
          <h1 className="page-title">Invoices</h1>
        </div>

        <div className="flex gap-1 bg-grey-100 p-1 rounded-lg w-fit">
          {['proforma', 'final'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded text-sm font-semibold transition-colors capitalize
                ${tab === t ? 'bg-white text-navy shadow-xs' : 'text-grey-500 hover:text-navy'}`}>
              {t} Invoices
            </button>
          ))}
        </div>

        <div className="card">
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-12 rounded" />)}</div>
          ) : list.length === 0 ? (
            <div className="py-16 text-center">
              <FileText size={32} className="mx-auto text-grey-300 mb-3" />
              <p className="text-grey-500 text-sm">No {tab} invoices</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead><tr>
                  <th>Invoice No.</th>
                  <th>Date</th>
                  <th>Due Date</th>
                  <th>Amount</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                </tr></thead>
                <tbody>
                  {list.map(inv => (
                    <InvoiceRow key={tab === 'proforma' ? inv.proforma_id : inv.final_invoice_id}
                      inv={inv} type={tab} onClick={() => setSelected(inv)} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.invoice_no || 'Invoice Detail'}
        subtitle={tab === 'proforma' ? 'Proforma Invoice' : 'Final Invoice'}
        width={420}
      >
        {selected && (
          <div className="space-y-5">
            <div className="card p-4">
              {[
                ['Invoice No.', selected.invoice_no],
                ['Invoice Date', fmtDate(selected.invoice_date)],
                ['Due Date', fmtDate(selected.due_date)],
                ...(tab === 'proforma' ? [['Sold To', selected.sold_to || '—'], ['Consigned To', selected.consigned_to || '—']] : []),
                ['Amount', `¥ ${fmt(selected.amount)}`],
                ['Paid', `¥ ${fmt(selected.paid_amount)}`],
                ['Balance', `¥ ${fmt(Number(selected.amount) - Number(selected.paid_amount))}`],
                ['Status', selected.status],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-2 border-b border-grey-100 last:border-0">
                  <span className="text-sm text-grey-600">{k}</span>
                  <span className="text-sm font-medium text-navy">
                    {k === 'Status'
                      ? <span className={`badge ${STATUS_BADGE[v] || 'badge-grey'}`}>{v}</span>
                      : v}
                  </span>
                </div>
              ))}
            </div>
            {selected.notes && (
              <div className="card p-4 bg-grey-50">
                <p className="text-xs font-bold text-grey-500 mb-1">Notes</p>
                <p className="text-sm text-grey-700">{selected.notes}</p>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </>
  )
}
