export function PageState({ message, error }: { message: string; error?: boolean }) {
  return (
    <div
      style={{
        borderRadius: 14,
        border: `1px solid ${error ? '#fecaca' : '#e2e8f0'}`,
        background: error ? '#fff1f2' : '#f8fafc',
        padding: '40px 24px',
        textAlign: 'center',
        color: error ? '#b91c1c' : '#64748b',
        fontSize: 13,
        fontWeight: 500,
      }}
    >
      {error && <div style={{ fontSize: 22, marginBottom: 10 }}>⚠️</div>}
      {!error && (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '2.5px solid #2563eb',
            borderTopColor: 'transparent',
            margin: '0 auto 14px',
            animation: 'spin 0.7s linear infinite',
          }}
        />
      )}
      {message}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
