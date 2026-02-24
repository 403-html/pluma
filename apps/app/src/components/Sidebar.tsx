'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Flag, ScrollText, Building2, Settings, LogOut } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleContext';
import { logout } from '@/lib/api/auth';

type SidebarButtonProps = {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  active?: boolean;
};

function SidebarButton({ icon, label, onClick, disabled, danger = false, active = false }: SidebarButtonProps) {
  const base = "w-full flex items-center gap-3 px-4 py-3 bg-transparent border-0 text-white text-[0.95rem] font-[inherit] cursor-pointer rounded-md transition-colors hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed";
  const activeClass = active ? 'bg-white/15' : '';
  return (
    <button
      type="button"
      className={danger ? `${base} ${activeClass} text-destructive hover:bg-destructive/10` : `${base} ${activeClass}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="shrink-0" aria-hidden="true">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
    </button>
  );
}

export default function Sidebar() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isActive = (segment: string): boolean => {
    if (!pathname) return false;
    const parts = pathname.split('/');
    return (parts[2] ?? '') === segment;
  };

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
    <aside className="sticky top-0 h-screen overflow-y-auto w-[var(--sidebar-width)] bg-[#2f3e46] text-white flex flex-col z-50 border-r border-white/20">
      <div className="flex-1 overflow-y-auto">
        {/* Logo/branding section - can be expanded in the future */}
        <div className="px-4 py-6 border-b border-white/10">
          <h2 className="text-2xl font-bold">Pluma</h2>
        </div>

        {/* Main navigation */}
        <nav className="py-2 px-2">
          <SidebarButton icon={<Flag size={20} />} label={t.sidebar.projects} onClick={() => router.push(`/${locale}/projects`)} active={isActive('projects')} />
          <SidebarButton icon={<ScrollText size={20} />} label={t.sidebar.audit} onClick={() => router.push(`/${locale}/audit`)} active={isActive('audit')} />
        </nav>
      </div>

      {/* Bottom actions */}
      <div className="border-t border-white/10 py-4 px-2 flex flex-col gap-2">
        <SidebarButton
          icon={<Building2 size={20} />}
          label={t.sidebar.organization}
          onClick={() => router.push(`/${locale}/organization`)}
          active={isActive('organization')}
        />
        <SidebarButton icon={<Settings size={20} />} label={t.sidebar.settings} onClick={() => router.push(`/${locale}/settings`)} disabled={isLoggingOut} active={isActive('settings')} />
        <SidebarButton icon={<LogOut size={20} />} label={t.sidebar.logout} onClick={handleLogout} disabled={isLoggingOut} danger />
      </div>
    </aside>
  );
}
