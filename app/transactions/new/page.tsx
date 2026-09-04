/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DecisionBadge } from '@/src/components/decision-badge';
export default function NewTransaction() {
  const [policies, setPolicies] = useState<any[]>([]);
  const [form, setForm] = useState({
    policyId: '',
    amount: '',
    currency: 'INR',
    category: 'Groceries',
    merchant: '',
    agentId: 'dashboard-user',
  });
  const [result, setResult] = useState<any>();
  const [error, setError] = useState('');
  useEffect(() => {
    fetch('/api/policies?limit=100')
      .then((r) => r.json())
      .then((d) => {
        setPolicies(d.policies ?? []);
        setForm((f) => ({ ...f, policyId: d.policies?.[0]?.id ?? '' }));
      });
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const r = await fetch('/api/transactions/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, amount: Number(form.amount) }),
    });
    const d = await r.json();
    if (!r.ok) return setError(d.error ?? 'Evaluation failed');
    setResult(d.transaction);
  }
  return (
    <div className="max-w-3xl">
      <p className="text-sm font-bold uppercase tracking-[.2em] text-cyan-400">Evaluate</p>
      <h1 className="mt-2 text-4xl font-bold">Check a transaction.</h1>
      <form
        onSubmit={submit}
        className="mt-7 grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:grid-cols-2"
      >
        {[
          ['Amount', 'amount', 'number'],
          ['Currency', 'currency', 'text'],
          ['Category', 'category', 'text'],
          ['Merchant', 'merchant', 'text'],
        ].map(([label, key, type]) => (
          <label key={key} className="text-sm text-slate-300">
            {label}
            <input
              required
              type={type}
              value={(form as any)[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 p-3"
            />
          </label>
        ))}
        <label className="text-sm text-slate-300 sm:col-span-2">
          Policy
          <select
            required
            value={form.policyId}
            onChange={(e) => setForm({ ...form, policyId: e.target.value })}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 p-3"
          >
            {policies.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <button className="rounded-lg bg-cyan-400 px-5 py-3 font-bold text-slate-950 sm:col-span-2">
          Evaluate transaction
        </button>
      </form>
      {error && <p className="mt-4 text-rose-300">{error}</p>}
      {result && (
        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">Decision</h2>
            <DecisionBadge decision={result.decision} />
          </div>
          <p className="mt-3 text-slate-300">{result.explanation}</p>
          <div className="mt-4 space-y-2">
            {result.ruleResults.map((r: any) => (
              <p key={r.rule} className={r.passed ? 'text-emerald-300' : 'text-amber-300'}>
                {r.passed ? '✓' : '!'} {r.message}
              </p>
            ))}
          </div>
          <Link
            className="mt-5 inline-block text-cyan-300"
            href={`/transactions/${result.transactionId}`}
          >
            Open full decision →
          </Link>
        </section>
      )}
    </div>
  );
}
