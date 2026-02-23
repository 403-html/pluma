'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/i18n/LocaleContext';
import { logout } from '@/lib/api/auth';

type SidebarButtonProps = {
  icon: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
};

function SidebarButton({ icon, label, onClick, disabled, danger = false }: SidebarButtonProps) {
  const base = "w-full flex items-center gap-3 px-4 py-3 bg-transparent border-0 text-white text-[0.95rem] font-[inherit] cursor-pointer rounded-md transition-colors hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed";
  return (
    <button
      type="button"
      className={danger ? `${base} text-[var(--pluma-punch-red)] hover:bg-[var(--pluma-punch-red)]/10` : base}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="text-xl leading-none" aria-hidden="true">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
    </button>
  );
}

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
    <aside className="sticky top-0 h-screen overflow-y-auto w-[var(--sidebar-width)] bg-[var(--pluma-oxford-navy)] text-white flex flex-col z-50">
      <div className="flex-1 overflow-y-auto">
        {/* Logo/branding section - can be expanded in the future */}
        <div className="px-4 py-6 border-b border-white/10">
          <h2 className="text-2xl font-bold">Pluma</h2>
        </div>

        {/* Main navigation - can be expanded with more menu items */}
        <nav className="py-2 px-2">
          <SidebarButton icon="⚑" label={t.sidebar.projects} onClick={() => router.push(`/${locale}/projects`)} />
          <SidebarButton icon="✎" label={t.sidebar.audit} onClick={() => router.push(`/${locale}/audit`)} />
        </nav>
      </div>

      {/* Bottom actions */}
      <div className="border-t border-white/10 py-4 px-2 flex flex-col gap-2">
        <SidebarButton icon="⚙" label={t.sidebar.settings} onClick={() => router.push(`/${locale}/settings`)} disabled={isLoggingOut} />
        <SidebarButton icon="→" label={t.sidebar.logout} onClick={handleLogout} disabled={isLoggingOut} danger />
      </div>
    </aside>
  );
}
