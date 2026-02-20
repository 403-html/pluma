'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { auth } from '@/lib/api';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { href: '/projects', label: 'Projects' },
    { href: '/environments', label: 'Environments' },
    { href: '/flags', label: 'Flags' },
    { href: '/audit', label: 'Audit Log' },
    { href: '/settings', label: 'Settings' },
  ];

  const handleLogout = async () => {
    try {
      await auth.logout();
    } finally {
      router.push('/login');
    }
  };

  return (
    <aside className="w-[220px] h-screen bg-card flex flex-col py-8 fixed left-0 top-0">
      <div className="w-10 h-10 bg-accent mx-auto mb-12" aria-label="Pluma" />
      <nav className="flex flex-col gap-1">
        {navItems.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`px-6 py-3 text-ui font-medium border-l-[3px] transition-all ${
              pathname === href
                ? 'text-accent border-l-accent bg-accent/8'
                : 'text-ink-muted border-l-transparent hover:text-ink hover:bg-white/5'
            } focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <button
        type="button"
        className="mt-auto mb-2 px-6 py-3 bg-transparent border-none border-t border-stroke text-ink-muted text-ui font-medium cursor-pointer text-left w-full transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]"
        onClick={handleLogout}
      >
        Logout
      </button>
    </aside>
  );
}
