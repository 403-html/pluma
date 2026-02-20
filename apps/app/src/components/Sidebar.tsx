'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { auth } from '@/lib/api';
import styles from './Sidebar.module.css';

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
    <aside className={styles.sidebar}>
      <div className={styles.logo} aria-label="Pluma" />
      <nav className={styles.nav}>
        {navItems.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`${styles.navLink} ${
              pathname === href ? styles.active : ''
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <button
        type="button"
        className={styles.logoutButton}
        onClick={handleLogout}
      >
        Logout
      </button>
    </aside>
  );
}
