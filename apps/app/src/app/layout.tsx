import './globals.css';

/**
 * FOUC prevention: The inline script below runs synchronously before first paint,
 * setting data-theme="dark" on <html> when the user's preference is dark (either
 * stored explicitly or inferred from the OS). Without this, users on dark-mode systems
 * would see a flash of light mode until React hydrates and ThemeContext runs.
 * dangerouslySetInnerHTML is intentional here — next/script "beforeInteractive" cannot
 * be used in a nested layout (it needs the true root layout), and an external public/
 * file requires a network round-trip. An inline script is the only zero-latency option.
 */
const themeInitScript = `(function(){try{var s=localStorage.getItem('theme');var d=document.documentElement;if(s==='dark'||((!s||s==='system')&&window.matchMedia('(prefers-color-scheme:dark)').matches)){d.setAttribute('data-theme','dark');}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      {/* eslint-disable-next-line react/no-danger -- See themeInitScript comment above for why dangerouslySetInnerHTML is used here */}
      <head><script dangerouslySetInnerHTML={{ __html: themeInitScript }} /></head>
      <body>{children}</body>
    </html>
  );
}
