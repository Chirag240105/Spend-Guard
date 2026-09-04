'use client';
import { useEffect, useRef } from 'react';

const DECISIONS = [
  {
    type: 'ALLOW' as const,
    tx: { merchant: 'Grocery Mart', category: 'Groceries', amount: '₹350', agent: 'agent_001' },
    rules: [
      { pass: true, msg: 'Within ₹500 per-transaction limit' },
      { pass: true, msg: 'Within ₹2,000 daily budget' },
      { pass: true, msg: 'Category "Groceries" allowed' },
      { pass: true, msg: 'Approval threshold not exceeded' },
    ],
    reason: 'Transaction satisfies all active policy rules.',
  },
  {
    type: 'HOLD' as const,
    tx: {
      merchant: 'Office Depot',
      category: 'Office Supplies',
      amount: '₹800',
      agent: 'agent_002',
    },
    rules: [
      { pass: true, msg: 'Within per-transaction limit' },
      { pass: true, msg: 'Within daily budget' },
      { pass: false, msg: 'Amount exceeds ₹500 approval threshold' },
    ],
    reason: 'Approval threshold exceeded — routed to human review.',
  },
  {
    type: 'BLOCK' as const,
    tx: { merchant: 'GameStore', category: 'Gaming', amount: '₹1,200', agent: 'agent_003' },
    rules: [
      { pass: false, msg: 'Category "Gaming" is explicitly blocked' },
      { pass: false, msg: 'Amount exceeds per-transaction limit' },
    ],
    reason: 'Hard policy rule violated — payment prevented.',
  },
];

const DECISION_META = {
  ALLOW: {
    bg: '#f0fdf4',
    border: '#86efac',
    headBg: '#dcfce7',
    headColor: '#15803d',
    dot: '#22c55e',
    label: 'ALLOW',
    desc: 'Transaction satisfies the active policy.',
  },
  HOLD: {
    bg: '#fffbeb',
    border: '#fde68a',
    headBg: '#fef9c3',
    headColor: '#854d0e',
    dot: '#f59e0b',
    label: 'HOLD',
    desc: 'Transaction requires human review.',
  },
  BLOCK: {
    bg: '#fff1f2',
    border: '#fca5a5',
    headBg: '#fee2e2',
    headColor: '#b91c1c',
    dot: '#ef4444',
    label: 'BLOCK',
    desc: 'Transaction violates a hard policy rule.',
  },
};

export default function DecisionEngineSection() {
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) (e.target as HTMLElement).classList.add('lp-visible');
        });
      },
      { threshold: 0.12 },
    );
    itemRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section
      id="decisions"
      aria-labelledby="decisions-heading"
      style={{ padding: '96px 24px', background: '#f8fafc' }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div
          ref={(el) => {
            itemRefs.current[0] = el;
          }}
          className="lp-reveal"
          style={{ textAlign: 'center', marginBottom: 56 }}
        >
          <p className="lp-overline" style={{ justifyContent: 'center', marginBottom: 16 }}>
            Authorization Decisions
          </p>
          <h2 id="decisions-heading" className="lp-h2" style={{ marginBottom: 16 }}>
            Three outcomes. Zero ambiguity.
          </h2>
          <p className="lp-body" style={{ maxWidth: 520, margin: '0 auto' }}>
            Every transaction evaluated by SpendGuard receives exactly one of three deterministic
            decisions — each with a full explanation.
          </p>
        </div>

        {/* Decision type explainers */}
        <div
          ref={(el) => {
            itemRefs.current[1] = el;
          }}
          className="lp-reveal lp-reveal-delay-1"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3,1fr)',
            gap: 16,
            marginBottom: 48,
          }}
        >
          {Object.values(DECISION_META).map((d) => (
            <div
              key={d.label}
              style={{ borderRadius: 12, border: `1px solid ${d.border}`, overflow: 'hidden' }}
            >
              <div
                style={{
                  background: d.headBg,
                  padding: '12px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                }}
              >
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: '50%',
                    background: d.dot,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    letterSpacing: '.06em',
                    color: d.headColor,
                  }}
                >
                  {d.label}
                </span>
              </div>
              <div style={{ background: '#fff', padding: '12px 18px' }}>
                <p style={{ fontSize: 13, color: '#475569', margin: 0, lineHeight: 1.5 }}>
                  {d.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Transaction examples */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 20,
          }}
        >
          {DECISIONS.map((d, i) => {
            const meta = DECISION_META[d.type];
            return (
              <div
                key={d.type}
                data-decision-state
                ref={(el) => {
                  itemRefs.current[i + 2] = el;
                }}
                className={`lp-reveal lp-reveal-delay-${(i + 1) as 1 | 2 | 3}`}
                style={{
                  background: '#fff',
                  border: `1px solid ${meta.border}`,
                  borderRadius: 14,
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(15,23,42,.06)',
                }}
              >
                {/* Card header */}
                <div
                  style={{
                    background: meta.headBg,
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: 0 }}>
                      {d.tx.merchant}
                    </p>
                    <p style={{ fontSize: 11.5, color: '#64748b', margin: '2px 0 0' }}>
                      {d.tx.category} · {d.tx.agent}
                    </p>
                  </div>
                  <p style={{ fontSize: 17, fontWeight: 800, color: '#1e293b', margin: 0 }}>
                    {d.tx.amount}
                  </p>
                </div>
                {/* Rules */}
                <div
                  style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}
                >
                  {d.rules.map((r) => (
                    <div key={r.msg} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          background: r.pass ? '#dcfce7' : '#fee2e2',
                          border: `1px solid ${r.pass ? '#86efac' : '#fca5a5'}`,
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                          fontSize: 9,
                        }}
                      >
                        {r.pass ? '✓' : '✕'}
                      </span>
                      <span style={{ fontSize: 12.5, color: r.pass ? '#374151' : '#9f1239' }}>
                        {r.msg}
                      </span>
                    </div>
                  ))}
                </div>
                {/* Decision footer */}
                <div
                  style={{
                    borderTop: `1px solid ${meta.border}`,
                    padding: '12px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <p
                    style={{
                      fontSize: 11.5,
                      color: '#64748b',
                      margin: 0,
                      flex: 1,
                      paddingRight: 12,
                    }}
                  >
                    {d.reason}
                  </p>
                  <span
                    className="lp-status-pill"
                    style={{
                      background: meta.headBg,
                      color: meta.headColor,
                      border: `1px solid ${meta.border}`,
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{ width: 6, height: 6, borderRadius: '50%', background: meta.dot }}
                    />
                    {meta.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
