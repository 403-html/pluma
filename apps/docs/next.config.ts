import nextra from 'nextra';

const withNextra = nextra({});

export default withNextra({
  distDir: 'dist',
  output: 'export',
  // PAGES_BASE_PATH is set in CI (e.g. "/pluma"); empty string for local dev.
  basePath: process.env.PAGES_BASE_PATH || '',
  images: { unoptimized: true },
});
