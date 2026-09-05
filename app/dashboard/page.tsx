'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PageState } from '@/src/components/page-state';

interface DashboardSummary {
  totalPayments: number;
  successPayments: number;
  failedPayments: number;
  recoveredPayments: number;
  humanReviewCount: number;
  pendingApprovals: number;
  revenueRecovered: number;
  revenueAtRisk: number;
  recoveryRate: number;
  recoveryAttempts: number;
  recoverablePayments: number;
  nonRecoverablePayments: number;
  revenueRecoveryRate: number;
  revenueProtectedFromUnnecessaryRetries: number;
  averageRecoveryAttempts: number;
  retrySuccessRate: number;
  humanEscalationRate: number;
  totalPaymentsAnalyzed: number;
  totalFailedPayments: number;
}

interface ActivityItem {
  id: string;
  paymentId: string;
  policyAction: string;
  failureCategory: string;
  confidence: number;
  riskLevel: string;
  recommendedAction: string;
  reason: string;
  amount: number;
  currency: string;
  createdAt: string;
  approvalStatus: string | null;
  paymentStatus: string;
  recoveryStatus: string;
  attemptCount: number;
  maxAttempts: number;
  stopReason: string | null;
  recoveredAmount: number;
}

const money = (n: number, cur = 'INR') =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: cur,
    maximumFractionDigits: 0,
  }).format(n);

function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub: string;
  accent?: string;
}) {
  return (
    <div className={`surface ${accent ?? ''}`} style={{ padding: '18px 20px' }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', margin: 0 }}>{label}</p>
      <p
        style={{
          fontSize: 26,
          fontWeight: 800,
          letterSpacing: '-.03em',
          color: 'var(--ink)',
          margin: '6px 0 4px',
          lineHeight: 1,
        }}
      >
        {value}
      </p>
      <p style={{ fontSize: 11.5, color: 'var(--muted)', margin: 0 }}>{sub}</p>
    </div>
  );
}

function ActionBadge({ action }: { action: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    AUTO_RETRY: { bg: '#dcfce7', color: '#15803d' },
    DELAYED_RETRY: { bg: '#dbeafe', color: '#1d4ed8' },
    HUMAN_REVIEW: { bg: '#fef9c3', color: '#92400e' },
    DO_NOT_RETRY: { bg: '#fee2e2', color: '#b91c1c' },
  };
  const s = map[action] ?? { bg: 'var(--canvas)', color: 'var(--muted)' };
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
      {action}
    </span>
  );
}

function DashboardSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skeleton" style={{ height: 96 }} />
        ))}
      </div>
      <div className="skeleton" style={{ height: 400 }} />
    </div>
  );
}

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary>();
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/v1/dashboard', { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) throw new Error('Failed to load');
        const d = await r.json();
        setSummary(d.summary);
        setActivity(d.recentActivity ?? []);
      })
      .catch(() => setError('Unable to load dashboard data.'));
  }, []);

  if (error) return <PageState error message={error} />;
  if (!summary) return <DashboardSkeleton />;

  const kpis = [
    {
      label: 'Total Payments',
      value: summary.totalPayments,
      sub: `${summary.successPayments} successful`,
      accent: 'kpi-blue',
    },
    {
      label: 'Revenue Recovered',
      value: money(summary.revenueRecovered),
      sub: `${summary.recoveredPayments} payments rescued`,
      accent: 'kpi-green',
    },
    {
      label: 'Revenue at Risk',
      value: money(summary.revenueAtRisk),
      sub: `${summary.humanReviewCount} need human review`,
      accent: 'kpi-amber',
    },
    {
      label: 'Recovery Rate',
      value: `${summary.recoveryRate}%`,
      sub: `${summary.failedPayments} failed payments`,
      accent: summary.recoveryRate >= 50 ? 'kpi-green' : 'kpi-red',
    },
  ];

  const recoveryCards = [
    {
      label: 'Revenue Recovery Rate',
      value: `${summary.revenueRecoveryRate}%`,
      sub: `${money(summary.revenueRecovered)} recovered from ${money(summary.revenueAtRisk)} at risk`,
    },
    {
      label: 'Retry Success Rate',
      value: `${summary.retrySuccessRate}%`,
      sub: `${summary.recoveryAttempts} retry attempts across the batch`,
    },
    {
      label: 'Human Escalation Rate',
      value: `${summary.humanEscalationRate}%`,
      sub: `${summary.humanReviewCount} cases routed to review`,
    },
  ];

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 40 }}
      className="animate-fade-in"
    >
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
            Overview
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
            Payment Recovery Dashboard
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
            AI diagnosis → policy decision → automatic recovery
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/recovery" className="secondary-button">
            Recovery Demo
          </Link>
          <Link href="/payments" className="secondary-button">
            View Payments
          </Link>
          <Link href="/ai-decisions" className="primary-button">
            AI Decisions
          </Link>
        </div>
      </div>

      {/* Pending approvals alert */}
      {summary.pendingApprovals > 0 && (
        <Link
          href="/approvals"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderRadius: 10,
            border: '1px solid #fde68a',
            background: 'linear-gradient(90deg,#fffbeb,#fef9c3)',
            padding: '10px 16px',
            textDecoration: 'none',
            color: 'var(--ink)',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span>⚠️</span>
            <strong>
              {summary.pendingApprovals} payment{summary.pendingApprovals !== 1 ? 's' : ''} awaiting
              approval
            </strong>
            <span style={{ color: 'var(--muted)', fontSize: 12 }}>
              — human review required before recovery
            </span>
          </span>
          <span style={{ color: '#d97706', fontSize: 16 }}>→</span>
        </Link>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {recoveryCards.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      {/* Main grid */}
      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}
      >
        {/* Activity feed */}
        <div className="surface" style={{ overflow: 'hidden' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--line)',
            }}
          >
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
                Recent Recovery Activity
              </h2>
              <p style={{ fontSize: 11.5, color: 'var(--muted)', margin: '2px 0 0' }}>
                AI diagnosis → policy → recovery decisions
              </p>
            </div>
            <Link
              href="/ai-decisions"
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--blue)',
                textDecoration: 'none',
              }}
            >
              View all →
            </Link>
          </div>
          {activity.length ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Policy Action</th>
                  <th>Failure Category</th>
                  <th>Confidence</th>
                  <th>Risk</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th>Payment Status</th>
                  <th>Recovery Status</th>
                </tr>
              </thead>
              <tbody>
                {activity.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <ActionBadge action={item.policyAction} />
                    </td>
                    <td>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
                        {item.failureCategory ?? 'UNKNOWN'}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--muted)',
                          marginTop: 1,
                          maxWidth: 160,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.reason as string}
                      </div>
                    </td>
                    <td style={{ fontSize: 12, fontWeight: 600 }}>
                      {item.confidence ? `${Math.round(Number(item.confidence) * 100)}%` : '—'}
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 600,
                          color:
                            item.riskLevel === 'HIGH'
                              ? '#b91c1c'
                              : item.riskLevel === 'MEDIUM'
                                ? '#d97706'
                                : '#15803d',
                        }}
                      >
                        {item.riskLevel ?? '—'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 13 }}>
                      {money(item.amount, item.currency)}
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: 11.5,
                          color:
                            item.paymentStatus === 'SUCCESS'
                              ? '#15803d'
                              : item.paymentStatus === 'HUMAN_REVIEW'
                                ? '#d97706'
                                : 'var(--muted)',
                          fontWeight: 600,
                        }}
                      >
                        {item.paymentStatus}
                      </span>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                        {item.recoveredAmount > 0
                          ? `Recovered ${money(item.recoveredAmount, item.currency)}`
                          : 'No payout yet'}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span
                          style={{
                            fontSize: 11.5,
                            fontWeight: 700,
                            color:
                              item.recoveryStatus === 'SUCCESS'
                                ? '#15803d'
                                : item.recoveryStatus === 'STOPPED'
                                  ? '#b91c1c'
                                  : item.recoveryStatus === 'HUMAN_REVIEW'
                                    ? '#d97706'
                                    : '#1d4ed8',
                          }}
                        >
                          {item.recoveryStatus}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                          {item.attemptCount}/{item.maxAttempts} attempts
                          {item.stopReason ? ` · ${item.stopReason}` : ''}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div
              style={{
                padding: '48px 24px',
                textAlign: 'center',
                color: 'var(--muted)',
                fontSize: 13,
              }}
            >
              No activity yet.{' '}
              <Link
                href="/payments"
                style={{ color: 'var(--blue)', textDecoration: 'none', fontWeight: 600 }}
              >
                Trigger a payment
              </Link>{' '}
              to see the pipeline in action.
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Flow */}
          <div className="surface" style={{ padding: '20px' }}>
            <p className="eyebrow" style={{ marginBottom: 8 }}>
              Recovery Flow
            </p>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', margin: '0 0 16px' }}>
              AI never touches money.
            </h3>
            <ol
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 0,
              }}
            >
              {[
                {
                  n: 1,
                  t: 'Payment fails',
                  s: 'Gateway error persisted in PostgreSQL',
                  c: '#ef4444',
                },
                {
                  n: 2,
                  t: 'AI diagnosis',
                  s: 'Classifies failure, recommends action',
                  c: '#8b5cf6',
                },
                {
                  n: 3,
                  t: 'Policy engine decides',
                  s: 'Deterministic — no LLM involvement',
                  c: '#2563eb',
                },
                {
                  n: 4,
                  t: 'AUTO_RETRY or HOLD',
                  s: 'Recovery engine or approval queue',
                  c: '#f59e0b',
                },
                {
                  n: 5,
                  t: 'Revenue recovered',
                  s: 'Ledger updated, audit trail written',
                  c: '#10b981',
                },
              ].map(({ n, t, s, c }, i, arr) => (
                <li key={n} style={{ display: 'flex', gap: 12, position: 'relative' }}>
                  {i < arr.length - 1 && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 13,
                        top: 30,
                        bottom: -4,
                        width: 1.5,
                        background: 'var(--line)',
                      }}
                    />
                  )}
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: c + '18',
                      border: `1.5px solid ${c}40`,
                      color: c,
                      fontSize: 11,
                      fontWeight: 800,
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                      zIndex: 1,
                    }}
                  >
                    {n}
                  </div>
                  <div style={{ paddingBottom: i < arr.length - 1 ? 16 : 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
                      {t}
                    </p>
                    <p
                      style={{
                        fontSize: 11.5,
                        color: 'var(--muted)',
                        margin: '2px 0 0',
                        lineHeight: 1.4,
                      }}
                    >
                      {s}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Quick stats */}
          <div className="surface" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', margin: '0 0 14px' }}>
              Pipeline Status
            </h3>
            {[
              { l: 'Successful Payments', v: summary.successPayments, c: '#10b981' },
              { l: 'Failed Payments', v: summary.failedPayments, c: '#f43f5e' },
              { l: 'Recovered (Retried)', v: summary.recoveredPayments, c: '#2563eb' },
              { l: 'Pending Human Review', v: summary.pendingApprovals, c: '#f59e0b' },
            ].map(({ l, v, c }) => (
              <div
                key={l}
                style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background: c + '18',
                    border: `1px solid ${c}30`,
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
                    {l}
                  </p>
                </div>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
