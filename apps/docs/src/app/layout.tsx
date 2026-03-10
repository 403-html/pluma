import type { ReactNode } from 'react'
import { Layout, Navbar, Footer } from 'nextra-theme-docs'
import { getPageMap } from 'nextra/page-map'
import 'nextra-theme-docs/style.css'

export default async function RootLayout({ children }: { children: ReactNode }) {
  const pageMap = await getPageMap()
  return (
    <html lang="en">
      <body>
        <Layout
          navbar={
            <Navbar
              logo={<span aria-label="Pluma documentation">Pluma</span>}
              projectLink="https://github.com/403-html/pluma"
            />
          }
          footer={<Footer>Pluma Documentation</Footer>}
          docsRepositoryBase="https://github.com/403-html/pluma"
          pageMap={pageMap}
        >
          {children}
        </Layout>
      </body>
    </html>
  )
}
