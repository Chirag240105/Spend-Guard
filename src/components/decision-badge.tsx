export function DecisionBadge({ decision }: { decision: string }) {
  const styles: Record<string, string> = { ALLOW: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30', HOLD: 'bg-amber-400/15 text-amber-300 border-amber-400/30', BLOCK: 'bg-rose-400/15 text-rose-300 border-rose-400/30' };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold tracking-wide ${styles[decision] ?? 'border-slate-700 text-slate-300'}`}>{decision}</span>;
}
