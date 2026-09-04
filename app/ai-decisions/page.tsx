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

const ACTION_COLORS: Record<string, { bg: string; color: string }> = {
  AUTO_RETRY: { bg: '#dcfce7', color: '#15803d' },
  DELAYED_RETRY: { bg: '#dbeafe', color: '#1d4ed8' },
  HUMAN_REVIEW: { bg: '#fef9c3', color: '#92400e' },
  DO_NOT_RETRY: { bg: '#fee2e2', color: '#b91c1c' },
};

function ActionBadge({ a }: { a: string }) {
  const s = ACTION_COLORS[a] ?? { bg: 'var(--canvas)', color: 'var(--muted)' };
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        borderRadius: 99,
        padding: '3px 9px',
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '.04em',
        whiteSpace: 'nowrap',
      }}
    >
      {a}
    </span>
  );
}

export default function AIDecisionsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/agent/decisions?limit=50', { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) throw new Error('Failed');
        const d = await r.json();
        setItems(d.items ?? []);
        setTotal(d.total ?? 0);
      })
      .catch(() => setError('Unable to load AI decisions.'));
  }, []);

  if (error) return <PageState error message={error} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="animate-fade-in">
      <div>
        <p className="eyebrow" style={{ marginBottom: 6 }}>
          AI Safety Audit
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
          AI Decisions
        </h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
          {total} decisions · AI recommends, policy engine decides — AI never moves money
        </p>
      </div>

      {/* Safety notice */}
      <div
        style={{
          background: 'linear-gradient(90deg,#eff6ff,#dbeafe)',
          border: '1px solid #bfdbfe',
          borderRadius: 10,
          padding: '12px 16px',
          fontSize: 13,
        }}
      >
        <span style={{ fontWeight: 700, color: '#1d4ed8' }}>🛡️ AI Safety Guarantee: </span>
        <span style={{ color: '#1e40af' }}>
          The AI produces a structured recommendation (category, confidence, risk, action). The
          deterministic <strong>Policy Engine</strong> makes the final decision. The{' '}
          <strong>Recovery Engine</strong> executes payment retries. AI never has access to payment
          execution tools.
        </span>
      </div>

      {items.length === 0 ? (
        <PageState message="No AI decisions yet. Trigger a payment failure to see the pipeline." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((item: any) => {
            const output = item.output as Record<string, unknown>;
            const isOpen = expanded === item.id;
            return (
              <div key={item.id} className="surface" style={{ overflow: 'hidden' }}>
                <button
                  onClick={() => setExpanded(isOpen ? null : item.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 20px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  {/* AI rec vs Policy action */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 180 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                      <span style={{ color: '#8b5cf6', fontWeight: 700, letterSpacing: '.04em' }}>
                        AI REC
                      </span>
                      <ActionBadge a={String(output.recommended_action ?? '—')} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                      <span style={{ color: '#2563eb', fontWeight: 700, letterSpacing: '.04em' }}>
                        POLICY
                      </span>
                      <ActionBadge a={item.policyAction} />
                    </div>
                  </div>

                  {/* Failure info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                      {String(output.failure_category ?? 'UNKNOWN')}
                    </div>
                    <div
                      style={{
                        fontSize: 11.5,
                        color: 'var(--muted)',
                        marginTop: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {String(output.reason ?? '')}
                    </div>
                  </div>

                  {/* Confidence + Risk */}
                  <div style={{ textAlign: 'center', minWidth: 60 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>
                      {output.confidence ? `${Math.round(Number(output.confidence) * 100)}%` : '—'}
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>confidence</div>
                  </div>

                  <div style={{ textAlign: 'center', minWidth: 60 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color:
                          output.risk_level === 'HIGH'
                            ? '#b91c1c'
                            : output.risk_level === 'MEDIUM'
                              ? '#d97706'
                              : '#15803d',
                      }}
                    >
                      {String(output.risk_level ?? '—')}
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>risk</div>
                  </div>

                  <div style={{ textAlign: 'right', minWidth: 90 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>
                      {money(
                        item.payment?.order?.amount ?? 0,
                        item.payment?.order?.currency ?? 'INR',
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {new Date(item.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      } as Intl.DateTimeFormatOptions)}
                    </div>
                  </div>

                  {/* Approval status */}
                  {item.approval && (
                    <span
                      style={{
                        background:
                          item.approval.status === 'approved'
                            ? '#dcfce7'
                            : item.approval.status === 'rejected'
                              ? '#fee2e2'
                              : '#fef9c3',
                        color:
                          item.approval.status === 'approved'
                            ? '#15803d'
                            : item.approval.status === 'rejected'
                              ? '#b91c1c'
                              : '#92400e',
                        borderRadius: 99,
                        padding: '3px 9px',
                        fontSize: 10.5,
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.approval.status.toUpperCase()}
                    </span>
                  )}

                  <span style={{ color: 'var(--muted-2)', fontSize: 12 }}>
                    {isOpen ? '▲' : '▼'}
                  </span>
                </button>

                {isOpen && (
                  <div
                    style={{
                      borderTop: '1px solid var(--line)',
                      padding: '16px 20px',
                      background: 'var(--canvas)',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 16,
                    }}
                  >
                    {/* AI Output */}
                    <div>
                      <p
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: '.08em',
                          textTransform: 'uppercase',
                          color: '#8b5cf6',
                          marginBottom: 8,
                        }}
                      >
                        AI Recommendation
                      </p>
                      <pre
                        className="mono"
                        style={{
                          background: '#0f172a',
                          color: '#e2e8f0',
                          borderRadius: 8,
                          padding: '12px',
                          fontSize: 11.5,
                          margin: 0,
                          overflowX: 'auto',
                        }}
                      >
                        {JSON.stringify(output, null, 2)}
                      </pre>
                    </div>
                    {/* Input snapshot */}
                    <div>
                      <p
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: '.08em',
                          textTransform: 'uppercase',
                          color: '#2563eb',
                          marginBottom: 8,
                        }}
                      >
                        Input Context (what AI saw)
                      </p>
                      <pre
                        className="mono"
                        style={{
                          background: '#0f172a',
                          color: '#e2e8f0',
                          borderRadius: 8,
                          padding: '12px',
                          fontSize: 11.5,
                          margin: 0,
                          overflowX: 'auto',
                        }}
                      >
                        {JSON.stringify(item.inputSnapshot, null, 2)}
                      </pre>
                      {item.approval && (
                        <div
                          style={{
                            marginTop: 12,
                            padding: '10px 12px',
                            background: 'white',
                            border: '1px solid var(--line)',
                            borderRadius: 8,
                          }}
                        >
                          <p
                            style={{
                              fontSize: 11.5,
                              fontWeight: 600,
                              color: 'var(--ink)',
                              margin: '0 0 4px',
                            }}
                          >
                            Human Review
                          </p>
                          <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
                            Status: <strong>{item.approval.status}</strong>
                            {item.approval.reviewedBy &&
                              ` · Reviewed by ${item.approval.reviewedBy}`}
                            {item.approval.reviewedAt &&
                              ` · ${new Date(item.approval.reviewedAt).toLocaleString()}`}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
