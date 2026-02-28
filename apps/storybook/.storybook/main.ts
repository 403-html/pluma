import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import type { StorybookConfig } from "@storybook/react-vite";
import type { Plugin } from 'vite';
import tailwindcss from '@tailwindcss/vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config: StorybookConfig = {
  stories: ["../../app/src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  async viteFinal(config) {
    // Vite in Storybook will bundle files from the Next app. Next's
    // top-level "use client" directive is meaningful for Next's RSC runtime
    // but causes bundling errors in Storybook/Vite. Strip it from app
    // source modules when building Storybook.
    const removeUseClientPlugin: Plugin = {
      name: 'remove-use-client-directive',
      enforce: 'pre',
      transform(code, id) {
        if (!id.includes('/app/src/') && !id.includes('\\app\\src\\')) return null;
        if (!/\.(ts|tsx|js|jsx)$/.test(id)) return null;
        const modified = code.replace(/^(['"])use client\1;\s*/m, '');
        if (modified === code) return null;
        return { code: modified, map: null };
      },
    };
    // Storybook 10 replaces `@storybook/test` imports with an internal virtual
    // module (`__STORYBOOK_MODULE_TEST__`) via its own Vite plugin.  However,
    // Vite's built-in `vite:import-analysis` plugin resolves bare specifiers
    // before third-party plugins run, so it errors when it can't find
    // `@storybook/test` in node_modules.  This pre-enforce plugin rewrites the
    // import to the concrete `storybook/test` subpath export (available in
    // Storybook 10) before Vite's analyser sees it, unblocking compilation.
    const resolveStorybookTestPlugin: Plugin = {
      name: 'resolve-storybook-test',
      enforce: 'pre',
      transform(code, id) {
        if (!code) return null;
        if (!/\.(ts|tsx|js|jsx)$/.test(id)) return null;
        if (!code.includes('@storybook/test')) return null;
        const modified = code.replace(
          /(['"`])@storybook\/test\1/g,
          '$1storybook/test$1'
        );
        if (modified === code) return null;
        return { code: modified, map: null };
      },
    };
    return {
      ...config,
      // tailwindcss() (Vite plugin) handles CSS with proper HMR integration.
      // removeUseClientPlugin strips Next.js "use client" directives from app source.
      // resolveStorybookTestPlugin maps @storybook/test → storybook/test before
      //   Vite's import-analysis runs (Storybook 10 merged the package).
      // They target different file types and do not interfere with each other.
      plugins: [...(config.plugins ?? []), tailwindcss(), removeUseClientPlugin, resolveStorybookTestPlugin],
      resolve: {
        ...config.resolve,
        alias: {
          ...config.resolve?.alias,
          "@": resolve(__dirname, "../../app/src"),
          "next/navigation": resolve(__dirname, "./mocks/next-navigation.ts"),
          "next/link": resolve(__dirname, "./mocks/next-link.tsx"),
        },
      },
    };
  },
};

export default config;
