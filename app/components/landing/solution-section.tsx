'use client';
import { useEffect, useRef } from 'react';

const PIPELINE = [
  {
    label: 'Human Intent',
    sub: 'Define spending rules in plain language',
    color: '#6366f1',
    icon: '💬',
  },
  {
    label: 'AI Policy Compiler',
    sub: 'Grok / Gemini converts rules to structured policy',
    color: '#8b5cf6',
    icon: '🤖',
  },
  {
    label: 'Validated Policy',
    sub: 'Zod-validated, conflict-checked JSON policy',
    color: '#2563eb',
    icon: '✅',
  },
  {
    label: 'Transaction Request',
    sub: 'AI agent submits spending request',
    color: '#0891b2',
    icon: '💳',
  },
  {
    label: 'Policy Evaluation',
    sub: 'Deterministic rule engine — no AI guesswork',
    color: '#0d9488',
    icon: '⚙️',
  },
  {
    label: 'ALLOW / HOLD / BLOCK',
    sub: 'Instant decision with full reasoning',
    color: '#10b981',
    icon: '🛡️',
  },
  {
    label: 'Audit Trail',
    sub: 'Every decision persisted in PostgreSQL',
    color: '#64748b',
    icon: '📋',
  },
];

export default function SolutionSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

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
    if (sectionRef.current) io.observe(sectionRef.current);
    itemRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      aria-labelledby="solution-heading"
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
        {/* Left */}
        <div className="lp-reveal">
          <p className="lp-overline" style={{ marginBottom: 16 }}>
            The Solution
          </p>
          <h2 id="solution-heading" className="lp-h2" style={{ marginBottom: 20 }}>
            Meet SpendGuard
          </h2>
          <p className="lp-body" style={{ marginBottom: 20 }}>
            SpendGuard transforms human spending intent into enforceable authorization policies and
            evaluates every transaction against those policies — before any payment is executed.
          </p>
          <p className="lp-body-sm">
            The AI compiler converts natural language to structured policy. The deterministic engine
            applies it consistently. Every decision is explainable and audited.
          </p>

          <div style={{ display: 'flex', gap: 12, marginTop: 32, flexWrap: 'wrap' }}>
            {[
              { label: 'PostgreSQL', sub: 'Source of truth' },
              { label: 'Redis', sub: 'Spend counters' },
              { label: 'Zod', sub: 'Schema validation' },
            ].map((t) => (
              <div
                key={t.label}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: '8px 14px',
                }}
              >
                <p style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', margin: 0 }}>
                  {t.label}
                </p>
                <p style={{ fontSize: 10.5, color: '#64748b', margin: '2px 0 0' }}>{t.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right — pipeline */}
        <ol
          style={{ listStyle: 'none', margin: 0, padding: 0, position: 'relative' }}
          aria-label="SpendGuard pipeline"
        >
          {/* Vertical connector */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: 15,
              top: 20,
              bottom: 20,
              width: 1.5,
              background: 'linear-gradient(to bottom, #e2e8f0, #e2e8f0 80%, transparent)',
            }}
          />

          {PIPELINE.map((step, i) => (
            <li
              key={step.label}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              data-scroll-stage
              className={`lp-reveal lp-reveal-delay-${Math.min(i, 5) as 0 | 1 | 2 | 3 | 4 | 5}`}
              style={{
                display: 'flex',
                gap: 16,
                alignItems: 'flex-start',
                marginBottom: i < PIPELINE.length - 1 ? 20 : 0,
                position: 'relative',
              }}
            >
              {/* Dot */}
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: step.color + '18',
                  border: `1.5px solid ${step.color}50`,
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                  fontSize: 14,
                  zIndex: 1,
                  marginTop: 2,
                }}
              >
                {step.icon}
              </div>
              <div>
                <p style={{ fontSize: 13.5, fontWeight: 700, color: '#1e293b', margin: 0 }}>
                  {step.label}
                </p>
                <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>{step.sub}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <style>{`@media(max-width:768px){ #how-it-works > div { grid-template-columns:1fr !important; gap:48px !important; } }`}</style>
    </section>
  );
}
