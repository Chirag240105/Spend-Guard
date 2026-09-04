/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useEffect, useState } from 'react';
import { PageState } from '@/src/components/page-state';

const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6.5" cy="6.5" r="4.5"/><path d="M10.5 10.5l3 3"/>
  </svg>
);

const ChevronDown = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 4.5l3 3 3-3"/>
  </svg>
);

function eventColor(event: string) {
  if (event.includes('BLOCK'))  return { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca' };
  if (event.includes('ALLOW'))  return { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' };
  if (event.includes('HOLD'))   return { bg: '#fef9c3', color: '#92400e', border: '#fde68a' };
  if (event.includes('CREATE')) return { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' };
  return { bg: 'var(--canvas)', color: 'var(--muted)', border: 'var(--line)' };
}

export default function Audit() {
  const [data, setData]     = useState<any>();
  const [event, setEvent]   = useState('');
  const [error, setError]   = useState('');
  const [open, setOpen]     = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/audit?limit=100${event ? `&event=${encodeURIComponent(event)}` : ''}`)
      .then(async r => r.ok ? setData(await r.json()) : setError('Unable to load audit log.'))
      .catch(() => setError('Unable to load audit log.'));
  }, [event]);

  if (error) return <PageState error message={error} />;
  if (!data)  return <PageState message="Loading audit log…" />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="animate-fade-in">
      {/* Header */}
      <div>
        <p className="eyebrow" style={{ marginBottom: 6 }}>Compliance</p>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', margin: 0, letterSpacing: '-.025em' }}>
          Audit Log
        </h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
          A complete, tamper-evident record of every authorization event
        </p>
      </div>

      {/* Search filter */}
      <div className="surface" style={{ padding: '12px 16px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-2)', pointerEvents: 'none' }}>
            <SearchIcon />
          </span>
          <input
            value={event}
            onChange={e => setEvent(e.target.value)}
            placeholder="Filter by event type, e.g. DECISION_MADE…"
            className="input-base"
            style={{ paddingLeft: 32, height: 34, fontSize: 12 }}
          />
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
          {data.items.length} event{data.items.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Event list */}
      {data.items.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.items.map((i: any) => {
            const ec = eventColor(i.event);
            const isOpen = open === i.id;
            return (
              <div key={i.id} className="surface" style={{ overflow: 'hidden' }}>
                <button
                  onClick={() => setOpen(isOpen ? null : i.id)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{
                    background: ec.bg, color: ec.color, border: `1px solid ${ec.border}`,
                    borderRadius: 99, padding: '3px 10px',
                    fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em',
                    flexShrink: 0, whiteSpace: 'nowrap',
                  }}>{i.event}</span>
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {i.actor}
                  </span>
                  <span style={{ fontSize: 11.5, color: 'var(--muted-2)', flexShrink: 0, marginRight: 8 }}>
                    {new Date(i.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' } as Intl.DateTimeFormatOptions)}
                  </span>
                  <span style={{ color: 'var(--muted-2)', transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>
                    <ChevronDown />
                  </span>
                </button>
                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--line)', padding: '14px 18px', background: 'var(--canvas)' }}>
                    <pre className="mono" style={{
                      margin: 0, padding: '12px 14px',
                      background: '#0f172a', color: '#e2e8f0',
                      borderRadius: 8, overflowX: 'auto',
                      fontSize: 11.5, lineHeight: 1.65,
                    }}>{JSON.stringify(i.details ?? {}, null, 2)}</pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <PageState message="No audit events match this filter." />
      )}
    </div>
  );
}
