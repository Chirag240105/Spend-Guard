import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/src/components/app-shell';

export const metadata: Metadata = {
  title: 'SpendGuard – Authorization Control Center',
  description: 'Policy-driven AI spending controls for autonomous agents',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
