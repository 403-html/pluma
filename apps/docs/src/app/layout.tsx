import type { ReactNode } from 'react'
import { Layout, Navbar, Footer } from 'nextra-theme-docs'
import { getPageMap } from 'nextra/page-map'
import { Head } from 'nextra/components'
import 'nextra-theme-docs/style.css'

export default async function RootLayout({ children }: { children: ReactNode }) {
  const pageMap = await getPageMap()
  return (
    <html lang="en" suppressHydrationWarning>
      <Head
        color={{
          // Pluma palette: deep-teal (light) / muted-teal (dark) — mirrors apps/app/src/app/globals.css
          hue: { light: 165, dark: 133 },
          saturation: { light: 19, dark: 18 },
          lightness: { light: 40, dark: 59 },
        }}
        backgroundColor={{
          light: 'rgb(255,255,255)',
          dark: 'rgb(47,62,70)',
        }}
      />
      <body>
        <Layout
          navbar={
            <Navbar
              logo={<span aria-label="Pluma documentation">Pluma</span>}
              projectLink="https://github.com/403-html/pluma"
            />
          }
          footer={
            <Footer>
              {`Pluma Documentation${process.env.NEXT_PUBLIC_SDK_VERSION ? ` — SDK v${process.env.NEXT_PUBLIC_SDK_VERSION}` : ''}`}
            </Footer>
          }
          docsRepositoryBase="https://github.com/403-html/pluma/blob/main/apps/docs"
          pageMap={pageMap}
        >
          {children}
        </Layout>
      </body>
    </html>
  )
}
