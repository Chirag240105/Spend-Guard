'use client';
import { useEffect, useRef, useState } from 'react';

/* ── Animated counter hook ── */
function useCounter(target: number, trigger: boolean, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    let start: number | null = null;
    const raf = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.round(p * target));
      if (p < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, [trigger, target, duration]);
  return val;
}

/* ── Stat data ── */
const SPEND_STATS = [
  { label: 'Today', target: 1250, prefix: '₹', note: 'Active budget period' },
  { label: 'This Week', target: 4850, prefix: '₹', note: 'Rolling 7-day window' },
  { label: 'This Month', target: 12400, prefix: '₹', note: 'Monthly budget tracking' },
];

/* ── Individual stat card — own component so hook is at top-level ── */
function StatCard({ stat, trigger }: { stat: (typeof SPEND_STATS)[number]; trigger: boolean }) {
  const count = useCounter(stat.target, trigger);
  return (
    <div
      style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 14,
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div>
        <p
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '.06em',
            textTransform: 'uppercase',
            color: '#64748b',
            margin: 0,
          }}
        >
          {stat.label}
        </p>
        <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>{stat.note}</p>
      </div>
      <p
        style={{
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: '-.03em',
          color: '#1e293b',
          margin: 0,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {stat.prefix}
        {count.toLocaleString('en-IN')}
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SPENDING SECTION
   ══════════════════════════════════════════════════════════════════════════ */
export function SpendingSection() {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setVisible(true);
      },
      { threshold: 0.25 },
    );
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      aria-labelledby="spending-heading"
      style={{ padding: '96px 24px', background: '#fff' }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 80,
          alignItems: 'center',
        }}
      >
        {/* Left — copy */}
        <div className={`lp-reveal${visible ? ' lp-visible' : ''}`}>
          <p className="lp-overline" style={{ marginBottom: 16 }}>
            Spending Intelligence
          </p>
          <h2 id="spending-heading" className="lp-h2" style={{ marginBottom: 20 }}>
            Always know what&apos;s been spent.
          </h2>
          <p className="lp-body" style={{ marginBottom: 16 }}>
            SpendGuard tracks spending context per agent across daily, weekly, and monthly windows —
            with atomic Redis counters and PostgreSQL as the source of truth.
          </p>
          <p className="lp-body-sm" style={{ marginBottom: 24 }}>
            Every authorization decision checks live spending state before approving a transaction,
            preventing budget overruns even under concurrent load.
          </p>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#ecfeff',
                border: '1px solid #a5f3fc',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                color: '#0e7490',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                <circle cx="6" cy="6" r="5.5" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M6 4v2.5l1.5 1"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              Atomic Redis counters
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                color: '#15803d',
              }}
            >
              PostgreSQL source of truth
            </span>
          </div>

          <p style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 16, fontStyle: 'italic' }}>
            * Figures shown are demo values — not real-time production data.
          </p>
        </div>

        {/* Right — animated counters */}
        <div
          className={`lp-reveal lp-reveal-delay-2${visible ? ' lp-visible' : ''}`}
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          {SPEND_STATS.map((s) => (
            <StatCard key={s.label} stat={s} trigger={visible} />
          ))}
        </div>
      </div>

      <style>{`
        @media(max-width:768px){
          section[aria-labelledby="spending-heading"] > div {
            grid-template-columns: 1fr !important;
            gap: 48px !important;
          }
        }
      `}</style>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   AUDIT SECTION
   ══════════════════════════════════════════════════════════════════════════ */
const AUDIT_EVENTS = [
  {
    event: 'TRANSACTION_RECEIVED',
    actor: 'SYSTEM',
    time: '14:23:01.112',
    color: '#6366f1',
    detail: null,
  },
  {
    event: 'SPENDING_CONTEXT_LOADED',
    actor: 'SYSTEM',
    time: '14:23:01.145',
    color: '#0891b2',
    detail: null,
  },
  {
    event: 'POLICY_EVALUATED',
    actor: 'SYSTEM',
    time: '14:23:01.189',
    color: '#2563eb',
    detail: null,
  },
  {
    event: 'DECISION_MADE',
    actor: 'SYSTEM',
    time: '14:23:01.193',
    color: '#10b981',
    detail: 'ALLOW',
  },
  {
    event: 'SPEND_COUNTER_UPDATED',
    actor: 'SYSTEM',
    time: '14:23:01.210',
    color: '#0d9488',
    detail: null,
  },
  {
    event: 'AUDIT_EVENT_CREATED',
    actor: 'SYSTEM',
    time: '14:23:01.215',
    color: '#64748b',
    detail: null,
  },
];

export function AuditSection() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) (e.target as HTMLElement).classList.add('lp-visible');
      },
      { threshold: 0.15 },
    );
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      aria-labelledby="audit-heading"
      style={{ padding: '96px 24px', background: '#f8fafc' }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 80,
          alignItems: 'center',
        }}
      >
        {/* Left — timeline */}
        <div
          className="lp-reveal"
          style={{
            background: '#0f172a',
            borderRadius: 16,
            padding: '28px 24px',
            border: '1px solid rgba(255,255,255,.08)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
            }}
          >
            <p
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                color: '#60a5fa',
                margin: 0,
              }}
            >
              Audit Trail
            </p>
            <span
              style={{
                fontSize: 10,
                background: 'rgba(37,99,235,.2)',
                color: '#93c5fd',
                borderRadius: 4,
                padding: '2px 7px',
                fontWeight: 700,
              }}
            >
              PostgreSQL
            </span>
          </div>

          <ol
            style={{ listStyle: 'none', margin: 0, padding: 0, position: 'relative' }}
            aria-label="Example audit trail"
          >
            <div
              aria-hidden
              style={{
                position: 'absolute',
                left: 8,
                top: 6,
                bottom: 6,
                width: 1,
                background: 'rgba(255,255,255,.06)',
              }}
            />
            {AUDIT_EVENTS.map((e, i) => (
              <li
                key={e.event}
                style={{
                  display: 'flex',
                  gap: 14,
                  alignItems: 'flex-start',
                  marginBottom: i < AUDIT_EVENTS.length - 1 ? 14 : 0,
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: e.color + '20',
                    border: `1.5px solid ${e.color}50`,
                    flexShrink: 0,
                    zIndex: 1,
                    marginTop: 2,
                  }}
                  aria-hidden
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <p
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#e2e8f0',
                        margin: 0,
                        fontFamily: 'monospace',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {e.event}
                    </p>
                    {e.detail && (
                      <span
                        style={{
                          fontSize: 10.5,
                          background: '#dcfce720',
                          color: '#22c55e',
                          border: '1px solid #22c55e40',
                          borderRadius: 4,
                          padding: '1px 6px',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {e.detail}
                      </span>
                    )}
                  </div>
                  <p
                    style={{
                      fontSize: 10.5,
                      color: '#475569',
                      margin: '1px 0 0',
                      fontFamily: 'monospace',
                    }}
                  >
                    {e.actor} · {e.time}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Right — copy */}
        <div className="lp-reveal lp-reveal-delay-2">
          <p className="lp-overline" style={{ marginBottom: 16 }}>
            Auditability
          </p>
          <h2 id="audit-heading" className="lp-h2" style={{ marginBottom: 20 }}>
            Every decision has a reason.
          </h2>
          <p className="lp-body" style={{ marginBottom: 16 }}>
            SpendGuard doesn&apos;t just return ALLOW or BLOCK. It creates a complete,
            tamper-evident audit trail of every authorization event — persisted in PostgreSQL.
          </p>
          <p className="lp-body-sm" style={{ marginBottom: 24 }}>
            Policy evaluations, spending context checks, human overrides, and approval actions are
            all recorded with actor, timestamp, and full event details.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {[
              'PAYMENT_ATTEMPTED',
              'POLICY_EVALUATED',
              'DECISION_MADE',
              'HUMAN_OVERRIDE',
              'APPROVAL_GRANTED',
            ].map((ev) => (
              <span
                key={ev}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: 'monospace',
                  color: '#475569',
                }}
              >
                {ev}
              </span>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media(max-width:768px){
          section[aria-labelledby="audit-heading"] > div {
            grid-template-columns: 1fr !important;
            gap: 48px !important;
          }
        }
      `}</style>
    </section>
  );
}
