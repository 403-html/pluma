import nextra from 'nextra'

const withNextra = nextra({ search: false })

export default withNextra({
  output: 'export',
  images: { unoptimized: true },
  basePath: '/pluma',
})
