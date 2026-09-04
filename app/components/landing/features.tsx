'use client';
import { useEffect, useRef } from 'react';

const FEATURES = [
  {
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M10 2L4 4.5v5.25C4 13.5 6.5 16.25 10 17.5c3.5-1.25 6-4 6-7.75V4.5L10 2z" />
        <path d="M7 10l2 2 4-5" />
      </svg>
    ),
    title: 'AI Policy Compiler',
    desc: 'Describe spending rules in natural language. Grok or Gemini compiles them to validated, structured policies with conflict detection.',
    color: '#8b5cf6',
  },
  {
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <rect x="2" y="2" width="7" height="7" rx="1.5" />
        <rect x="11" y="2" width="7" height="7" rx="1.5" />
        <rect x="2" y="11" width="7" height="7" rx="1.5" />
        <rect x="11" y="11" width="7" height="7" rx="1.5" />
      </svg>
    ),
    title: 'Deterministic Authorization',
    desc: 'Consistent rule-based transaction decisions — no LLM randomness in the decision path. Same input always yields the same decision.',
    color: '#2563eb',
  },
  {
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="10" cy="10" r="8" />
        <path d="M10 6v4l3 2" />
      </svg>
    ),
    title: 'Spending Limits',
    desc: 'Per-transaction, daily, weekly, and monthly budget enforcement per agent — tracked atomically in Redis, verified in PostgreSQL.',
    color: '#0891b2',
  },
  {
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M3 7h14M3 11h9M3 15h5" />
        <path d="M14 12l3 3-3 3" />
      </svg>
    ),
    title: 'Category & Merchant Rules',
    desc: 'Define explicit allow and block lists for spending categories and merchants. Hard rules can never be overridden by the AI.',
    color: '#0d9488',
  },
  {
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="10" cy="8" r="4" />
        <path d="M2 18c0-4 3.6-6 8-6s8 2 8 6" />
      </svg>
    ),
    title: 'Human Approval Queue',
    desc: 'Transactions above approval thresholds or with low AI confidence are routed to a human review queue — no money moves until approved.',
    color: '#f59e0b',
  },
  {
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M13 2H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6L13 2z" />
        <path d="M13 2v4h4M7 9h6M7 12h6M7 15h4" />
      </svg>
    ),
    title: 'Audit Trail',
    desc: 'Every policy evaluation, decision, approval, and override is persisted with actor, timestamp, and full event details in PostgreSQL.',
    color: '#64748b',
  },
];

export default function FeaturesSection() {
  const refs = useRef<(HTMLDivElement | null)[]>([]);

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
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      style={{ padding: '96px 24px', background: '#fff' }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div
          ref={(el) => {
            refs.current[0] = el;
          }}
          className="lp-reveal"
          style={{ textAlign: 'center', marginBottom: 56 }}
        >
          <p className="lp-overline" style={{ justifyContent: 'center', marginBottom: 16 }}>
            Capabilities
          </p>
          <h2 id="features-heading" className="lp-h2" style={{ marginBottom: 12 }}>
            Everything you need to control AI spending.
          </h2>
          <p className="lp-body" style={{ maxWidth: 480, margin: '0 auto' }}>
            Built for the reality of agentic systems — where AI agents act autonomously and humans
            need reliable guardrails.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 20,
          }}
        >
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              ref={(el) => {
                refs.current[i + 1] = el;
              }}
              className={`lp-feature-card lp-reveal lp-reveal-delay-${Math.min(i, 5) as 0 | 1 | 2 | 3 | 4 | 5}`}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: f.color + '12',
                  border: `1px solid ${f.color}25`,
                  display: 'grid',
                  placeItems: 'center',
                  color: f.color,
                  marginBottom: 14,
                }}
              >
                {f.icon}
              </div>
              <h3 className="lp-h3" style={{ marginBottom: 8 }}>
                {f.title}
              </h3>
              <p className="lp-body-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
