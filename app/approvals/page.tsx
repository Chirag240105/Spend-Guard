/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { PageState } from '@/src/components/page-state';

const money = (n: number | string, cur = 'INR') =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: cur,
    maximumFractionDigits: 0,
  }).format(Number(n));

const RefreshIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M1 7a6 6 0 1 0 .5-2.5" />
    <path d="M1 1v3.5H4.5" />
  </svg>
);

export default function Approvals() {
  const [items, setItems] = useState<any[]>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; msg: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/v1/approvals', { credentials: 'include' });
      if (!r.ok) throw new Error('Failed');
      const d = await r.json();
      setItems(d.approvals ?? []);
    } catch {
      setError('Unable to load approvals.');
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  async function resolve(id: string, action: 'approve' | 'reject') {
    setBusy(id + action);
    setFeedback(null);
    try {
      const r = await fetch(`/api/v1/approvals/${id}/${action}`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setFeedback({ id, msg: d.message ?? 'Action failed', ok: false });
      } else {
        setFeedback({
          id,
          msg:
            action === 'approve' ? 'Payment approved — recovery initiated.' : 'Payment rejected.',
          ok: true,
        });
        await load();
      }
    } catch {
      setFeedback({ id, msg: 'Network error', ok: false });
    } finally {
      setBusy(null);
    }
  }

  if (error) return <PageState error message={error} />;
  if (!items) return <PageState message="Loading approval queue…" />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="animate-fade-in">
      {/* Header */}
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
            Human Review Queue
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
            Review Held Payments
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
            {items.length} pending · AI confidence below auto-retry threshold
          </p>
        </div>
        <button onClick={load} className="secondary-button">
          <RefreshIcon /> Refresh
        </button>
      </div>

      {items.length > 0 && (
        <div
          style={{
            borderRadius: 10,
            border: '1px solid #fde68a',
            background: 'linear-gradient(90deg,#fffbeb,#fef9c3)',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 13,
          }}
        >
          <span>⚠️</span>
          <span style={{ fontWeight: 600, color: '#92400e' }}>
            {items.length} payment{items.length !== 1 ? 's' : ''} are held pending your decision. No
            money moves until you approve or reject.
          </span>
        </div>
      )}

      {items.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((item: any) => {
            const decision = item.agentDecision;
            const output = (decision?.output ?? {}) as Record<string, unknown>;
            const payment = decision?.payment;
            const order = payment?.order;
            const isBusy = busy === item.id + 'approve' || busy === item.id + 'reject';
            const fb = feedback?.id === item.id ? feedback : null;
            return (
              <div key={item.id} className="surface" style={{ padding: '20px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 16,
                    flexWrap: 'wrap',
                  }}
                >
                  {/* Left: payment info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          background: '#fef9c3',
                          border: '1px solid #fde68a',
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                          fontSize: 18,
                        }}
                      >
                        💳
                      </div>
                      <div>
                        <p
                          style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', margin: 0 }}
                        >
                          {money(order?.amount ?? 0, order?.currency ?? 'INR')}
                        </p>
                        <p style={{ fontSize: 11.5, color: 'var(--muted)', margin: '2px 0 0' }}>
                          Payment ID: <span className="mono">{payment?.id?.slice(0, 12)}…</span> ·{' '}
                          {order?.currency} · {payment?.provider}
                        </p>
                      </div>
                    </div>

                    {/* AI diagnosis */}
                    <div
                      style={{
                        background: 'var(--canvas)',
                        border: '1px solid var(--line)',
                        borderRadius: 10,
                        padding: '12px 14px',
                      }}
                    >
                      <p
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: '.08em',
                          textTransform: 'uppercase',
                          color: '#8b5cf6',
                          margin: '0 0 10px',
                        }}
                      >
                        AI Diagnosis
                      </p>
                      <div
                        style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}
                      >
                        {[
                          {
                            l: 'Failure Category',
                            v: String(output.failure_category ?? 'UNKNOWN'),
                          },
                          {
                            l: 'Confidence',
                            v: output.confidence
                              ? `${Math.round(Number(output.confidence) * 100)}%`
                              : '—',
                          },
                          { l: 'Risk Level', v: String(output.risk_level ?? '—') },
                          { l: 'AI Recommendation', v: String(output.recommended_action ?? '—') },
                        ].map(({ l, v }) => (
                          <div key={l}>
                            <p
                              style={{
                                fontSize: 10.5,
                                color: 'var(--muted)',
                                margin: '0 0 2px',
                                textTransform: 'uppercase',
                                letterSpacing: '.06em',
                              }}
                            >
                              {l}
                            </p>
                            <p
                              style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: 'var(--ink)',
                                margin: 0,
                              }}
                            >
                              {v}
                            </p>
                          </div>
                        ))}
                      </div>
                      <p
                        style={{
                          fontSize: 12,
                          color: 'var(--muted)',
                          marginTop: 10,
                          margin: '10px 0 0',
                          fontStyle: 'italic',
                        }}
                      >
                        &ldquo;{String(output.reason ?? 'No reason provided.')}&rdquo;
                      </p>
                      <p
                        style={{ fontSize: 11.5, color: '#d97706', marginTop: 6, fontWeight: 600 }}
                      >
                        Policy Decision: HUMAN_REVIEW — confidence below auto-retry threshold
                      </p>
                    </div>
                  </div>

                  {/* Right: actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 140 }}>
                    <button
                      onClick={() => resolve(item.id, 'approve')}
                      disabled={isBusy}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        background: '#dcfce7',
                        color: '#15803d',
                        border: '1px solid #bbf7d0',
                        borderRadius: 8,
                        padding: '9px 16px',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: isBusy ? 'not-allowed' : 'pointer',
                        opacity: isBusy ? 0.6 : 1,
                      }}
                    >
                      ✓ Approve Retry
                    </button>
                    <button
                      onClick={() => resolve(item.id, 'reject')}
                      disabled={isBusy}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        background: '#fff1f2',
                        color: '#b91c1c',
                        border: '1px solid #fecaca',
                        borderRadius: 8,
                        padding: '9px 16px',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: isBusy ? 'not-allowed' : 'pointer',
                        opacity: isBusy ? 0.6 : 1,
                      }}
                    >
                      ✕ Reject
                    </button>
                    {fb && (
                      <p
                        style={{
                          fontSize: 11.5,
                          color: fb.ok ? '#15803d' : '#b91c1c',
                          textAlign: 'center',
                          margin: 0,
                        }}
                      >
                        {fb.msg}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            borderRadius: 14,
            border: '1px solid var(--line)',
            background: 'var(--canvas)',
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
            Queue is clear
          </p>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>
            No payments are waiting for human approval.
          </p>
        </div>
      )}
    </div>
  );
}
