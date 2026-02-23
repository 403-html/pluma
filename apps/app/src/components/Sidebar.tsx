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
      console.error('[Sidebar] logout failed', result.message);
    }
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-[#1a1a1a] text-white flex flex-col z-50">
      <div className="flex-1 overflow-y-auto">
        {/* Logo/branding section - can be expanded in the future */}
        <div className="px-4 py-6 border-b border-white/10">
          <h2 className="text-2xl font-bold">Pluma</h2>
        </div>

        {/* Main navigation - can be expanded with more menu items */}
        <nav className="py-2 px-2">
          <button
            type="button"
            className="w-full flex items-center gap-3 px-4 py-3 bg-transparent border-0 text-white text-[0.95rem] font-[inherit] cursor-pointer rounded-md transition-colors hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => router.push(`/${locale}/projects`)}
          >
            <span className="text-xl leading-none" aria-hidden="true">
              ⚑
            </span>
            <span className="flex-1 text-left">{t.sidebar.projects}</span>
          </button>
          <button
            type="button"
            className="sidebar-btn sidebar-nav-btn"
            onClick={() => router.push(`/${locale}/audit`)}
          >
            <span className="sidebar-btn-icon" aria-hidden="true">
              ✎
            </span>
            <span className="sidebar-btn-text">{t.sidebar.audit}</span>
          </button>
        </nav>
      </div>

      {/* Bottom actions */}
      <div className="border-t border-white/10 py-4 px-2 flex flex-col gap-2">
        <button
          type="button"
          className="w-full flex items-center gap-3 px-4 py-3 bg-transparent border-0 text-white text-[0.95rem] font-[inherit] cursor-pointer rounded-md transition-colors hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => router.push(`/${locale}/settings`)}
          disabled={isLoggingOut}
        >
          <span className="text-xl leading-none" aria-hidden="true">
            ⚙
          </span>
          <span className="flex-1 text-left">{t.sidebar.settings}</span>
        </button>
        <button
          type="button"
          className="w-full flex items-center gap-3 px-4 py-3 bg-transparent border-0 text-white text-[0.95rem] font-[inherit] cursor-pointer rounded-md transition-colors hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-[#ff6b6b] hover:bg-[#ff6b6b]/10"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          <span className="text-xl leading-none" aria-hidden="true">
            →
          </span>
          <span className="flex-1 text-left">{t.sidebar.logout}</span>
        </button>
      </div>
    </aside>
  );
}
