import type { FC, ReactNode } from 'react';
import { Footer, Layout, Navbar } from 'nextra-theme-docs';
import { getPageMap } from 'nextra/page-map';
import { Head } from 'nextra/components';
import 'nextra-theme-docs/style.css';

export const metadata = {
  title: {
    default: 'Pluma Docs',
    template: '%s | Pluma Docs',
  },
  description: 'Pluma feature flag system documentation.',
};

const RootLayout: FC<{ children: ReactNode }> = async ({ children }) => {
  const pageMap = await getPageMap();
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head />
      <body>
        <Layout
          navbar={<Navbar logo={<span>Pluma</span>} />}
          pageMap={pageMap}
          docsRepositoryBase="https://github.com/403-html/pluma/tree/main/apps/docs/content"
          footer={<Footer />}
        >
          {children}
        </Layout>
      </body>
    </html>
  );
};

export default RootLayout;
