'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageState } from '@/src/components/page-state';

/* eslint-disable @typescript-eslint/no-explicit-any */

const money = (n: number | string, cur = 'INR') =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: cur,
    maximumFractionDigits: 0,
  }).format(Number(n));

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  SUCCESS: { bg: '#dcfce7', color: '#15803d' },
  FAILED: { bg: '#fee2e2', color: '#b91c1c' },
  HUMAN_REVIEW: { bg: '#fef9c3', color: '#92400e' },
  DO_NOT_RETRY: { bg: '#fee2e2', color: '#991b1b' },
  RECOVERY_PENDING: { bg: '#dbeafe', color: '#1d4ed8' },
  RETRYING: { bg: '#ede9fe', color: '#7c3aed' },
  AI_DIAGNOSIS: { bg: '#ede9fe', color: '#7c3aed' },
  CREATED: { bg: 'var(--canvas)', color: 'var(--muted)' },
  ATTEMPTED: { bg: 'var(--canvas)', color: 'var(--muted)' },
  APPROVED: { bg: '#dcfce7', color: '#15803d' },
  REJECTED: { bg: '#fee2e2', color: '#b91c1c' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_COLORS[status] ?? { bg: 'var(--canvas)', color: 'var(--muted)' };
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.bg}`,
        borderRadius: 99,
        padding: '3px 9px',
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '.04em',
        whiteSpace: 'nowrap',
      }}
    >
      {status}
    </span>
  );
}

const SCENARIOS = [
  'GATEWAY_TIMEOUT',
  'TRANSIENT_NETWORK',
  'BANK_TEMPORARY_FAILURE',
  'INSUFFICIENT_FUNDS',
  'CARD_DECLINED',
  'UNKNOWN',
  'SUCCESS',
] as const;
type Scenario = (typeof SCENARIOS)[number];

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [scenario, setScenario] = useState<Scenario>('GATEWAY_TIMEOUT');
  const [amount, setAmount] = useState('4999');

  const load = async () => {
    try {
      const r = await fetch('/api/v1/payments?limit=50', { credentials: 'include' });
      if (!r.ok) throw new Error('Failed to load');
      const d = await r.json();
      setPayments(d.items ?? []);
      setTotal(d.total ?? 0);
    } catch {
      setError('Unable to load payments.');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  async function triggerPayment() {
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/v1/payments/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ merchantId: 'demo-merchant', amount: Number(amount), scenario }),
      });
      if (!r.ok) throw new Error((await r.json()).message ?? 'Trigger failed');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to trigger');
    } finally {
      setBusy(false);
    }
  }

  if (error && !payments.length) return <PageState error message={error} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="animate-fade-in">
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <p className="eyebrow" style={{ marginBottom: 6 }}>
            Payments
          </p>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: 'var(--ink)',
              margin: 0,
              letterSpacing: '-.025em',
            }}
          >
            Full Payment Pipeline
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
            {total} total payments · AI-driven failure recovery
          </p>
        </div>
      </div>

      {/* Demo trigger panel */}
      <div
        className="surface"
        style={{
          padding: '20px',
          background: 'linear-gradient(135deg,#0f172a,#1e293b)',
          color: 'white',
          borderColor: '#334155',
        }}
      >
        <p
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '.1em',
            textTransform: 'uppercase',
            color: '#60a5fa',
            marginBottom: 12,
          }}
        >
          🚀 Demo Scenario Trigger
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: 11.5, color: '#94a3b8', marginBottom: 4 }}>
              Failure Scenario
            </label>
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value as Scenario)}
              style={{
                background: '#1e293b',
                border: '1px solid #475569',
                borderRadius: 8,
                color: 'white',
                padding: '7px 10px',
                fontSize: 13,
              }}
            >
              {SCENARIOS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11.5, color: '#94a3b8', marginBottom: 4 }}>
              Amount (₹)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{
                background: '#1e293b',
                border: '1px solid #475569',
                borderRadius: 8,
                color: 'white',
                padding: '7px 10px',
                fontSize: 13,
                width: 100,
              }}
            />
          </div>
          <button
            onClick={triggerPayment}
            disabled={busy}
            style={{
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '8px 20px',
              fontSize: 13,
              fontWeight: 700,
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? 'Running pipeline…' : 'Trigger Payment'}
          </button>
          <button
            onClick={load}
            style={{
              background: 'transparent',
              border: '1px solid #475569',
              borderRadius: 8,
              color: '#94a3b8',
              padding: '7px 14px',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Refresh
          </button>
        </div>
        {error && <p style={{ marginTop: 10, fontSize: 12, color: '#fca5a5' }}>{error}</p>}
      </div>

      {/* Payments table */}
      <div className="surface" style={{ overflow: 'hidden' }}>
        {!payments.length ? (
          <div
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              color: 'var(--muted)',
              fontSize: 13,
            }}
          >
            No payments yet. Use the trigger above to run a demo scenario.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Payment ID</th>
                  <th>Provider</th>
                  <th>Retries</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th>AI Decision</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p: any) => {
                  const decision = p.agentDecisions?.[0];
                  const output = decision?.output as Record<string, unknown> | undefined;
                  return (
                    <tr
                      key={p.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => (window.location.href = `/payments/${p.id}`)}
                    >
                      <td>
                        <StatusBadge status={p.status} />
                      </td>
                      <td>
                        <span
                          className="mono"
                          style={{
                            fontSize: 11.5,
                            color: 'var(--muted)',
                            background: 'var(--canvas)',
                            border: '1px solid var(--line)',
                            borderRadius: 5,
                            padding: '2px 6px',
                          }}
                        >
                          {p.id.slice(0, 12)}…
                        </span>
                      </td>
                      <td
                        style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'capitalize' }}
                      >
                        {p.provider}
                      </td>
                      <td style={{ fontSize: 12 }}>{p.retryCount}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 13 }}>
                        {money(p.order.amount, p.order.currency)}
                      </td>
                      <td>
                        {output ? (
                          <div>
                            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink)' }}>
                              {String(output.failure_category ?? '—')}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
                              {output.confidence
                                ? `${Math.round(Number(output.confidence) * 100)}% conf`
                                : ''}{' '}
                              · {String(output.risk_level ?? '')}
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--muted)' }}>—</span>
                        )}
                      </td>
                      <td style={{ fontSize: 11.5, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                        {new Date(p.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        } as Intl.DateTimeFormatOptions)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
