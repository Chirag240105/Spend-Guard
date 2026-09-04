'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

const Logo = () => (
  <Link
    href="/"
    aria-label="SpendGuard home"
    style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}
  >
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        background: 'linear-gradient(135deg,#2563eb,#1d4ed8)',
        display: 'grid',
        placeItems: 'center',
        boxShadow: '0 1px 4px rgba(37,99,235,.4)',
        flexShrink: 0,
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M8 1L2 3.5v4.25C2 11 4.5 13.75 8 15c3.5-1.25 6-4 6-7.25V3.5L8 1z"
          fill="white"
          fillOpacity=".9"
        />
        <path
          d="M5.5 8l1.75 2L10.5 6"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
    <div>
      <span
        style={{
          display: 'block',
          fontSize: 14,
          fontWeight: 800,
          letterSpacing: '-.025em',
          color: '#0f172a',
          lineHeight: 1.1,
        }}
      >
        SpendGuard
      </span>
      <span style={{ display: 'block', fontSize: 10, color: '#64748b', letterSpacing: '.02em' }}>
        AI Auth Layer
      </span>
    </div>
  </Link>
);

const NAV_LINKS = [
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
  { label: 'Architecture', href: '#architecture' },
];

export default function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  function scrollTo(href: string) {
    setMenuOpen(false);
    const id = href.replace('#', '');
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <nav
      className={`lp-nav${scrolled ? ' scrolled' : ''}`}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="lp-nav-inner">
        <Logo />

        {/* Desktop links */}
        <div className="hidden sm:flex" style={{ alignItems: 'center', gap: 4 }}>
          {NAV_LINKS.map((l) => (
            <button
              key={l.href}
              onClick={() => scrollTo(l.href)}
              style={{
                background: 'none',
                border: 'none',
                padding: '6px 12px',
                fontSize: 13.5,
                fontWeight: 500,
                color: '#475569',
                cursor: 'pointer',
                borderRadius: 8,
                transition: 'color .15s, background .15s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = '#0f172a';
                (e.currentTarget as HTMLElement).style.background = '#f1f5f9';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = '#475569';
                (e.currentTarget as HTMLElement).style.background = '';
              }}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden sm:flex" style={{ alignItems: 'center', gap: 8 }}>
          <Link
            href="/login"
            style={{
              fontSize: 13.5,
              fontWeight: 600,
              color: '#475569',
              textDecoration: 'none',
              padding: '6px 12px',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = '#0f172a';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = '#475569';
            }}
          >
            Login
          </Link>
          <Link
            href="/login"
            className="lp-btn-primary"
            style={{ padding: '.5625rem 1.125rem', fontSize: 13.5, borderRadius: 8 }}
          >
            Open Dashboard →
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          style={{
            background: 'none',
            border: 'none',
            padding: 8,
            cursor: 'pointer',
            color: '#475569',
          }}
        >
          {menuOpen ? (
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M4 4l12 12M16 4L4 16" />
            </svg>
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M3 6h14M3 10h14M3 14h14" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'rgba(255,255,255,.97)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid #e2e8f0',
            padding: '12px 16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {NAV_LINKS.map((l) => (
            <button
              key={l.href}
              onClick={() => scrollTo(l.href)}
              style={{
                background: 'none',
                border: 'none',
                padding: '10px 12px',
                fontSize: 14,
                fontWeight: 500,
                color: '#1e293b',
                cursor: 'pointer',
                borderRadius: 8,
                textAlign: 'left',
              }}
            >
              {l.label}
            </button>
          ))}
          <div
            style={{
              borderTop: '1px solid #f1f5f9',
              marginTop: 8,
              paddingTop: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              style={{
                padding: '10px 12px',
                fontSize: 14,
                fontWeight: 600,
                color: '#475569',
                textDecoration: 'none',
              }}
            >
              Login
            </Link>
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="lp-btn-primary"
              style={{ justifyContent: 'center' }}
            >
              Open Dashboard →
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
