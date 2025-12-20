import { ReactNode } from 'react';
import Header from '@/app/components/header';

export default function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      <main className="container mx-auto p-4">{children}</main>
    </div>
  );
}
