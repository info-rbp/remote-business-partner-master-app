import { ReactNode } from 'react';
import AppShell from '@/components/shell/AppShell';
import { IdentityGate } from '@/app/components/IdentityGate';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <IdentityGate>
      <AppShell>{children}</AppShell>
    </IdentityGate>
  );
}
