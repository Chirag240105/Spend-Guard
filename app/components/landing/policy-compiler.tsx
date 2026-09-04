'use client';
import { useEffect, useRef, useState } from 'react';

const OUTPUT_RULES = [
  { label: 'PER-TRANSACTION', value: '₹500', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  { label: 'DAILY LIMIT', value: '₹2,000', color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
  {
    label: 'ALLOWED',
    value: 'Groceries, School Supplies',
    color: '#15803d',
    bg: '#f0fdf4',
    border: '#bbf7d0',
  },
  {
    label: 'BLOCKED',
    value: 'Gaming, Entertainment',
    color: '#b91c1c',
    bg: '#fff1f2',
    border: '#fecaca',
  },
  {
    label: 'APPROVAL REQUIRED',
    value: 'Above ₹500',
    color: '#854d0e',
    bg: '#fffbeb',
    border: '#fde68a',
  },
];

export default function PolicyCompilerSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [animating, setAnimating] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [visibleRules, setVisibleRules] = useState(0);
  const [hasEntered, setHasEntered] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !hasEntered) {
            setHasEntered(true);
            setTimeout(() => runAnimation(), 400);
            (e.target as HTMLElement).classList.add('lp-visible');
          }
        });
      },
      { threshold: 0.3 },
    );
    if (sectionRef.current) io.observe(sectionRef.current);
    return () => io.disconnect();
  }, [hasEntered]); // eslint-disable-line react-hooks/exhaustive-deps

  function runAnimation() {
    setAnimating(true);
    setShowOutput(false);
    setVisibleRules(0);
    setTimeout(() => {
      setShowOutput(true);
      setAnimating(false);
      let r = 0;
      const tick = () => {
        r++;
        setVisibleRules(r);
        if (r < OUTPUT_RULES.length) setTimeout(tick, 140);
      };
      setTimeout(tick, 300);
    }, 1200);
  }

  return (
    <section
      ref={sectionRef}
      aria-labelledby="compiler-heading"
      style={{
        padding: '96px 24px',
        background: 'linear-gradient(160deg,#0b1220 0%,#0f172a 100%)',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }} className="lp-reveal">
          <p
            className="lp-overline"
            style={{ color: '#60a5fa', justifyContent: 'center', marginBottom: 16 }}
          >
            AI Policy Compiler
          </p>
          <h2
            id="compiler-heading"
            className="lp-h2"
            style={{ color: '#f1f5f9', marginBottom: 16 }}
          >
            Write rules like a human.
            <br />
            SpendGuard enforces them like a machine.
          </h2>
          <p className="lp-body" style={{ color: '#94a3b8', maxWidth: 520, margin: '0 auto' }}>
            Describe your spending rules in plain language. SpendGuard compiles them into validated,
            structured policies.
          </p>
        </div>

        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start' }}
        >
          {/* Input */}
          <div className="lp-reveal">
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                color: '#60a5fa',
                marginBottom: 10,
              }}
            >
              Natural Language Input
            </p>
            <div
              style={{
                background: '#0f1a2e',
                border: '1px solid rgba(255,255,255,.1)',
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '10px 16px',
                  borderBottom: '1px solid rgba(255,255,255,.06)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
                <span
                  style={{ fontSize: 11, color: '#475569', marginLeft: 4, fontFamily: 'monospace' }}
                >
                  policy.txt
                </span>
              </div>
              <div
                style={{
                  padding: '20px',
                  fontFamily: 'monospace',
                  fontSize: 13,
                  color: '#cbd5e1',
                  lineHeight: 1.7,
                  minHeight: 160,
                }}
              >
                <span style={{ color: '#60a5fa' }}>{'"'}</span>
                My shopping agent can spend up to <mark data-policy-highlight>
                  ₹2,000 per day
                </mark>{' '}
                on <mark data-policy-highlight>groceries</mark> and school supplies. Never spend
                more than <mark data-policy-highlight>₹500 at once</mark>. Block{' '}
                <mark data-policy-highlight>gaming and entertainment</mark>. Anything above ₹500
                needs my <mark data-policy-highlight>approval</mark>.
                <span style={{ color: '#60a5fa' }}>{'"'}</span>
              </div>
            </div>
            <button
              onClick={runAnimation}
              disabled={animating}
              style={{
                marginTop: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: animating ? '#1e293b' : 'rgba(37,99,235,.15)',
                border: '1px solid rgba(37,99,235,.3)',
                borderRadius: 8,
                padding: '9px 18px',
                fontSize: 13,
                fontWeight: 600,
                color: animating ? '#475569' : '#60a5fa',
                cursor: animating ? 'not-allowed' : 'pointer',
                transition: 'all .15s',
              }}
            >
              {animating ? (
                <>
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      border: '2px solid #475569',
                      borderTopColor: '#60a5fa',
                      borderRadius: '50%',
                      animation: 'spin .7s linear infinite',
                      display: 'inline-block',
                    }}
                  />{' '}
                  Compiling…
                </>
              ) : (
                <>
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 13 13"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <polygon points="3,1 12,6.5 3,12" />
                  </svg>{' '}
                  Run Compiler
                </>
              )}
            </button>
          </div>

          {/* Output */}
          <div className="lp-reveal lp-reveal-delay-2">
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                color: '#34d399',
                marginBottom: 10,
              }}
            >
              Compiled Structured Policy
            </p>
            <div
              style={{
                background: '#0f1a2e',
                border: '1px solid rgba(255,255,255,.1)',
                borderRadius: 12,
                overflow: 'hidden',
                minHeight: 240,
              }}
            >
              <div
                style={{
                  padding: '10px 16px',
                  borderBottom: '1px solid rgba(255,255,255,.06)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
                <span
                  style={{ fontSize: 11, color: '#475569', marginLeft: 4, fontFamily: 'monospace' }}
                >
                  policy.json
                </span>
                {showOutput && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: 10,
                      background: '#16a34a20',
                      color: '#22c55e',
                      border: '1px solid #16a34a40',
                      borderRadius: 4,
                      padding: '1px 7px',
                      fontWeight: 700,
                    }}
                  >
                    ✓ VALIDATED
                  </span>
                )}
              </div>
              <div style={{ padding: '20px', minHeight: 200 }}>
                {!showOutput && !animating && (
                  <p style={{ fontSize: 12, color: '#334155', fontFamily: 'monospace' }}>
                    {'// Click "Run Compiler" to see output'}
                  </p>
                )}
                {animating && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      'Parsing intent…',
                      'Extracting limits…',
                      'Mapping categories…',
                      'Validating schema…',
                    ].map((s, i) => (
                      <div
                        key={s}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          opacity: 0,
                          animation: `lp-fade-up .4s ${i * 0.2}s forwards`,
                        }}
                      >
                        <span
                          style={{
                            width: 14,
                            height: 14,
                            border: '2px solid #334155',
                            borderTopColor: '#60a5fa',
                            borderRadius: '50%',
                            animation: 'spin .7s linear infinite',
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontSize: 12, color: '#475569', fontFamily: 'monospace' }}>
                          {s}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {showOutput && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {OUTPUT_RULES.slice(0, visibleRules).map((rule, i) => (
                      <div
                        key={rule.label}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: rule.bg + '18',
                          border: `1px solid ${rule.border}30`,
                          borderRadius: 8,
                          padding: '8px 12px',
                          opacity: 0,
                          animation: `lp-fade-up .3s ${i * 0.05}s forwards`,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            letterSpacing: '.08em',
                            color: rule.color + 'cc',
                            textTransform: 'uppercase',
                          }}
                        >
                          {rule.label}
                        </span>
                        <span
                          style={{
                            fontSize: 12.5,
                            fontWeight: 700,
                            color: '#f1f5f9',
                            fontFamily: 'monospace',
                          }}
                        >
                          {rule.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media(max-width:768px) { section[aria-labelledby="compiler-heading"] > div > div:last-of-type { grid-template-columns:1fr !important; } }
      `}</style>
    </section>
  );
}
