Pluma docs (Astro)

Local development

Prerequisites:
- Node 18+ and pnpm

Commands (from repo root):

```bash
pnpm install
pnpm --filter ./docs dev     # run dev server
pnpm --filter ./docs build   # build static site and generate public/search-index.json
pnpm --filter ./docs preview # preview build
```

Rebuilding the search index

The build step runs docs/scripts/build-search-index.mjs which scans docs/src/pages and outputs public/search-index.json.
To rebuild manually:

```bash
cd docs
node ./scripts/build-search-index.mjs
```

Search

Search is client-side using FlexSearch and public/search-index.json. No external services are required. Algolia can be integrated later by providing keys and toggling the client.

Artifacts

Build log and screenshots are saved in docs/artifacts/ for QA.

Known limitations

- The search index is generated from markdown/astro page content at build time. Large sites will increase index size.
- Theme toggle is a simple attribute toggle for demo; persistent preference storage can be added.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
