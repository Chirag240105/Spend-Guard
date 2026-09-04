'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/* ── Auth-flow animator ─────────────────────────────────────────────────── */
const FLOW_STEPS = [
  {
    id: 'agent',
    label: 'AI Agent',
    sub: 'Initiates payment request',
    icon: '🤖',
    color: '#6366f1',
  },
  { id: 'sg', label: 'SpendGuard', sub: 'Authorization layer', icon: '🛡️', color: '#2563eb' },
  {
    id: 'policy',
    label: 'Policy Engine',
    sub: 'Evaluating 5 rules…',
    icon: '📋',
    color: '#0891b2',
  },
  { id: 'decision', label: 'Decision', sub: '', icon: '', color: '#10b981' },
] as const;

type DecisionType = 'ALLOW' | 'HOLD' | 'BLOCK';

function AuthFlowViz() {
  const [step, setStep] = useState(0);
  const [decision, setDecision] = useState<DecisionType>('ALLOW');
  const DECISIONS: DecisionType[] = ['ALLOW', 'HOLD', 'BLOCK'];
  const decisionIdx = useRef(0);

  useEffect(() => {
    let s = 0;
    const tick = () => {
      s = (s + 1) % (FLOW_STEPS.length + 1);
      setStep(s);
      if (s === 0) {
        decisionIdx.current = (decisionIdx.current + 1) % 3;
        setDecision(DECISIONS[decisionIdx.current]);
      }
    };
    const id = setInterval(tick, 900);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const decisionStyle: Record<DecisionType, { bg: string; color: string; border: string }> = {
    ALLOW: { bg: '#dcfce7', color: '#15803d', border: '#86efac' },
    HOLD: { bg: '#fef9c3', color: '#854d0e', border: '#fde047' },
    BLOCK: { bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' },
  };
  const ds = decisionStyle[decision];

  return (
    <div
      style={{
        background: '#0f172a',
        borderRadius: 16,
        padding: '28px 24px',
        border: '1px solid rgba(255,255,255,.08)',
        boxShadow: '0 24px 48px rgba(0,0,0,.4)',
        minWidth: 280,
        maxWidth: 340,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#ef4444',
            flexShrink: 0,
          }}
        />
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#f59e0b',
            flexShrink: 0,
          }}
        />
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#22c55e',
            flexShrink: 0,
          }}
        />
        <span style={{ marginLeft: 8, fontSize: 11.5, color: '#475569', fontFamily: 'monospace' }}>
          spendguard.authorization
        </span>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {FLOW_STEPS.map((s, i) => {
          const active = step === i + 1;
          const done = step > i + 1 || (step === 0 && i < 3);
          const isDecision = s.id === 'decision';

          if (isDecision) {
            const show = step === 4 || step === 0;
            return (
              <div key={s.id} style={{ paddingLeft: 24, paddingTop: 4 }}>
                <div
                  style={{
                    width: 1,
                    height: 16,
                    background: 'rgba(255,255,255,.1)',
                    marginLeft: 11,
                    marginBottom: 4,
                  }}
                />
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    background: show ? ds.bg : 'transparent',
                    border: show
                      ? `1.5px solid ${ds.border}`
                      : '1.5px dashed rgba(255,255,255,.15)',
                    borderRadius: 99,
                    padding: '5px 14px',
                    transition: 'all .4s ease',
                    opacity: show ? 1 : 0.4,
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: show ? ds.color : '#64748b',
                      flexShrink: 0,
                      transition: 'background .4s',
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: '.06em',
                      color: show ? ds.color : '#64748b',
                      transition: 'color .4s',
                    }}
                  >
                    {show ? decision : '···'}
                  </span>
                </div>
              </div>
            );
          }

          return (
            <div
              key={s.id}
              style={{ display: 'flex', gap: 12, alignItems: 'flex-start', position: 'relative' }}
            >
              {/* Connector */}
              {i < 2 && (
                <div
                  style={{
                    position: 'absolute',
                    left: 11,
                    top: 28,
                    width: 1.5,
                    height: 24,
                    background: done ? s.color + '60' : 'rgba(255,255,255,.08)',
                    transition: 'background .4s',
                  }}
                />
              )}
              {/* Dot */}
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  flexShrink: 0,
                  marginTop: 2,
                  background: active ? s.color : done ? s.color + '30' : 'rgba(255,255,255,.06)',
                  border: `1.5px solid ${active ? s.color : done ? s.color + '60' : 'rgba(255,255,255,.12)'}`,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 10,
                  boxShadow: active ? `0 0 12px ${s.color}60` : 'none',
                  transition: 'all .3s ease',
                  zIndex: 1,
                }}
              >
                {done ? (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path
                      d="M2 5l2 2 4-4"
                      stroke={s.color}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : null}
              </div>
              {/* Label */}
              <div style={{ paddingBottom: 20 }}>
                <p
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: active ? '#f1f5f9' : done ? '#94a3b8' : '#475569',
                    margin: 0,
                    transition: 'color .3s',
                  }}
                >
                  {s.label}
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: active ? '#60a5fa' : '#334155',
                    margin: '2px 0 0',
                    transition: 'color .3s',
                  }}
                >
                  {active && i === 2 ? (
                    <span style={{ display: 'inline-flex', gap: 3 }}>
                      {['Limits', 'Category', 'Merchant', 'Approval'].map((rule, ri) => (
                        <span
                          key={rule}
                          style={{
                            fontSize: 9.5,
                            background: 'rgba(37,99,235,.15)',
                            color: '#93c5fd',
                            borderRadius: 4,
                            padding: '1px 4px',
                            animation: `lp-blink .8s ${ri * 0.15}s infinite`,
                          }}
                        >
                          {rule}
                        </span>
                      ))}
                    </span>
                  ) : (
                    s.sub
                  )}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sample transaction */}
      <div
        style={{
          marginTop: 16,
          padding: '10px 12px',
          background: 'rgba(255,255,255,.04)',
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,.06)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 11.5, fontWeight: 600, color: '#e2e8f0', margin: 0 }}>
              Amazon Web Services
            </p>
            <p style={{ fontSize: 10.5, color: '#64748b', margin: '2px 0 0' }}>
              Cloud Services · agent_45
            </p>
          </div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>₹1,200</p>
        </div>
      </div>
    </div>
  );
}

/* ── Hero ─────────────────────────────────────────────────────────────────── */
export default function Hero() {
  const headRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const vizRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const els = [badgeRef, headRef, subRef, ctaRef, vizRef];
    els.forEach((ref, i) => {
      const el = ref.current;
      if (!el) return;
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      setTimeout(
        () => {
          el.style.transition = 'opacity .65s ease, transform .65s ease';
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
        },
        80 + i * 120,
      );
    });
  }, []);

  return (
    <section
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(160deg,#fafbff 0%,#f0f4ff 40%,#f8fafc 100%)',
      }}
      aria-label="Hero"
    >
      {/* Subtle grid */}
      <div
        className="lp-grid-bg"
        style={{ position: 'absolute', inset: 0, opacity: 0.5, pointerEvents: 'none' }}
        aria-hidden
      />

      {/* Radial glow */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '55%',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,99,235,.08) 0%, transparent 70%)',
          pointerEvents: 'none',
          transform: 'translate(-50%,-50%)',
        }}
        aria-hidden
      />

      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '100px 24px 80px',
          width: '100%',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 64,
          alignItems: 'center',
        }}
      >
        {/* Left */}
        <div>
          <div
            ref={badgeRef}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              background: 'rgba(37,99,235,.08)',
              border: '1px solid rgba(37,99,235,.2)',
              borderRadius: 99,
              padding: '5px 14px',
              marginBottom: 24,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#2563eb',
                animation: 'lp-pulse 2s infinite',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                color: '#2563eb',
              }}
            >
              AI-Powered Payment Authorization
            </span>
          </div>

          <h1 ref={headRef} className="lp-h1" style={{ marginBottom: 20 }}>
            <span data-scroll-word>AI can decide</span> what to buy.
            <br />
            <span
              style={{
                background: 'linear-gradient(135deg,#2563eb,#7c3aed)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              SpendGuard decides whether
              <br />
              <span data-scroll-word>it&apos;s allowed to pay.</span>
            </span>
          </h1>

          <p ref={subRef} className="lp-body" style={{ maxWidth: 480, marginBottom: 32 }}>
            SpendGuard sits between autonomous AI agents and payment execution — enforcing the
            policies that decide what AI is <em>allowed</em> to buy.
          </p>

          {/* Pipeline badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 36,
              flexWrap: 'wrap',
            }}
          >
            {['Policy', 'Evaluate', 'Decide', 'Audit'].map((s, i, arr) => (
              <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    letterSpacing: '.06em',
                    textTransform: 'uppercase',
                    color: '#64748b',
                  }}
                >
                  {s}
                </span>
                {i < arr.length - 1 && <span style={{ fontSize: 12, color: '#cbd5e1' }}>→</span>}
              </span>
            ))}
          </div>

          <div ref={ctaRef} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/login" className="lp-btn-primary" aria-label="Open SpendGuard Dashboard">
              Open Dashboard
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M2 7h10M8 3l4 4-4 4" />
              </svg>
            </Link>
            <button
              className="lp-btn-secondary"
              onClick={() =>
                document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })
              }
              aria-label="See how SpendGuard works"
            >
              See How It Works
            </button>
          </div>
        </div>

        {/* Right — visualization */}
        <div ref={vizRef} style={{ display: 'flex', justifyContent: 'center' }}>
          <AuthFlowViz />
        </div>
      </div>

      {/* Scroll hint */}
      <div
        style={{
          position: 'absolute',
          bottom: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
        }}
        aria-hidden
      >
        <span
          style={{
            fontSize: 10.5,
            color: '#94a3b8',
            letterSpacing: '.06em',
            textTransform: 'uppercase',
          }}
        >
          Scroll
        </span>
        <div
          style={{
            width: 1,
            height: 24,
            background: 'linear-gradient(to bottom, #94a3b8, transparent)',
            animation: 'lp-scroll 1.5s infinite',
          }}
        />
      </div>

      {/* Responsive tweak */}
      <style>{`
        @media (max-width: 768px) {
          section[aria-label="Hero"] > div { grid-template-columns: 1fr !important; gap: 40px !important; padding: 90px 20px 60px !important; }
          section[aria-label="Hero"] > div > div:last-child { justify-content: center; }
        }
      `}</style>
    </section>
  );
}
