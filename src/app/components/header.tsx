
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, Users, Settings, BriefcaseBusiness, FolderKanban, Shield } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { isStaff, isAdmin } from '@/lib/rbac';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard />, roles: ['admin', 'staff', 'client'] },
  { href: '/crm', label: 'CRM', icon: <BriefcaseBusiness />, roles: ['admin', 'staff'] },
  { href: '/proposals', label: 'Proposals', icon: <FileText />, roles: ['admin', 'staff', 'client'] },
  { href: '/projects', label: 'Projects', icon: <FolderKanban />, roles: ['admin', 'staff', 'client'] },
  { href: '/clients', label: 'Clients', icon: <Users />, roles: ['admin', 'staff'] },
  { href: '/admin/users', label: 'Admin', icon: <Shield />, roles: ['admin'] },
  { href: '/settings', label: 'Settings', icon: <Settings />, roles: ['admin', 'staff', 'client'] },
];

export default function Header() {
  const pathname = usePathname();
  const { user } = useAuth();

  // Filter nav links based on user role
  const visibleLinks = navLinks.filter(link => 
    !user || !link.roles || link.roles.includes(user.role)
  );

  return (
    <header className="bg-gray-800 text-white p-4">
      <nav className="container mx-auto flex justify-between">
        <Link href="/dashboard" className="text-2xl font-bold">
          DealFlow AI
        </Link>
        <ul className="flex items-center space-x-4">
          {visibleLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`flex items-center space-x-2 ${
                  pathname?.startsWith(link.href) ? 'text-blue-500' : 'hover:text-blue-500'
                }`}>
                {link.icon}
                <span>{link.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
