import { ReactNode } from 'react';
import ShareShell from '@/components/shell/ShareShell';

export default function ShareLayout({ children }: { children: ReactNode }) {
  return <ShareShell>{children}</ShareShell>;
}
