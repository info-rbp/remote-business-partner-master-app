'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { FolderKanban, LogOut } from 'lucide-react';

export default function PortalShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const navLinks = [
    { href: '/projects', label: 'Projects', icon: <FolderKanban /> },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/';
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Portal Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link href="/projects" className="text-xl font-bold text-white">
                Client Portal
              </Link>
              <nav className="flex items-center space-x-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition ${
                      pathname?.startsWith(link.href)
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {link.icon}
                    <span>{link.label}</span>
                  </Link>
                ))}
              </nav>
            </div>
            {user && (
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-300">
                  <div className="font-medium">{user.displayName || 'User'}</div>
                  <div className="text-xs text-gray-500">{user.email}</div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-2 px-3 py-2 text-gray-300 hover:bg-gray-700 rounded-lg transition"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-8">{children}</main>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 mt-12">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-sm text-gray-500">
            © {new Date().getFullYear()} DealFlow AI. Client Portal.
          </p>
        </div>
      </footer>
    </div>
  );
}
