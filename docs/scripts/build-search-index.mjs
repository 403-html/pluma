#!/usr/bin/env node
import fg from 'fast-glob';
import fs from 'fs/promises';
import matter from 'gray-matter';
import {marked} from 'marked';

const pages = await fg(['src/pages/**/*.{md,mdx,astro,html}'], {cwd: process.cwd(), dot: true});
const out = [];
for(const p of pages){
  const raw = await fs.readFile(p, 'utf8');
  let data = {};
  let content = raw;
  if(p.endsWith('.astro')){
    // try to extract frontmatter
    const m = raw.match(/^---([\s\S]*?)---/);
    if(m){
      const fm = matter(m[0]);
      data = fm.data || {};
      content = raw.replace(m[0], '');
    }
  } else {
    const fm = matter(raw);
    data = fm.data || {};
    content = fm.content || raw;
  }
  const text = marked.parse(content).replace(/<[^>]+>/g, ' ');
  const title = data.title || (text.split('\n').find(Boolean) || p);
  const url = '/' + p.replace(/^src\/pages\//,'').replace(/\.(md|mdx|astro|html)$/,'').replace(/index$/,'');
  out.push({ id: out.length+1, title: String(title).trim(), url, content: text.replace(/\s+/g,' ').trim() });
}
await fs.mkdir('public', {recursive:true});
await fs.writeFile('public/search-index.json', JSON.stringify(out, null, 2));
console.log('Wrote public/search-index.json with', out.length, 'entries');
