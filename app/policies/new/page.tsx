'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
type Policy = {
  name: string;
  limits: Record<string, number>;
  categories: { allowed?: string[]; blocked?: string[] };
  merchants?: { allowed?: string[]; blocked?: string[] };
  approval?: { aboveAmount?: number };
};
export default function NewPolicy() {
  const router = useRouter();
  const [text, setText] = useState(
    'My agent can spend up to ₹2,000 per day on groceries. Block gaming. Require approval above ₹500.',
  );
  const [result, setResult] = useState<{
    policy: { id: string; compiledPolicy: Policy };
    warnings?: string[];
    usedMock?: boolean;
  }>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function compile() {
    setBusy(true);
    setError('');
    const r = await fetch('/api/policies/compile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ naturalLanguage: text }),
    });
    const body = await r.json();
    setBusy(false);
    if (!r.ok) return setError(body.error ?? 'Unable to compile policy');
    setResult(body);
  }
  return (
    <div className="max-w-3xl">
      <p className="text-sm font-bold uppercase tracking-[.2em] text-cyan-400">New policy</p>
      <h1 className="mt-2 text-4xl font-bold">Describe the guardrails.</h1>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="mt-7 min-h-44 w-full rounded-2xl border border-slate-700 bg-slate-900 p-5 text-slate-100 outline-none focus:border-cyan-400"
      />
      {error && <p className="mt-3 text-rose-300">{error}</p>}
      <button
        disabled={busy}
        onClick={compile}
        className="mt-4 rounded-lg bg-cyan-400 px-5 py-3 font-bold text-slate-950 disabled:opacity-50"
      >
        {busy ? 'Compiling…' : 'Compile policy'}
      </button>
      {result && (
        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-bold">Compiled policy</h2>
          {result.usedMock && (
            <p className="mt-2 text-amber-300">
              Compiled using the local fallback. Review before use.
            </p>
          )}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field
              label="Limits"
              value={
                Object.entries(result.policy.compiledPolicy.limits)
                  .map(([k, v]) => `${k}: ₹${v}`)
                  .join(' · ') || 'None'
              }
            />
            <Field
              label="Categories"
              value={
                [
                  ...(result.policy.compiledPolicy.categories.allowed ?? []).map(
                    (x) => `Allow ${x}`,
                  ),
                  ...(result.policy.compiledPolicy.categories.blocked ?? []).map(
                    (x) => `Block ${x}`,
                  ),
                ].join(' · ') || 'All categories'
              }
            />
            <Field
              label="Merchants"
              value={
                result.policy.compiledPolicy.merchants
                  ? JSON.stringify(result.policy.compiledPolicy.merchants)
                  : 'All merchants'
              }
            />
            <Field
              label="Approval"
              value={
                result.policy.compiledPolicy.approval?.aboveAmount
                  ? `Above ₹${result.policy.compiledPolicy.approval.aboveAmount}`
                  : 'Not required'
              }
            />
          </div>
          {result.warnings?.map((w) => (
            <p key={w} className="mt-3 text-amber-300">
              {w}
            </p>
          ))}
          <button
            onClick={() => router.push(`/policies/${result.policy.id}`)}
            className="mt-6 rounded-lg bg-cyan-400 px-5 py-3 font-bold text-slate-950"
          >
            Confirm and view policy
          </button>
        </section>
      )}
    </div>
  );
}
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-800/70 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-sm text-slate-100">{value}</p>
    </div>
  );
}
