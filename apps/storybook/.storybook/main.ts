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
    return {
      ...config,
      // tailwindcss() (Vite plugin) handles CSS with proper HMR integration.
      // removeUseClientPlugin strips Next.js "use client" directives from app source.
      // They target different file types and do not interfere with each other.
      plugins: [...(config.plugins ?? []), tailwindcss(), removeUseClientPlugin],
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
