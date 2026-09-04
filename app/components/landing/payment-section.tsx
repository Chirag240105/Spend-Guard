'use client';
import { useEffect, useRef } from 'react';

export default function PaymentSection() {
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
      aria-labelledby="payment-heading"
      className="lp-reveal"
      style={{
        padding: '80px 24px',
        background: '#f8fafc',
        borderTop: '1px solid #e2e8f0',
        borderBottom: '1px solid #e2e8f0',
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 64,
          alignItems: 'center',
        }}
      >
        {/* Left */}
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              background: 'rgba(37,99,235,.08)',
              border: '1px solid rgba(37,99,235,.2)',
              borderRadius: 6,
              padding: '4px 12px',
              marginBottom: 20,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                color: '#2563eb',
              }}
            >
              Built for Agentic Payments
            </span>
          </div>
          <h2 id="payment-heading" className="lp-h2" style={{ marginBottom: 16 }}>
            Works with your
            <br />
            payment provider.
          </h2>
          <p className="lp-body" style={{ marginBottom: 20 }}>
            SpendGuard includes a payment provider abstraction with a Razorpay adapter path —
            meaning it can sit before real payment execution as an authorization layer.
          </p>
          <p className="lp-body-sm" style={{ marginBottom: 24 }}>
            The architecture separates authorization (SpendGuard) from execution (Razorpay / any
            provider). AI never has direct access to payment tools.
          </p>
          <div
            style={{
              padding: '12px 16px',
              background: 'rgba(37,99,235,.06)',
              border: '1px solid rgba(37,99,235,.15)',
              borderRadius: 8,
            }}
          >
            <p style={{ fontSize: 11.5, color: '#1e40af', margin: 0, lineHeight: 1.6 }}>
              <strong>Note:</strong> SpendGuard is an independent open-source project built for the
              Razorpay AI Buildathon. It is not an official Razorpay product.
            </p>
          </div>
        </div>

        {/* Right — flow */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: 'Your Frontend', sub: 'Checkout UI', color: '#6366f1' },
            { label: 'SpendGuard API', sub: 'Authorization layer', color: '#2563eb' },
            { label: 'Policy Engine', sub: 'Deterministic evaluation', color: '#0891b2' },
            { label: 'ALLOW', sub: 'If policy permits', color: '#15803d', special: true },
            { label: 'Payment Provider', sub: 'Razorpay / Mock adapter', color: '#f59e0b' },
          ].map((s, i, arr) => (
            <div
              key={s.label}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: s.special ? '#dcfce7' : '#fff',
                  border: `1px solid ${s.special ? '#86efac' : '#e2e8f0'}`,
                  borderRadius: 10,
                  padding: '10px 16px',
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: s.special ? '#15803d' : '#1e293b',
                      margin: 0,
                    }}
                  >
                    {s.label}
                  </p>
                  <p style={{ fontSize: 11.5, color: '#64748b', margin: '1px 0 0' }}>{s.sub}</p>
                </div>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
              </div>
              {i < arr.length - 1 && (
                <div style={{ width: 1.5, height: 14, background: '#e2e8f0' }} aria-hidden />
              )}
            </div>
          ))}
        </div>
      </div>
      <style>{`@media(max-width:768px){section[aria-labelledby="payment-heading"]>div{grid-template-columns:1fr!important;gap:40px!important;}}`}</style>
    </section>
  );
}
