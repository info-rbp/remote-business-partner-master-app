
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DealFlow AI',
  description: 'AI-powered business proposal generation',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-900 text-white font-sans">{children}</body>
    </html>
  );
}
