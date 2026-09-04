'use client';
import { useEffect, useRef } from 'react';

export default function ArchitectureSection() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) (e.target as HTMLElement).classList.add('lp-visible');
      },
      { threshold: 0.1 },
    );
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  return (
    <section
      id="architecture"
      ref={ref}
      aria-labelledby="arch-heading"
      className="lp-reveal"
      style={{
        padding: '96px 24px',
        background: 'linear-gradient(160deg,#0b1220 0%,#0f172a 100%)',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <p
            className="lp-overline"
            style={{ color: '#60a5fa', justifyContent: 'center', marginBottom: 16 }}
          >
            Technical Architecture
          </p>
          <h2 id="arch-heading" className="lp-h2" style={{ color: '#f1f5f9', marginBottom: 12 }}>
            Designed for reliability.
          </h2>
          <p className="lp-body" style={{ color: '#94a3b8', maxWidth: 520, margin: '0 auto' }}>
            A modular monolith — every component purpose-built, nothing over-engineered.
          </p>
        </div>

        {/* Main arch diagram */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0,
            position: 'relative',
          }}
        >
          {/* AI Agent */}
          <ArchNode label="AI Agent" sub="Initiates spend request" icon="🤖" color="#6366f1" />
          <Arrow />

          {/* SpendGuard API */}
          <div
            style={{
              background: 'rgba(37,99,235,.1)',
              border: '1.5px solid rgba(37,99,235,.4)',
              borderRadius: 14,
              padding: '20px 32px',
              textAlign: 'center',
              width: '100%',
              maxWidth: 480,
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                color: '#60a5fa',
                margin: '0 0 8px',
              }}
            >
              SpendGuard API · Next.js
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
              {[
                { l: 'Policy Engine', c: '#6366f1' },
                { l: 'AI Policy Compiler', c: '#8b5cf6' },
                { l: 'Decision Engine', c: '#2563eb' },
                { l: 'Spending Context', c: '#0891b2' },
                { l: 'Approval Queue', c: '#f59e0b' },
                { l: 'Audit Layer', c: '#10b981' },
              ].map((b) => (
                <div
                  key={b.l}
                  style={{
                    background: 'rgba(255,255,255,.04)',
                    border: `1px solid ${b.c}30`,
                    borderRadius: 8,
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: b.c,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 11.5, fontWeight: 500, color: '#cbd5e1' }}>{b.l}</span>
                </div>
              ))}
            </div>
          </div>
          <Arrow />

          {/* Decision */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { l: 'ALLOW', c: '#22c55e', bg: '#dcfce7' },
              { l: 'HOLD', c: '#f59e0b', bg: '#fef9c3' },
              { l: 'BLOCK', c: '#ef4444', bg: '#fee2e2' },
            ].map((d) => (
              <div
                key={d.l}
                style={{
                  background: d.bg,
                  border: `1.5px solid ${d.c}60`,
                  borderRadius: 8,
                  padding: '8px 20px',
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: '.06em',
                  color: d.c,
                }}
              >
                {d.l}
              </div>
            ))}
          </div>
          <Arrow />

          {/* Data stores + Provider */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3,1fr)',
              gap: 12,
              width: '100%',
              maxWidth: 480,
            }}
          >
            {[
              {
                l: 'PostgreSQL',
                sub: 'Policies · Transactions · Ledger · Audit',
                color: '#60a5fa',
              },
              { l: 'Redis', sub: 'Spend counters · Idempotency locks', color: '#34d399' },
              { l: 'Payment Provider', sub: 'Mock · Razorpay adapter', color: '#f472b6' },
            ].map((s) => (
              <div
                key={s.l}
                style={{
                  background: 'rgba(255,255,255,.04)',
                  border: '1px solid rgba(255,255,255,.08)',
                  borderRadius: 10,
                  padding: '12px 14px',
                }}
              >
                <p style={{ fontSize: 12, fontWeight: 700, color: s.color, margin: '0 0 4px' }}>
                  {s.l}
                </p>
                <p style={{ fontSize: 10.5, color: '#475569', margin: 0, lineHeight: 1.4 }}>
                  {s.sub}
                </p>
              </div>
            ))}
          </div>

          {/* BullMQ worker row */}
          <div
            style={{
              marginTop: 20,
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            {[
              { l: 'BullMQ / Outbox Relay', sub: 'Async job dispatch', color: '#f59e0b' },
              { l: 'AI Diagnosis Worker', sub: 'Failure classification', color: '#8b5cf6' },
            ].map((w) => (
              <div
                key={w.l}
                style={{
                  background: 'rgba(255,255,255,.03)',
                  border: `1px solid ${w.color}30`,
                  borderRadius: 8,
                  padding: '8px 16px',
                  display: 'flex',
                  gap: 7,
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: w.color,
                    animation: 'lp-pulse 2s infinite',
                  }}
                />
                <div>
                  <p style={{ fontSize: 11.5, fontWeight: 600, color: '#cbd5e1', margin: 0 }}>
                    {w.l}
                  </p>
                  <p style={{ fontSize: 10.5, color: '#475569', margin: 0 }}>{w.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI safety note */}
        <div
          style={{
            marginTop: 48,
            padding: '16px 20px',
            background: 'rgba(139,92,246,.1)',
            border: '1px solid rgba(139,92,246,.25)',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }} aria-hidden>
            🛡️
          </span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#c4b5fd', margin: '0 0 4px' }}>
              AI Safety Guarantee
            </p>
            <p style={{ fontSize: 12.5, color: '#94a3b8', margin: 0, lineHeight: 1.6 }}>
              The AI diagnosis worker receives only sanitized context and{' '}
              <strong style={{ color: '#c4b5fd' }}>has no tools for payment execution</strong>. AI
              recommends. The deterministic policy engine decides. The recovery engine executes.
              Money never moves because an AI said so.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ArchNode({
  label,
  sub,
  icon,
  color,
}: {
  label: string;
  sub: string;
  icon: string;
  color: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: 'rgba(255,255,255,.04)',
        border: `1px solid ${color}30`,
        borderRadius: 10,
        padding: '10px 20px',
        marginBottom: 0,
      }}
    >
      <span style={{ fontSize: 18 }} aria-hidden>
        {icon}
      </span>
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{label}</p>
        <p style={{ fontSize: 11, color: '#475569', margin: 0 }}>{sub}</p>
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6px 0' }}
      aria-hidden
    >
      <div style={{ width: 1.5, height: 20, background: 'rgba(255,255,255,.12)' }} />
      <svg width="8" height="6" viewBox="0 0 8 6" fill="rgba(255,255,255,.2)">
        <path d="M0 0l4 6 4-6z" />
      </svg>
    </div>
  );
}
