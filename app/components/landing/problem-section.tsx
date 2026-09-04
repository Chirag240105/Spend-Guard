'use client';
import { useEffect, useRef } from 'react';

const PROBLEMS = [
  { q: 'Is this transaction allowed?', icon: '❓' },
  { q: "Is the amount within the agent's budget?", icon: '💰' },
  { q: 'Is this merchant or category permitted?', icon: '🏪' },
  { q: 'Does this require human approval?', icon: '👤' },
  { q: 'How much has the agent already spent today?', icon: '📊' },
  { q: 'Why was this payment approved or blocked?', icon: '📋' },
];

export default function ProblemSection() {
  const refs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).classList.add('lp-visible');
          }
        });
      },
      { threshold: 0.15 },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section
      id="problem"
      style={{ background: '#0f172a', padding: '96px 24px' }}
      aria-labelledby="problem-heading"
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <p
            className="lp-overline"
            style={{ color: '#60a5fa', justifyContent: 'center', marginBottom: 16 }}
          >
            <span>The Challenge</span>
          </p>
          <h2
            ref={(el) => {
              refs.current[0] = el;
            }}
            id="problem-heading"
            className="lp-h2 lp-reveal"
            style={{ color: '#f1f5f9', maxWidth: 640, margin: '0 auto 20px' }}
          >
            AI can <span data-scroll-word>act autonomously.</span>
            <br />
            <span data-scroll-word>Payments shouldn&apos;t.</span>
          </h2>
          <p
            ref={(el) => {
              refs.current[1] = el;
            }}
            className="lp-body lp-reveal lp-reveal-delay-1"
            style={{ color: '#94a3b8', maxWidth: 560, margin: '0 auto' }}
          >
            Modern AI agents can increasingly make decisions and initiate actions — but payment
            systems need a reliable authorization layer that can answer every spending question with
            certainty.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {PROBLEMS.map((p, i) => (
            <div
              key={p.q}
              ref={(el) => {
                refs.current[i + 2] = el;
              }}
              className={`lp-reveal lp-reveal-delay-${Math.min(i + 1, 5) as 1 | 2 | 3 | 4 | 5}`}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 14,
                background: 'rgba(255,255,255,.04)',
                border: '1px solid rgba(255,255,255,.07)',
                borderRadius: 12,
                padding: '18px 20px',
                transition: 'border-color .2s, background .2s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(37,99,235,.4)';
                (e.currentTarget as HTMLElement).style.background = 'rgba(37,99,235,.07)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,.07)';
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.04)';
              }}
            >
              <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }} aria-hidden>
                {p.icon}
              </span>
              <p
                style={{
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: '#cbd5e1',
                  margin: 0,
                  lineHeight: 1.55,
                }}
              >
                {p.q}
              </p>
            </div>
          ))}
        </div>

        <p
          ref={(el) => {
            refs.current[8] = el;
          }}
          className="lp-reveal"
          style={{
            color: '#475569',
            fontSize: 14,
            textAlign: 'center',
            marginTop: 48,
            lineHeight: 1.7,
          }}
        >
          Without a policy enforcement layer, autonomous AI spending becomes
          <strong style={{ color: '#64748b' }}> impossible to audit, control, or justify.</strong>
        </p>
      </div>
    </section>
  );
}
