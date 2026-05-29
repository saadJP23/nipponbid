import React, { useState, useEffect } from 'react';
import { Wallet, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAccountingSummary, getUserLedger, adminDownloadAccountExcel } from '../../services/api';
import { format } from 'date-fns';

const entryLabel = (type) => {
  if (type === 'remittance') return <span className="badge-green text-xs">Credit</span>;
  if (type === 'proforma')   return <span className="badge-orange text-xs">Proforma</span>;
  if (type === 'purchase')   return <span className="badge-red text-xs">Purchase</span>;
  return <span className="badge-red text-xs">Invoice</span>;
};

function LedgerDrawer({ user }) {
  const [open, setOpen] = useState(false);
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = async () => {
    if (ledger) { setOpen(o => !o); return; }
    setLoading(true);
    setOpen(true);
    try {
      const { data } = await getUserLedger(user.id);
      setLedger(data);
    } catch { toast.error('Failed'); }
    finally { setLoading(false); }
  };

  const handleDownloadExcel = async (e) => {
    e.stopPropagation();
    setExporting(true);
    try {
      const res = await adminDownloadAccountExcel(user.id);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `account-${user.name.replace(/\s+/g, '-')}-${Date.now()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Export failed'); }
    finally { setExporting(false); }
  };

  return (
    <div className="card overflow-hidden">
      <div onClick={load} className="w-full flex items-center justify-between p-4 transition-colors cursor-pointer hover:bg-black/[0.02]">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm"
            style={{ background: 'rgba(183,16,42,0.12)', color: '#b7102a' }}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="text-left">
            <p className="font-medium" style={{ color: 'var(--ae-ink)' }}>{user.name}</p>
            <p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>{user.email} · {user.country || '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="text-right hidden sm:block">
            <p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>Credits</p>
            <p className="text-green-600">{Number(user.totalCredit).toLocaleString()}</p>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>Debits</p>
            <p className="text-red-500">{Number(user.totalDebit).toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>Balance</p>
            <p className={`font-semibold ${user.balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {user.balance >= 0 ? '+' : ''}{Number(user.balance).toLocaleString()}
            </p>
          </div>
          <button
            onClick={handleDownloadExcel}
            disabled={exporting}
            title="Download Account Excel"
            className="p-2 rounded-lg transition-colors"
            style={{ background: 'rgba(52,211,153,0.1)', color: exporting ? 'var(--ae-ink-muted)' : '#16a34a', border: '1px solid rgba(52,211,153,0.3)' }}
          >
            <Download size={15} />
          </button>
          {open
            ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--ae-ink-faint)' }} />
            : <ChevronDown className="w-4 h-4" style={{ color: 'var(--ae-ink-faint)' }} />}
        </div>
      </div>

      {open && (
        <div style={{ borderTop: '1px solid var(--ae-glass-border)' }}>
          {loading ? (
            <div className="text-center py-6" style={{ color: 'var(--ae-ink-muted)' }}>Loading...</div>
          ) : ledger?.ledger.length === 0 ? (
            <div className="text-center py-6" style={{ color: 'var(--ae-ink-faint)' }}>No transactions</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="uppercase" style={{ background: 'var(--ae-glass-bg)', color: 'var(--ae-ink-faint)' }}>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Ref</th>
                  <th className="px-4 py-2 text-left">Description</th>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-right">Credit</th>
                  <th className="px-4 py-2 text-right">Debit</th>
                  <th className="px-4 py-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {[...(ledger?.ledger || [])].reverse().map((row, i) => (
                  <tr key={i} className="transition-colors hover:bg-black/[0.02]"
                    style={{ borderTop: '1px solid var(--ae-glass-border)' }}>
                    <td className="px-4 py-2" style={{ color: 'var(--ae-ink-muted)' }}>{row.entry_date ? format(new Date(row.entry_date), 'dd MMM yyyy') : '—'}</td>
                    <td className="px-4 py-2 font-mono" style={{ color: 'var(--ae-red)' }}>{row.ref}</td>
                    <td className="px-4 py-2" style={{ color: 'var(--ae-ink-muted)' }}>{row.description}</td>
                    <td className="px-4 py-2">{entryLabel(row.entry_type)}</td>
                    <td className="px-4 py-2 text-right">
                      {row.credit > 0
                        ? <span className="text-green-600">+{Number(row.credit).toLocaleString()}</span>
                        : <span style={{ color: 'var(--ae-ink-faint)' }}>—</span>}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {row.debit > 0
                        ? <span className="text-red-500">-{Number(row.debit).toLocaleString()}</span>
                        : <span style={{ color: 'var(--ae-ink-faint)' }}>—</span>}
                    </td>
                    <td className={`px-4 py-2 text-right font-semibold ${row.balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {Number(row.balance).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminAccounting() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getAccountingSummary()
      .then(r => setUsers(r.data))
      .catch(() => toast.error('Failed'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalCredit = users.reduce((s, u) => s + u.totalCredit, 0);
  const totalDebit = users.reduce((s, u) => s + u.totalDebit, 0);

  return (
    <div data-theme="light" style={{ background: 'var(--ae-canvas)', minHeight: '100vh' }}>
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--ae-ink)' }}>Accounting</h1>
          <p className="mt-1" style={{ color: 'var(--ae-ink-muted)' }}>Client ledger overview</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="card p-5 flex items-center gap-4">
            <div className="p-3 bg-green-500/10 rounded-xl"><TrendingUp className="w-6 h-6 text-green-600" /></div>
            <div>
              <p className="text-sm" style={{ color: 'var(--ae-ink-muted)' }}>Total Credits</p>
              <p className="text-xl font-bold text-green-600">{Number(totalCredit).toLocaleString()}</p>
            </div>
          </div>
          <div className="card p-5 flex items-center gap-4">
            <div className="p-3 bg-red-500/10 rounded-xl"><TrendingDown className="w-6 h-6 text-red-500" /></div>
            <div>
              <p className="text-sm" style={{ color: 'var(--ae-ink-muted)' }}>Total Debits</p>
              <p className="text-xl font-bold text-red-500">{Number(totalDebit).toLocaleString()}</p>
            </div>
          </div>
          <div className="card p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ background: 'rgba(183,16,42,0.08)' }}>
              <Wallet className="w-6 h-6" style={{ color: 'var(--ae-red)' }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: 'var(--ae-ink-muted)' }}>Net Balance</p>
              <p className={`text-xl font-bold ${totalCredit - totalDebit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {Number(totalCredit - totalDebit).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <input
          className="input-field mb-4 max-w-sm"
          placeholder="Search client..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {loading ? (
          <div className="text-center py-16" style={{ color: 'var(--ae-ink-muted)' }}>Loading...</div>
        ) : (
          <div className="space-y-2">
            {filtered.map(u => <LedgerDrawer key={u.id} user={u} />)}
            {!filtered.length && (
              <div className="card p-16 text-center" style={{ color: 'var(--ae-ink-faint)' }}>No clients found</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
