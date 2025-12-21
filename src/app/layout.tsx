
import type { Metadata } from 'next';
import './globals.css';
import Header from './components/header';
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
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-900 text-white font-sans">
        <AuthProvider>
          <ToastProvider>
            <AppCheckInit />
            <Header />
            <main className="container mx-auto p-4">{children}</main>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
