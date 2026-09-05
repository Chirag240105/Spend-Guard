'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PageState } from '@/src/components/page-state';

type RecoverySummary = {
  totalPaymentsAnalyzed: number;
  totalFailedPayments: number;
  totalRevenueAtRisk: number;
  recoverablePayments: number;
  nonRecoverablePayments: number;
  humanReviewPayments: number;
  recoveryAttempts: number;
  successfulRecoveries: number;
  totalRecoveredRevenue: number;
  recoveryRate: number;
  revenueRecoveryRate: number;
  revenueProtectedFromUnnecessaryRetries: number;
  averageRecoveryAttempts: number;
  retrySuccessRate: number;
  humanEscalationRate: number;
};

type RecoveryItem = {
  id: string;
  paymentId: string;
  status: string;
  failureCategory: string;
  confidence: number;
  riskLevel: string;
  recommendedAction: string;
  executedAction: string;
  reason: string;
  amount: number;
  currency: string;
  attemptCount: number;
  maxAttempts: number;
  stopReason: string | null;
  escalated: boolean;
  recoveredAmount: number;
  paymentStatus: string;
  approvalStatus: string | null;
  createdAt: string;
  updatedAt: string;
};

const money = (n: number, cur = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n);

function Card({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div
      className="surface"
      style={{
        padding: 18,
        border: '1px solid rgba(37,99,235,.12)',
        background: 'linear-gradient(180deg, rgba(255,255,255,.96), rgba(248,250,252,.92))',
      }}
    >
      <p style={{ margin: 0, color: 'var(--muted)', fontSize: 12, fontWeight: 700 }}>{label}</p>
      <p style={{ margin: '8px 0 4px', color: 'var(--ink)', fontSize: 24, fontWeight: 800 }}>{value}</p>
      <p style={{ margin: 0, color: 'var(--muted)', fontSize: 12 }}>{sub}</p>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const palette: Record<string, { bg: string; color: string }> = {
    SUCCESS: { bg: '#dcfce7', color: '#166534' },
    STOPPED: { bg: '#fee2e2', color: '#b91c1c' },
    HUMAN_REVIEW: { bg: '#fef9c3', color: '#92400e' },
    RETRYING: { bg: '#dbeafe', color: '#1d4ed8' },
    DO_NOT_RETRY: { bg: '#fee2e2', color: '#991b1b' },
    PENDING: { bg: '#f3f4f6', color: '#374151' },
  };
  const s = palette[status] ?? { bg: 'var(--canvas)', color: 'var(--muted)' };
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 800 }}>
      {status}
    </span>
  );
}

export default function RecoveryPage() {
  const [summary, setSummary] = useState<RecoverySummary | null>(null);
  const [items, setItems] = useState<RecoveryItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [batchLabel, setBatchLabel] = useState('recovery-demo-20260905');

  useEffect(() => {
    let cancelled = false;

    fetch('/api/v1/recovery', { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error('Load failed');
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setSummary(data.summary);
        setItems(data.recentRecoveries ?? []);
      })
      .catch(() => {
        if (!cancelled) setError('Unable to load recovery analytics.');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function runDemo() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/v1/recovery/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ batchSize: 100, seed: 20260905, merchantId: 'recovery-demo-merchant' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? 'Recovery demo failed');
      setSummary(data.summary);
      setItems(data.recentRecoveries ?? []);
      setBatchLabel(data.batchId ?? batchLabel);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Recovery demo failed.');
    } finally {
      setBusy(false);
    }
  }

  if (error && !summary) return <PageState error message={error} />;
  if (!summary) return <PageState message="Loading recovery analytics..." />;

  const cards = [
    { label: 'Payments analyzed', value: summary.totalPaymentsAnalyzed, sub: `${summary.totalFailedPayments} failed payments entered recovery` },
    { label: 'Recovered revenue', value: money(summary.totalRecoveredRevenue), sub: `${summary.successfulRecoveries} successful recoveries` },
    { label: 'Recovery rate', value: `${summary.recoveryRate}%`, sub: `${summary.averageRecoveryAttempts} avg attempts` },
    { label: 'Revenue recovery rate', value: `${summary.revenueRecoveryRate}%`, sub: `${money(summary.totalRevenueAtRisk)} at risk` },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="animate-fade-in">
      <div
        className="surface"
        style={{
          padding: 24,
          background:
            'radial-gradient(circle at top left, rgba(37,99,235,.12), transparent 30%), linear-gradient(135deg, #0f172a, #111827 55%, #1e3a8a)',
          color: 'white',
          border: '1px solid rgba(255,255,255,.08)',
        }}
      >
        <p style={{ margin: 0, color: '#93c5fd', fontSize: 12, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase' }}>
          Revenue Recovery
        </p>
        <h1 style={{ margin: '8px 0 8px', fontSize: 28, fontWeight: 900, letterSpacing: '-.04em' }}>
          Batch recovery proof, not just diagnosis
        </h1>
        <p style={{ margin: 0, maxWidth: 760, color: '#cbd5e1', lineHeight: 1.6, fontSize: 13.5 }}>
          Run a deterministic 100-payment recovery batch, see what was recovered, what was stopped, and what needed human escalation.
          The batch uses real persisted payment, recovery, and audit records.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
          <button onClick={runDemo} disabled={busy} className="primary-button" style={{ background: '#f59e0b', color: '#111827' }}>
            {busy ? 'Running demo...' : 'Run Recovery Demo'}
          </button>
          <Link href="/payments" className="secondary-button" style={{ borderColor: 'rgba(255,255,255,.18)', color: 'white' }}>
            View payments
          </Link>
          <span style={{ alignSelf: 'center', color: '#cbd5e1', fontSize: 12 }}>Batch: {batchLabel}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
        {cards.map((card) => (
          <Card key={card.label} {...card} />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
        <Card label="Protected from retries" value={money(summary.revenueProtectedFromUnnecessaryRetries)} sub="Stopped by bounded recovery rules" />
        <Card label="Human escalation rate" value={`${summary.humanEscalationRate}%`} sub={`${summary.humanReviewPayments} human-review cases`} />
        <Card label="Retry success rate" value={`${summary.retrySuccessRate}%`} sub={`${summary.recoveryAttempts} total retry attempts`} />
      </div>

      <div className="surface" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
          <h2 style={{ margin: 0, color: 'var(--ink)', fontSize: 15, fontWeight: 800 }}>Recent recovery timeline</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 12 }}>
            Payment status, recovery action, stop reason, and approval outcome
          </p>
        </div>
        {items.length ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Decision</th>
                  <th>Attempts</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th>Stop reason</th>
                  <th>Audit</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td><StatusChip status={item.status} /></td>
                    <td>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{item.failureCategory}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        <Link href={`/payments/${item.paymentId}`} style={{ color: 'var(--blue)', textDecoration: 'none' }}>
                          {item.paymentId.slice(0, 12)}...
                        </Link>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{item.executedAction}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {item.approvalStatus ? `Approval: ${item.approvalStatus}` : item.recommendedAction}
                      </div>
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {item.attemptCount}/{item.maxAttempts}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{money(item.amount, item.currency)}</td>
                    <td style={{ fontSize: 12, color: item.stopReason ? '#b91c1c' : 'var(--muted)' }}>
                      {item.stopReason ?? 'Active'}
                    </td>
                    <td style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                      {new Date(item.updatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: 30, color: 'var(--muted)', fontSize: 13 }}>Run the demo to populate the batch timeline.</div>
        )}
      </div>
    </div>
  );
}
