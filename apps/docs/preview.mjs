/**
 * Local preview server for the static export.
 *
 * `next build` with `basePath: '/pluma'` writes asset paths like
 * `/pluma/_next/…` into every HTML file, which works perfectly on
 * GitHub Pages (where the site is served at /pluma/).  A plain static
 * server started from `out/` would 404 for every asset because it has
 * no idea about the prefix.  This server strips `/pluma` from incoming
 * requests so `out/` is resolved correctly.
 *
 * Usage: pnpm preview  →  open http://localhost:3000/pluma/
 */

import http from 'http'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out')

const rawPort = Number(process.env.PORT ?? 3000)
if (!Number.isInteger(rawPort) || rawPort < 1 || rawPort > 65535) {
  console.error(`Invalid PORT value: ${process.env.PORT}`)
  process.exit(1)
}
const port = rawPort

const MIME = /** @type {Record<string, string>} */ ({
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain',
})

const server = http.createServer(async (req, res) => {
  let urlPath = (req.url ?? '/').split('?')[0]
  urlPath = urlPath.replace(/^\/pluma/, '') || '/'

  // Guard against path traversal
  if (urlPath.includes('..')) {
    res.writeHead(400, { 'Content-Type': 'text/plain' })
    res.end('400 Bad Request')
    return
  }

  if (!path.extname(urlPath)) {
    // Next.js static export creates flat files (e.g. getting-started.html)
    // but also directory indexes (e.g. sdk/index.html).
    // Try the flat form first, then fall back to directory index.
    const bare = urlPath.endsWith('/') ? urlPath.slice(0, -1) : urlPath
    const asFile = bare + '.html'
    const asIndex = (bare || '/') + '/index.html'
    try {
      await fs.access(path.join(outDir, asFile))
      urlPath = asFile
    } catch {
      urlPath = asIndex
    }
  }

  const filePath = path.join(outDir, urlPath)
  try {
    const content = await fs.readFile(filePath)
    const ext = path.extname(filePath)
    res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' })
    res.end(content)
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('404 Not Found')
  }
})

server.listen(port, () => {
  console.log(`Docs preview → http://localhost:${port}/pluma/`)
})

