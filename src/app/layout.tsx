
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from './components/header';

const inter = Inter({ subsets: ['latin'] });

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
      <body className={`${inter.className} bg-gray-900 text-white`}>
        <Header />
        <main className="container mx-auto p-4">{children}</main>
      </body>
    </html>
  );
}
