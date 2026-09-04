import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from '@/src/components/app-shell';

export const metadata: Metadata = {
  title: "Spend Guard",
  description: "Policy-driven spending controls",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col"><AppShell>{children}</AppShell></body>
    </html>
  );
}
