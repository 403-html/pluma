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
    <aside className="w-[220px] h-screen bg-card flex flex-col py-5 fixed left-0 top-0 border-r border-stroke">
      {/* TODO: replace with a proper <img> once a logo asset is available */}
      <div className="w-8 h-8 bg-accent mx-6 mb-8" role="img" aria-label="Pluma logo" />
      <nav className="flex flex-col gap-0.5">
        {navItems.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`px-6 py-2 text-sm font-medium border-l-2 transition-all ${
              pathname === href
                ? 'text-accent border-l-accent bg-accent/[0.08]'
                : 'text-ink-muted border-l-transparent hover:text-ink hover:bg-white/5'
            } focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <button
        type="button"
        className="mt-auto px-6 py-2.5 bg-transparent border-t border-stroke text-ink-muted text-sm font-medium cursor-pointer text-left w-full transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]"
        onClick={handleLogout}
      >
        Logout
      </button>
    </aside>
  );
}
