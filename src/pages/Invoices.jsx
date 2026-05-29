import React, { useState, useEffect } from 'react';
import { FileText, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import { getMyProformaInvoices, getMyFinalInvoices } from '../services/api';
import { format } from 'date-fns';

const statusBadge = (s) => {
  const map = { unpaid: 'badge-red', partial: 'badge-orange', paid: 'badge-green', archived: 'badge-gray' };
  return <span className={map[s] || 'badge-gray'}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : '—'}</span>;
};

function ProformaTab() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyProformaInvoices().then(r => setInvoices(r.data)).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-16" style={{ color: 'var(--ae-ink-muted)' }}>Loading...</div>;
  if (!invoices.length) return (
    <div className="card p-16 text-center mt-4">
      <FileText className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--ae-ink-faint)' }} />
      <p style={{ color: 'var(--ae-ink-muted)' }}>No proforma invoices</p>
    </div>
  );

  return (
    <div className="space-y-3 mt-4">
      {invoices.map(inv => (
        <div key={inv.id} className="card p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div><p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>Invoice No</p><p className="font-mono font-semibold" style={{ color: 'var(--ae-red)' }}>{inv.invoice_no}</p></div>
              <div><p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>Date</p><p style={{ color: 'var(--ae-ink)' }}>{format(new Date(inv.invoice_date), 'dd MMM yyyy')}</p></div>
              <div><p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>Amount</p><p className="font-semibold" style={{ color: 'var(--ae-ink)' }}>{Number(inv.amount).toLocaleString()}</p></div>
              <div><p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>Paid</p><p className="text-green-600">{Number(inv.paid_amount).toLocaleString()}</p></div>
            </div>
            <div className="flex items-center gap-3">
              {statusBadge(inv.status)}
              {inv.due_date && <span className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>Due: {format(new Date(inv.due_date), 'dd MMM yyyy')}</span>}
            </div>
          </div>
          {inv.sold_to && <p className="text-sm mt-2" style={{ color: 'var(--ae-ink-muted)' }}>To: {inv.sold_to}</p>}
          {inv.notes && <p className="text-xs mt-1" style={{ color: 'var(--ae-ink-faint)' }}>{inv.notes}</p>}
        </div>
      ))}
    </div>
  );
}

function FinalTab() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  const load = (archived = false) => {
    setLoading(true);
    getMyFinalInvoices(archived ? { status: 'archived' } : {})
      .then(r => setInvoices(r.data))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(showArchived); }, [showArchived]);

  if (loading) return <div className="text-center py-16" style={{ color: 'var(--ae-ink-muted)' }}>Loading...</div>;

  return (
    <div className="mt-4">
      <div className="flex justify-end mb-3">
        <button
          onClick={() => setShowArchived(a => !a)}
          className="text-sm px-4 py-1.5 rounded-lg border transition-colors"
          style={showArchived
            ? { borderColor: 'var(--ae-red)', color: 'var(--ae-red)' }
            : { borderColor: 'var(--ae-glass-border)', color: 'var(--ae-ink-muted)' }}>
          {showArchived ? 'Show Active' : 'Show Archived'}
        </button>
      </div>
      {!invoices.length ? (
        <div className="card p-16 text-center">
          <Receipt className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--ae-ink-faint)' }} />
          <p style={{ color: 'var(--ae-ink-muted)' }}>No {showArchived ? 'archived' : 'active'} final invoices</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map(inv => (
            <div key={inv.id} className="card p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div><p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>Invoice No</p><p className="font-mono font-semibold" style={{ color: 'var(--ae-red)' }}>{inv.invoice_no}</p></div>
                  <div><p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>File Code</p><p style={{ color: 'var(--ae-ink)' }}>{inv.file_code || '—'}</p></div>
                  <div><p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>Amount</p><p className="font-semibold" style={{ color: 'var(--ae-ink)' }}>{Number(inv.amount).toLocaleString()}</p></div>
                  <div><p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>Paid</p><p className="text-green-600">{Number(inv.paid_amount).toLocaleString()}</p></div>
                </div>
                <div className="flex items-center gap-3">{statusBadge(inv.status)}</div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
                {inv.ship_name && <div><p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>Ship</p><p style={{ color: 'var(--ae-ink-muted)' }}>{inv.ship_name}</p></div>}
                {inv.etd && <div><p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>ETD</p><p style={{ color: 'var(--ae-ink-muted)' }}>{format(new Date(inv.etd), 'dd MMM yyyy')}</p></div>}
                {inv.eta && <div><p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>ETA</p><p style={{ color: 'var(--ae-ink-muted)' }}>{format(new Date(inv.eta), 'dd MMM yyyy')}</p></div>}
              </div>
              {inv.notes && <p className="text-xs mt-2" style={{ color: 'var(--ae-ink-faint)' }}>{inv.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Invoices() {
  const [tab, setTab] = useState('proforma');

  return (
    <div data-theme="light" style={{ background: 'var(--ae-canvas)', minHeight: '100%' }}>
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--ae-ink)' }}>Invoices</h1>
          <p className="mt-1" style={{ color: 'var(--ae-ink-muted)' }}>View your proforma and final invoices</p>
        </div>

        <div className="flex gap-1 p-1 rounded-xl w-fit mb-6" style={{ background: 'var(--ae-glass-bg)', border: '1px solid var(--ae-glass-border)' }}>
          {[['proforma', 'Proforma'], ['final', 'Final']].map(([val, label]) => (
            <button key={val} onClick={() => setTab(val)}
              className="px-5 py-2 rounded-lg text-sm font-medium transition-all"
              style={tab === val
                ? { background: 'var(--ae-red)', color: '#fff' }
                : { color: 'var(--ae-ink-muted)' }}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'proforma' ? <ProformaTab /> : <FinalTab />}
      </div>
    </div>
  );
}
