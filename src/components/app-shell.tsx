'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [['Overview', '/dashboard'], ['Policies', '/policies'], ['Transactions', '/transactions'], ['Approvals', '/approvals'], ['Audit log', '/audit']];
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return <div className="min-h-screen bg-slate-950 text-slate-50"><header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/90 backdrop-blur"><nav className="mx-auto flex max-w-7xl items-center gap-2 px-6 py-4"><Link href="/dashboard" className="mr-5 text-sm font-bold uppercase tracking-[.2em] text-cyan-400">Spend Guard</Link><div className="flex flex-wrap gap-1">{links.map(([label, href]) => <Link key={href} href={href} className={`rounded-lg px-3 py-2 text-sm font-medium transition ${path.startsWith(href) ? 'bg-slate-800 text-cyan-300' : 'text-slate-300 hover:bg-slate-900 hover:text-white'}`}>{label}</Link>)}</div></nav></header><main className="mx-auto w-full max-w-7xl px-6 py-10">{children}</main></div>;
}
