const config: Record<string, { bg: string; color: string; border: string; dot: string; label: string }> = {
  ALLOW: { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0', dot: '#22c55e', label: 'ALLOW' },
  HOLD:  { bg: '#fef9c3', color: '#92400e', border: '#fde68a', dot: '#f59e0b', label: 'HOLD'  },
  BLOCK: { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca', dot: '#ef4444', label: 'BLOCK' },
};

export function DecisionBadge({ decision }: { decision: string }) {
  const c = config[decision] ?? { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0', dot: '#94a3b8', label: decision };
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        background: c.bg, color: c.color,
        border: `1px solid ${c.border}`,
        borderRadius: 99, padding: '3px 9px',
        fontSize: 11, fontWeight: 700, letterSpacing: '.05em',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      {c.label}
    </span>
  );
}
