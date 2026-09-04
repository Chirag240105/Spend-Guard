import Link from 'next/link';
export default function NotFound() {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '80px 24px',
        borderRadius: 16,
        border: '1px solid var(--line)',
        background: 'white',
        maxWidth: 440,
        margin: '0 auto',
      }}
    >
      <p style={{ fontSize: 48, margin: '0 0 12px', lineHeight: 1 }}>🔍</p>
      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '.1em',
          textTransform: 'uppercase',
          color: 'var(--blue)',
          margin: '0 0 8px',
        }}
      >
        404
      </p>
      <h1
        style={{
          fontSize: 20,
          fontWeight: 800,
          color: 'var(--ink)',
          margin: '0 0 8px',
          letterSpacing: '-.025em',
        }}
      >
        Page not found
      </h1>
      <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 24px' }}>
        This page does not exist or has been moved.
      </p>
      <Link href="/dashboard" className="primary-button" style={{ display: 'inline-flex' }}>
        Back to Overview
      </Link>
    </div>
  );
}
