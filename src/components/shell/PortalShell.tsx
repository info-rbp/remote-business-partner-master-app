import { ReactNode } from 'react';

export default function PortalShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <main className="container mx-auto p-4">{children}</main>
    </div>
  );
}
