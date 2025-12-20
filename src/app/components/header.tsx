
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, Users, Settings, Package } from 'lucide-react';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard /> },
  { href: '/catalog', label: 'Catalogue', icon: <Package /> },
  { href: '/proposals', label: 'Proposals', icon: <FileText /> },
  { href: '/clients', label: 'Clients', icon: <Users /> },
  { href: '/settings', label: 'Settings', icon: <Settings /> },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-gray-800 text-white p-4">
      <nav className="container mx-auto flex justify-between">
        <Link href="/dashboard" className="text-2xl font-bold">
          DealFlow AI
        </Link>
        <ul className="flex items-center space-x-4">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`flex items-center space-x-2 ${
                  pathname === link.href ? 'text-blue-500' : 'hover:text-blue-500'
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
