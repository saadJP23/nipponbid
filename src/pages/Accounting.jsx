import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { getMyLedger } from '../services/api';
import { format } from 'date-fns';

const entryLabel = (type) => {
  if (type === 'remittance') return <span className="badge-green text-xs">Credit</span>;
  if (type === 'proforma')   return <span className="badge-orange text-xs">Proforma</span>;
  if (type === 'purchase')   return <span className="badge-red text-xs">Purchase</span>;
  return <span className="badge-red text-xs">Invoice</span>;
};

export default function Accounting() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyLedger()
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load ledger'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div data-theme="light" style={{ background: 'var(--ae-canvas)', minHeight: '100%' }} className="flex items-center justify-center">
      <p style={{ color: 'var(--ae-ink-muted)' }}>Loading...</p>
    </div>
  );

  const { ledger = [], totalCredit = 0, totalDebit = 0, balance = 0 } = data || {};

  return (
    <div data-theme="light" style={{ background: 'var(--ae-canvas)', minHeight: '100%' }}>
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--ae-ink)' }}>Account Ledger</h1>
          <p className="mt-1" style={{ color: 'var(--ae-ink-muted)' }}>Your complete transaction history and balance</p>
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
          <div className={`card p-5 flex items-center gap-4`} style={{ borderColor: balance >= 0 ? 'rgba(22,163,74,0.20)' : 'rgba(239,68,68,0.20)' }}>
            <div className="p-3 rounded-xl" style={{ background: balance >= 0 ? 'rgba(183,16,42,0.08)' : 'rgba(239,68,68,0.08)' }}>
              <Wallet className="w-6 h-6" style={{ color: balance >= 0 ? 'var(--ae-red)' : '#ef4444' }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: 'var(--ae-ink-muted)' }}>Balance</p>
              <p className="text-xl font-bold" style={{ color: balance >= 0 ? 'var(--ae-red)' : '#ef4444' }}>
                {balance >= 0 ? '+' : ''}{Number(balance).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {ledger.length === 0 ? (
          <div className="card p-16 text-center">
            <Wallet className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--ae-ink-faint)' }} />
            <p style={{ color: 'var(--ae-ink-muted)' }}>No transactions yet</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase" style={{ borderBottom: '1px solid var(--ae-glass-border)', color: 'var(--ae-ink-faint)' }}>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Ref</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-right">Credit</th>
                  <th className="px-4 py-3 text-right">Debit</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {[...ledger].reverse().map((row, i) => (
                  <tr key={i} className="hover:bg-black/[0.02] transition-colors" style={{ borderBottom: '1px solid var(--ae-glass-border)' }}>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--ae-ink-muted)' }}>
                      {row.entry_date ? format(new Date(row.entry_date), 'dd MMM yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--ae-red)' }}>{row.ref}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--ae-ink)' }}>{row.description}</td>
                    <td className="px-4 py-3">{entryLabel(row.entry_type)}</td>
                    <td className="px-4 py-3 text-right">
                      {row.credit > 0 ? <span className="text-green-600">+{Number(row.credit).toLocaleString()}</span> : <span style={{ color: 'var(--ae-ink-faint)' }}>—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.debit > 0 ? <span className="text-red-500">-{Number(row.debit).toLocaleString()}</span> : <span style={{ color: 'var(--ae-ink-faint)' }}>—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold" style={{ color: row.balance >= 0 ? 'var(--ae-ink)' : '#ef4444' }}>
                      {Number(row.balance).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
