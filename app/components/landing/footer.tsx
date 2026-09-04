import Link from 'next/link';

const YEAR = new Date().getFullYear();

export default function LandingFooter() {
  return (
    <footer
      style={{
        background: '#0b1220',
        borderTop: '1px solid rgba(255,255,255,.06)',
        padding: '48px 24px 32px',
      }}
      role="contentinfo"
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Top row */}
        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 40, marginBottom: 48 }}
        >
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 7,
                  background: 'linear-gradient(135deg,#2563eb,#1d4ed8)',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <path
                    d="M7 1L2 3.2v3.75C2 9.6 4.2 12 7 13c2.8-1 5-3.4 5-6.05V3.2L7 1z"
                    fill="white"
                    fillOpacity=".9"
                  />
                  <path
                    d="M4.5 7l1.75 2L9.5 5.5"
                    stroke="white"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span
                style={{ fontSize: 14, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-.02em' }}
              >
                SpendGuard
              </span>
            </div>
            <p
              style={{
                fontSize: 12.5,
                color: '#475569',
                lineHeight: 1.6,
                margin: '0 0 12px',
                maxWidth: 240,
              }}
            >
              AI Policy &amp; Authorization Layer for Agentic Payments.
            </p>
            <p style={{ fontSize: 11.5, color: '#334155', margin: 0, lineHeight: 1.5 }}>
              Built for the Razorpay AI Buildathon.
            </p>
          </div>

          {/* Product links */}
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                color: '#475569',
                margin: '0 0 16px',
              }}
            >
              Product
            </p>
            <nav aria-label="Footer product navigation">
              {[
                { label: 'How It Works', href: '#how-it-works' },
                { label: 'Features', href: '#features' },
                { label: 'Architecture', href: '#architecture' },
                { label: 'Login', href: '/login' },
              ].map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  style={{
                    display: 'block',
                    fontSize: 13,
                    color: '#64748b',
                    textDecoration: 'none',
                    marginBottom: 10,
                    transition: 'color .15s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = '#94a3b8';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = '#64748b';
                  }}
                >
                  {l.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Tech stack */}
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                color: '#475569',
                margin: '0 0 16px',
              }}
            >
              Built With
            </p>
            {[
              'Next.js 16  ·  TypeScript',
              'PostgreSQL  ·  Prisma ORM',
              'Redis  ·  BullMQ',
              'Grok / Gemini AI',
              'Zod  ·  bcryptjs  ·  JWT',
            ].map((t) => (
              <p
                key={t}
                style={{
                  fontSize: 12,
                  color: '#334155',
                  margin: '0 0 8px',
                  fontFamily: 'monospace',
                }}
              >
                {t}
              </p>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div
          style={{ height: 1, background: 'rgba(255,255,255,.06)', marginBottom: 24 }}
          role="separator"
        />

        {/* Bottom row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <p style={{ fontSize: 12, color: '#334155', margin: 0 }}>
            © {YEAR} SpendGuard. Open-source project.
          </p>
          <p style={{ fontSize: 12, color: '#334155', margin: 0 }}>
            <span style={{ color: '#475569' }}>
              AI recommends. Policy decides. Money never moves without rules.
            </span>
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          footer > div > div:first-of-type {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }
          footer > div > div:last-of-type {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
        }
      `}</style>
    </footer>
  );
}
