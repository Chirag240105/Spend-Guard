'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleLogin(e: React.FormEvent, demoMode = false) {
    e.preventDefault();
    setBusy(true);
    setError('');

    const creds = demoMode
      ? { email: 'alex@spendguard.demo', password: 'demo1234' }
      : { email, password };

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(creds),
    });

    if (res.ok) {
      router.push('/dashboard');
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Login failed');
      setBusy(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      padding: '20px',
    }}>
      <div style={{
        width: '100%', maxWidth: 420,
        background: 'white', borderRadius: 16, padding: '40px 36px',
        boxShadow: '0 25px 50px rgba(0,0,0,.3)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            display: 'grid', placeItems: 'center',
            boxShadow: '0 2px 8px rgba(37,99,235,.4)',
            flexShrink: 0,
          }}>
            <span style={{ color: 'white', fontSize: 13, fontWeight: 800 }}>SG</span>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-.02em', color: '#0f172a' }}>SpendGuard</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>Payment Recovery Platform</div>
          </div>
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-.025em' }}>
          Sign in to continue
        </h1>
        <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 24px' }}>
          AI-powered payment failure diagnosis and recovery
        </p>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
              Email
            </label>
            <input
              type="email" required autoComplete="email"
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              style={{
                width: '100%', border: '1px solid #e2e8f0', borderRadius: 8,
                padding: '9px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={e => (e.target.style.borderColor = '#2563eb')}
              onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
              Password
            </label>
            <input
              type="password" required autoComplete="current-password"
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%', border: '1px solid #e2e8f0', borderRadius: 8,
                padding: '9px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={e => (e.target.style.borderColor = '#2563eb')}
              onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
            />
          </div>

          {error && (
            <div style={{ background: '#fff1f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#b91c1c', marginBottom: 14 }}>
              {error}
            </div>
          )}

          <button
            type="submit" disabled={busy}
            style={{
              width: '100%', background: '#2563eb', color: 'white', border: 'none',
              borderRadius: 8, padding: '10px 0', fontSize: 14, fontWeight: 700,
              cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.7 : 1,
              marginBottom: 10, transition: 'background .15s',
            }}
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {/* Demo mode button */}
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16, textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>
            Evaluating SpendGuard? Use the demo account.
          </p>
          <button
            onClick={e => handleLogin(e as unknown as React.FormEvent, true)}
            disabled={busy}
            style={{
              width: '100%', background: 'transparent', border: '1px solid #2563eb',
              borderRadius: 8, padding: '9px 0', fontSize: 13, fontWeight: 600,
              color: '#2563eb', cursor: 'pointer',
            }}
          >
            ⚡ Enter Demo Mode
          </button>
          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
            alex@spendguard.demo · demo1234
          </p>
        </div>
      </div>
    </div>
  );
}
