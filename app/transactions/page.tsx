'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DecisionBadge } from '@/src/components/decision-badge';
import { PageState } from '@/src/components/page-state';

type Item = {
  decision: { id: string; decision: string; createdAt: string };
  transaction: { id: string; merchant: string; category: string; amount: number; currency: string };
  policy: { name: string };
};

const money = (amount: number, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);

const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6.5" cy="6.5" r="4.5"/><path d="M10.5 10.5l3 3"/>
  </svg>
);

export default function Transactions() {
  const [data, setData]   = useState<{ items: Item[] }>();
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    fetch('/api/transactions?limit=100')
      .then(async r => r.ok ? setData(await r.json()) : setError('Unable to load transactions.'))
      .catch(() => setError('Unable to load transactions.'));
  }, []);

  if (error) return <PageState error message={error} />;
  if (!data)  return <PageState message="Loading transactions…" />;

  const filtered = data.items.filter(i => {
    const matchSearch = !search ||
      i.transaction.merchant.toLowerCase().includes(search.toLowerCase()) ||
      i.transaction.category.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'ALL' || i.decision.decision === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: 6 }}>Transaction history</p>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', margin: 0, letterSpacing: '-.025em' }}>
            Every decision, explained
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
            {data.items.length} total decision{data.items.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/transactions/new" className="primary-button">
          Evaluate Transaction
        </Link>
      </div>

      {/* Toolbar */}
      <div className="surface" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-2)', pointerEvents: 'none' }}>
            <SearchIcon />
          </span>
          <input
            type="search"
            className="input-base"
            placeholder="Search by merchant or category…"
            style={{ paddingLeft: 32, height: 34, fontSize: 12 }}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {(['ALL', 'ALLOW', 'HOLD', 'BLOCK'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              borderRadius: 8, padding: '5px 12px', fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
              border: `1px solid ${filter === f ? 'var(--blue)' : 'var(--line)'}`,
              background: filter === f ? 'var(--blue-soft)' : 'var(--canvas-2)',
              color: filter === f ? 'var(--blue)' : 'var(--muted)',
            }}
          >
            {f === 'ALL' ? 'All' : f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="surface" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Merchant</th>
                <th>Category</th>
                <th>Policy</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? filtered.map(i => (
                <tr
                  key={i.decision.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => window.location.href = `/transactions/${i.transaction.id}`}
                >
                  <td><DecisionBadge decision={i.decision.decision} /></td>
                  <td style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>{i.transaction.merchant}</td>
                  <td style={{ fontSize: 12.5, color: 'var(--muted)' }}>{i.transaction.category}</td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{i.policy.name}</td>
                  <td style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                    {new Date(i.decision.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' } as Intl.DateTimeFormatOptions)}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
                    {money(i.transaction.amount, i.transaction.currency)}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)', fontSize: 13 }}>
                    {search ? `No results for "${search}"` : 'No transactions yet. Evaluate a transaction to begin.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
