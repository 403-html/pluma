import nextra from 'nextra';

const withNextra = nextra({});

export default withNextra({
  distDir: 'dist',
  output: 'export',
  images: { unoptimized: true },
});
