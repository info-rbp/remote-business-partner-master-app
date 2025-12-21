
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { ToastProvider } from './components/toast';
import { AuthProvider } from '@/lib/auth-context';
import AppCheckInit from './components/app-check-init';

export const metadata: Metadata = {
  title: 'DealFlow AI',
  description: 'AI-powered business proposal generation',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-900 text-white font-sans">
        <AuthProvider>
          <ToastProvider>
            <AppCheckInit />
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
