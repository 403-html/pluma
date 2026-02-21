'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/i18n/LocaleContext';
import { logout } from '@/lib/api/auth';

export default function Sidebar() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    const result = await logout(locale);
    if (result.ok) {
      router.push(`/${locale}/login`);
    } else {
      // Re-enable button on failure - user can retry
      setIsLoggingOut(false);
    }
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-content">
        {/* Logo/branding section - can be expanded in the future */}
        <div className="sidebar-header">
          <h2 className="sidebar-logo">Pluma</h2>
        </div>

        {/* Main navigation - can be expanded with more menu items */}
        <nav className="sidebar-nav">
          {/* Future navigation items go here */}
        </nav>
      </div>

      {/* Bottom actions */}
      <div className="sidebar-footer">
        <button
          type="button"
          className="sidebar-btn"
          onClick={() => router.push(`/${locale}/settings`)}
          disabled={isLoggingOut}
        >
          <span className="sidebar-btn-icon" aria-hidden="true">
            ⚙
          </span>
          <span className="sidebar-btn-text">{t.sidebar.settings}</span>
        </button>
        <button
          type="button"
          className="sidebar-btn sidebar-btn--logout"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          <span className="sidebar-btn-icon" aria-hidden="true">
            →
          </span>
          <span className="sidebar-btn-text">{t.sidebar.logout}</span>
        </button>
      </div>
    </aside>
  );
}
