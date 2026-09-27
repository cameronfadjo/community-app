/**
 * Builds the website into dist/.
 *
 *   node src/build.mjs           builds, marking unfinished pages as drafts
 *   node src/build.mjs --final   fails if any page still has a blank
 */

import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import { prepareDocument } from './legal.mjs';
import { renderPage } from './template.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const legal = join(root, '..', '..', 'docs', 'legal');
const dist = join(root, 'dist');
const mustBeFinal = process.argv.includes('--final');

const PAGES = [
  {
    path: '/',
    source: join(root, 'content', 'home.md'),
    description: 'A free app for LGBTQ+ adults who want somewhere to go.',
  },
  {
    path: '/terms',
    source: join(legal, 'terms-of-use.md'),
    description: 'The terms for using the app.',
  },
  {
    path: '/privacy',
    source: join(legal, 'privacy-policy.md'),
    description: 'What the app collects, why, and the choices you have.',
  },
  {
    path: '/support',
    source: join(root, 'content', 'support.md'),
    description: 'Help with the app, and how to reach us.',
  },
  {
    path: '/delete-account',
    source: join(root, 'content', 'delete-account.md'),
    description: 'How to delete your account, in the app or without it.',
  },
];

const config = JSON.parse(readFileSync(join(root, 'site.config.json'), 'utf8'));
const siteUrl = (config.siteUrl ?? '').trim().replace(/\/$/, '');
const values = {
  ...config,
  termsUrl: siteUrl && `${siteUrl}/terms`,
  privacyUrl: siteUrl && `${siteUrl}/privacy`,
  supportUrl: siteUrl && `${siteUrl}/support`,
  accountDeletionUrl: siteUrl && `${siteUrl}/delete-account`,
};
const appName = (config.appName ?? '').trim() || 'Community';

// Tables scroll sideways on a phone instead of stretching the page
const toHtml = (markdown) =>
  marked
    .parse(markdown, { breaks: true })
    .replace(/<table>/g, '<div class="table"><table>')
    .replace(/<\/table>/g, '</table></div>');

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(join(root, 'src', 'styles.css'), join(dist, 'styles.css'));

const unfinished = [];

for (const page of PAGES) {
  const { markdown, blanks, isDraft } = prepareDocument(readFileSync(page.source, 'utf8'), values);
  const heading = /^# (.+)$/m.exec(markdown)?.[1] ?? appName;
  const title = page.path === '/' ? appName : `${heading} · ${appName}`;

  const html = renderPage({
    title,
    description: page.description,
    path: page.path,
    body: toHtml(markdown),
    appName,
    isDraft,
  });

  const folder = join(dist, page.path);
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, 'index.html'), html);

  console.log(`${isDraft ? 'draft' : 'final'}  ${page.path}`);
  if (isDraft) {
    unfinished.push({ path: page.path, blanks });
  }
}

if (unfinished.length > 0) {
  console.log('\nStill to fill in:');
  for (const { path, blanks } of unfinished) {
    console.log(`\n  ${path}`);
    for (const blank of blanks) {
      const short = blank.length > 90 ? `${blank.slice(0, 87)}...]` : blank;
      console.log(`    ${short}`);
    }
  }
  console.log('\nShort blanks are filled from site.config.json. The rest are edited in docs/legal.');

  if (mustBeFinal) {
    console.error('\nNot built for publishing: the pages above are still drafts.');
    rmSync(dist, { recursive: true, force: true });
    process.exit(1);
  }
}
