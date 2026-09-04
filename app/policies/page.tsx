'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PageState } from '@/src/components/page-state';

type Policy = { id: string; name: string; active: boolean; version: number; createdAt: string };

const PlusIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 13 13"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M6.5 2v9M2 6.5h9" />
  </svg>
);

const ShieldIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M8 1L2 3.5v4.25C2 11 4.5 13.75 8 15c3.5-1.25 6-4 6-7.25V3.5L8 1z" />
  </svg>
);

export default function PoliciesPage() {
  const [data, setData] = useState<{ policies: Policy[] }>();
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/policies?limit=100')
      .then(async (r) => (r.ok ? setData(await r.json()) : setError('Unable to load policies.')))
      .catch(() => setError('Unable to load policies.'));
  }, []);

  if (error) return <PageState error message={error} />;
  if (!data) return <PageState message="Loading policies…" />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="animate-fade-in">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <p className="eyebrow" style={{ marginBottom: 6 }}>
            Policy management
          </p>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: 'var(--ink)',
              margin: 0,
              letterSpacing: '-.025em',
            }}
          >
            Control every spend
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
            {data.policies.length} polic{data.policies.length === 1 ? 'y' : 'ies'} protecting agent
            spend
          </p>
        </div>
        <Link href="/policies/new" className="primary-button">
          <PlusIcon /> New Policy
        </Link>
      </div>

      {/* Policy grid */}
      {data.policies.length ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 12,
          }}
        >
          {data.policies.map((p) => (
            <Link
              key={p.id}
              href={`/policies/${p.id}`}
              className="surface surface-hover"
              style={{ display: 'block', padding: '18px 20px', textDecoration: 'none' }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: p.active ? '#eff6ff' : 'var(--canvas)',
                      border: `1px solid ${p.active ? '#bfdbfe' : 'var(--line)'}`,
                      display: 'grid',
                      placeItems: 'center',
                      color: p.active ? 'var(--blue)' : 'var(--muted)',
                      flexShrink: 0,
                    }}
                  >
                    <ShieldIcon />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
                      {p.name}
                    </h2>
                    <p style={{ fontSize: 11.5, color: 'var(--muted)', margin: '2px 0 0' }}>
                      v{p.version} ·{' '}
                      {new Date(p.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <span
                  style={{
                    background: p.active ? '#dcfce7' : 'var(--canvas)',
                    color: p.active ? '#15803d' : 'var(--muted)',
                    border: `1px solid ${p.active ? '#bbf7d0' : 'var(--line)'}`,
                    borderRadius: 99,
                    padding: '3px 9px',
                    fontSize: 11,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {p.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <PageState message="No policies yet. Create your first policy to begin." />
      )}
    </div>
  );
}
