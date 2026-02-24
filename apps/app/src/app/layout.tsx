import './globals.css';
import { cookies } from 'next/headers';

const THEME_COOKIE = 'pluma-theme';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get(THEME_COOKIE)?.value;
  const dataTheme = themeCookie === 'dark' ? 'dark' : themeCookie === 'light' ? 'light' : undefined;
  return (
    <html data-theme={dataTheme}>
      <body>{children}</body>
    </html>
  );
}
