'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

interface DashboardShellProps {
  children: React.ReactNode;
}

/**
 * Client shell for the dashboard layout.
 *
 * Responsibilities:
 * - Owns the mobile sidebar open/close state
 * - Renders a sticky top bar with a hamburger button (mobile only)
 * - Renders the sidebar overlay backdrop on mobile
 * - Switches between single-column (mobile) and 2-column grid (md+)
 */
export default function DashboardShell({ children }: DashboardShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col md:grid md:grid-cols-[var(--sidebar-width)_1fr]">
      {/* ── Mobile-only sticky top bar ───────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 flex items-center h-14 px-4 bg-card border-b border-border md:hidden"
        aria-label="Mobile navigation bar"
      >
        <button
          type="button"
          aria-label="Open navigation"
          aria-expanded={isSidebarOpen}
          aria-controls="app-sidebar"
          className="p-2 rounded-md text-foreground hover:bg-accent transition-colors"
          onClick={() => setIsSidebarOpen(true)}
        >
          <Menu size={20} aria-hidden="true" />
        </button>
      </header>

      {/* ── Sidebar overlay backdrop (mobile only) ───────────────────────────── */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[49] md:hidden"
          aria-hidden="true"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <Sidebar
        id="app-sidebar"
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
