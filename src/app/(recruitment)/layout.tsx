import { ReactNode } from 'react';
import RecruitmentShell from '@/components/shell/RecruitmentShell';

export default function RecruitmentLayout({ children }: { children: ReactNode }) {
  return <RecruitmentShell>{children}</RecruitmentShell>;
}
