'use client';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

export default function FinalCTA() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) (e.target as HTMLElement).classList.add('lp-visible');
      },
      { threshold: 0.2 },
    );
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      aria-labelledby="cta-heading"
      className="lp-reveal"
      style={{
        padding: '100px 24px',
        background: 'linear-gradient(160deg,#0b1220 0%,#0f172a 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background glow */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 700,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,99,235,.12) 0%, transparent 70%)',
          transform: 'translate(-50%,-50%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            background: 'rgba(37,99,235,.15)',
            border: '1px solid rgba(37,99,235,.3)',
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
              background: '#60a5fa',
              animation: 'lp-pulse 2s infinite',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              color: '#60a5fa',
            }}
          >
            Ready to use
          </span>
        </div>

        <h2 id="cta-heading" className="lp-h2" style={{ color: '#f1f5f9', marginBottom: 20 }}>
          Let AI act.
          <br />
          Keep spending under control.
        </h2>

        <p className="lp-body" style={{ color: '#94a3b8', maxWidth: 480, margin: '0 auto 40px' }}>
          Define the rules once. Let SpendGuard enforce them on every transaction — with full
          transparency and a complete audit trail.
        </p>

        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/login" className="lp-btn-primary" aria-label="Open SpendGuard">
            Open SpendGuard
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
            style={{ borderColor: 'rgba(255,255,255,.15)', color: '#cbd5e1' }}
            onClick={() =>
              document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })
            }
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.06)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,.3)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = '';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,.15)';
            }}
          >
            View authorization flow
          </button>
        </div>

        {/* Trust indicators */}
        <div
          style={{
            display: 'flex',
            gap: 24,
            justifyContent: 'center',
            marginTop: 48,
            flexWrap: 'wrap',
          }}
        >
          {[
            { icon: '🛡️', label: 'Deterministic decisions' },
            { icon: '📋', label: 'Full audit trail' },
            { icon: '🔒', label: 'AI never moves money' },
          ].map((t) => (
            <div
              key={t.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                fontSize: 12.5,
                color: '#64748b',
              }}
            >
              <span aria-hidden>{t.icon}</span>
              <span>{t.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
