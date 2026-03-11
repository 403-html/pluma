'use client';
import { useTheme } from 'next-themes';
import { MoonIcon, SunIcon } from 'nextra/icons';
import { useMounted } from 'nextra/hooks';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  if (!mounted)
    return (
      <span
        style={{ display: 'inline-block', width: '1.5rem', height: '1.5rem' }}
        aria-hidden
      />
    );

  const isDark = resolvedTheme === 'dark';
  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        padding: '0.25rem',
        color: 'inherit',
        opacity: 0.7,
      }}
    >
      {isDark ? <MoonIcon height="16" /> : <SunIcon height="16" />}
    </button>
  );
}
