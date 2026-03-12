import type { ReactNode } from 'react';
import { Footer, Layout, Navbar } from 'nextra-theme-docs';
import { getPageMap } from 'nextra/page-map';
import { Head } from 'nextra/components';
import 'nextra-theme-docs/style.css';
import './globals.css';
import { ThemeToggle } from './theme-toggle';

export const metadata = {
  title: {
    default: 'Pluma Docs',
    template: '%s | Pluma Docs',
  },
  description: 'Pluma feature flag system documentation.',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const pageMap = await getPageMap();
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head
        color={{
          hue: { light: 165, dark: 133 },
          saturation: { light: 19, dark: 18 },
          lightness: { light: 40, dark: 59 },
        }}
        backgroundColor={{
          light: 'rgb(250,250,250)',
          dark: '#2f3e46',
        }}
      />
      <body>
        {/* darkMode=false hides nextra's built-in sidebar ThemeSwitch in favour of the custom ThemeToggle in Navbar */}
        <Layout
          navbar={
            <Navbar logo={<span>Pluma</span>} projectLink="https://github.com/403-html/pluma">
              <ThemeToggle />
            </Navbar>
          }
          pageMap={pageMap}
          darkMode={false}
          docsRepositoryBase="https://github.com/403-html/pluma/tree/main/apps/docs/content"
          footer={<Footer />}
        >
          {children}
        </Layout>
      </body>
    </html>
  );
}
