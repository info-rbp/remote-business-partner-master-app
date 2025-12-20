import { ReactNode } from 'react';

export default function ShareShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      {children}
    </div>
  );
}
