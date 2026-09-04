'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';

// ── Icons ─────────────────────────────────────────────────────────────────
const Icons = {
  Overview: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/>
      <rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/>
    </svg>
  ),
  Policies: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1L2 3.5v4.25C2 11 4.5 13.75 8 15c3.5-1.25 6-4 6-7.25V3.5L8 1z"/>
    </svg>
  ),
  Transactions: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 5h12M2 8h8M2 11h5"/><path d="M11 9l3 3-3 3"/>
    </svg>
  ),
  Approvals: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6.5"/><path d="M5.5 8l1.75 2L10.5 6"/>
    </svg>
  ),
  Audit: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5L10 2z"/><path d="M10 2v3h3M5 7h6M5 9.5h6M5 12h4"/>
    </svg>
  ),
  AI: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v2M8 12v2M2 8h2M12 8h2M3.5 3.5l1.5 1.5M11 11l1.5 1.5M3.5 12.5L5 11M11 5l1.5-1.5"/>
      <circle cx="8" cy="8" r="2.5"/>
    </svg>
  ),
  Payments: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="14" height="10" rx="2"/>
      <path d="M1 6.5h14"/>
    </svg>
  ),
  Bell: () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 2a5 5 0 0 0-5 5v3l-1.5 2h13L14 10V7a5 5 0 0 0-5-5zM7 15a2 2 0 0 0 4 0"/>
    </svg>
  ),
  Settings: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2.5"/>
      <path d="M8 1.5v1.25M8 13.25v1.25M1.5 8h1.25M13.25 8h1.25M3 3l.88.88M12.12 12.12l.88.88M3 13l.88-.88M12.12 3.88l.88-.88"/>
    </svg>
  ),
  Logout: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5.5 13H2.5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1H5.5M10 10.5l3-3-3-3M13 7.5H6"/>
    </svg>
  ),
  Chevron: () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5l2 2 2-2"/>
    </svg>
  ),
};

const links = [
  { label: 'Overview',     href: '/dashboard',      Icon: Icons.Overview },
  { label: 'Payments',     href: '/payments',        Icon: Icons.Payments },
  { label: 'Policies',     href: '/policies',        Icon: Icons.Policies },
  { label: 'Transactions', href: '/transactions',    Icon: Icons.Transactions },
  { label: 'Approvals',    href: '/approvals',       Icon: Icons.Approvals },
  { label: 'AI Decisions', href: '/ai-decisions',    Icon: Icons.AI },
  { label: 'Audit Log',    href: '/audit',           Icon: Icons.Audit },
] as const;

interface User { id: string; email: string; name: string; role: string }

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState(0);

  // On mount, verify session
  const checkAuth = useCallback(async () => {
    if (path === '/login') { setAuthChecked(true); return; }
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setAuthChecked(true);
      } else {
        router.replace('/login');
      }
    } catch {
      router.replace('/login');
    }
  }, [path, router]);

  useEffect(() => { void checkAuth(); }, [checkAuth]);

  // Poll pending approvals
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const r = await fetch('/api/v1/approvals', { credentials: 'include' });
        if (r.ok) { const d = await r.json(); setPendingApprovals(d.approvals?.length ?? 0); }
      } catch { /* ignore */ }
    };
    void load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [user]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    router.replace('/login');
  }

  // Don't render shell on login page
  if (path === '/login') return <>{children}</>;

  // Show skeleton while checking auth
  if (!authChecked) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--canvas)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2.5px solid #2563eb', borderTopColor: 'transparent', margin: '0 auto 12px', animation: 'spin .7s linear infinite' }} />
          Loading SpendGuard…
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2) : '?';

  return (
    <div className="min-h-screen" style={{ background: 'var(--canvas)' }}>
      {/* ── Header ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--line)', boxShadow: '0 1px 0 rgba(15,23,42,.04)',
      }}>
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between px-4 sm:px-6">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', display: 'grid', placeItems: 'center', boxShadow: '0 1px 4px rgba(37,99,235,.4)', flexShrink: 0 }}>
                <span style={{ color: 'white', fontSize: 11, fontWeight: 800 }}>SG</span>
              </div>
              <div className="hidden sm:block">
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-.02em' }}>SpendGuard</div>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>AI Payment Recovery</div>
              </div>
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--canvas)', border: '1px solid var(--line)', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 500, color: 'var(--ink-2)' }}>
              <span>Main Org</span>
              <span style={{ background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 99, padding: '1px 6px', fontSize: 10, fontWeight: 700, letterSpacing: '.04em' }}>PROTECTED</span>
              <Icons.Chevron />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button aria-label="Notifications" style={{ position: 'relative', width: 34, height: 34, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--canvas-2)', display: 'grid', placeItems: 'center', color: 'var(--muted)', cursor: 'pointer' }}>
              <Icons.Bell />
              {pendingApprovals > 0 && (
                <span style={{ position: 'absolute', top: 3, right: 3, width: 14, height: 14, background: '#ef4444', color: 'white', borderRadius: '50%', fontSize: 8, fontWeight: 800, display: 'grid', placeItems: 'center', border: '1.5px solid white' }}>
                  {pendingApprovals > 9 ? '9+' : pendingApprovals}
                </span>
              )}
            </button>
            <div style={{ width: 1, height: 20, background: 'var(--line)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'grid', placeItems: 'center', color: 'white', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                {initials}
              </div>
              <span className="hidden sm:block" style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>{user?.name}</span>
            </div>
            <button onClick={handleLogout} title="Sign out" style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', display: 'grid', placeItems: 'center', color: 'var(--muted)', cursor: 'pointer' }}>
              <Icons.Logout />
            </button>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="mx-auto flex max-w-[1440px]">
        {/* ── Sidebar ── */}
        <aside className="hidden lg:flex" style={{ width: 220, flexShrink: 0, flexDirection: 'column', borderRight: '1px solid var(--line)', background: 'var(--canvas-2)', minHeight: 'calc(100vh - 56px)', position: 'sticky', top: 56, padding: '20px 12px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted-2)', padding: '0 8px', marginBottom: 8 }}>Workspace</p>
          <nav className="space-y-0.5" aria-label="Main navigation">
            {links.map(({ label, href, Icon }) => {
              const active = href === '/dashboard' ? path === '/dashboard' : path.startsWith(href);
              const badge = label === 'Approvals' ? pendingApprovals : 0;
              return (
                <Link key={href} href={href} className={active ? 'nav-active' : ''}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, borderRadius: 8, padding: '8px 10px', fontSize: 13, fontWeight: active ? 600 : 500, color: active ? 'var(--blue)' : 'var(--muted)', textDecoration: 'none' }}
                  onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'var(--line-2)'; (e.currentTarget as HTMLElement).style.color = 'var(--ink)'; } }}
                  onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'var(--muted)'; } }}
                >
                  <span style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }}><Icon /></span>
                  <span style={{ flex: 1 }}>{label}</span>
                  {badge > 0 && <span style={{ background: 'var(--blue)', color: 'white', borderRadius: 99, minWidth: 18, height: 18, fontSize: 10, fontWeight: 700, display: 'grid', placeItems: 'center', padding: '0 5px' }}>{badge}</span>}
                </Link>
              );
            })}
          </nav>
          <div style={{ marginTop: 'auto', paddingTop: 20 }}>
            <div style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)', borderRadius: 12, padding: '14px', color: 'white' }}>
              <p style={{ fontSize: 11, fontWeight: 700, margin: '0 0 4px' }}>🛡️ AI Safety Guarantee</p>
              <p style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>AI recommends. Policy decides. Money never moves without rules.</p>
            </div>
          </div>
        </aside>

        {/* ── Main ── */}
        <main style={{ minWidth: 0, flex: 1, padding: '28px 28px 80px', maxWidth: '100%' }}>
          {children}
        </main>
      </div>

      {/* ── Mobile nav ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden" style={{ display: 'flex', borderTop: '1px solid var(--line)', background: 'rgba(255,255,255,.95)', backdropFilter: 'blur(12px)', padding: '6px 4px 10px' }}>
        {links.slice(0, 5).map(({ label, href, Icon }) => {
          const active = href === '/dashboard' ? path === '/dashboard' : path.startsWith(href);
          const badge = label === 'Approvals' ? pendingApprovals : 0;
          return (
            <Link key={href} href={href} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, borderRadius: 8, padding: '4px 2px', textDecoration: 'none', color: active ? 'var(--blue)' : 'var(--muted)', fontSize: 9, fontWeight: 600, position: 'relative' }}>
              <Icon /><span>{label}</span>
              {badge > 0 && <span style={{ position: 'absolute', top: 2, right: '50%', transform: 'translateX(6px)', background: 'var(--blue)', color: 'white', borderRadius: 99, width: 14, height: 14, fontSize: 8, fontWeight: 800, display: 'grid', placeItems: 'center', border: '1.5px solid white' }}>{badge}</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
