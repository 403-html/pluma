import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";
import { themes as prismThemes } from "prism-react-renderer";

const config: Config = {
  title: "Pluma Docs",
  tagline: "Documentation for Pluma",
  favicon: "img/favicon.ico",

  // Production URL — update when deploying
  url: "https://docs.pluma.dev",
  baseUrl: "/",

  onBrokenLinks: "warn",

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: "warn",
    },
  },

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          // Enables the enhanced API doc rendering component supplied by
          // docusaurus-theme-openapi-docs for generated API reference pages.
          docItemComponent: "@theme/ApiItem",
        },
        // Blog disabled — docs-only site
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    [
      // API reference generation plugin.
      // Run `pnpm --filter @pluma/api gen-openapi` to export the OpenAPI spec
      // to docs/openapi.json (no running server required), then run
      // `pnpm --filter @pluma/docs gen-api-docs` to emit markdown pages into
      // docs/api/.  The root `docs:gen-api-docs` script does both in one step.
      "docusaurus-plugin-openapi-docs",
      {
        id: "api",
        docsPluginId: "classic",
        config: {
          pluma: {
            specPath: "openapi.json",
            outputDir: "docs/api",
            sidebarOptions: {
              groupPathsBy: "tag",
              categoryLinkSource: "tag",
            },
          },
        },
      },
    ],
  ],

  themes: ["docusaurus-theme-openapi-docs"],

  themeConfig: {
    navbar: {
      title: "Pluma",
      items: [
        {
          type: "docSidebar",
          sidebarId: "tutorialSidebar",
          position: "left",
          label: "Docs",
        },
        {
          href: "https://github.com/pluma/pluma",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Docs",
          items: [
            { label: "Introduction", to: "/docs/intro" },
            { label: "Getting Started", to: "/docs/getting-started" },
            { label: "SDK", to: "/docs/sdk" },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Pluma. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
