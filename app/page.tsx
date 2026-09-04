import type { Metadata } from 'next';
import LandingPage from './components/landing/landing-page';

export const metadata: Metadata = {
  title: 'SpendGuard — AI Policy & Authorization Layer for Agentic Payments',
  description:
    'SpendGuard sits between autonomous AI agents and payment execution — enforcing the policies that decide what AI is allowed to buy. ALLOW · HOLD · BLOCK.',
  openGraph: {
    title: 'SpendGuard — AI Policy & Authorization Layer',
    description: 'Give AI the power to spend. Keep humans in control.',
    type: 'website',
  },
};

export default function HomePage() {
  return <LandingPage />;
}
