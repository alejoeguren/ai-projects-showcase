#!/usr/bin/env node
// Website audit data collector.
// Usage: node src/audit.js https://example.com [--competitors https://a.com,https://b.com] [--max-pages 30] [--key-pages 5]
// Writes all collected evidence to output/<host>/<YYYY-MM-DD>/data/ + screenshots/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { crawlSite } from './lib/crawl.js';
import { analyzePage, analyzeSiteWide } from './lib/seo.js';
import { checkLinks } from './lib/links.js';
import { checkSite } from './lib/site.js';
import { launchBrowser, browserAudit } from './lib/browser.js';
import { lighthouseAudit, runLighthouse } from './lib/lighthouse.js';
import { hostSlug, normalizeUrl, sameSite, log } from './lib/util.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = { competitors: [], maxPages: 30, keyPages: 5 };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--competitors') args.competitors = (argv[++i] || '').split(',').map((s) => s.trim()).filter(Boolean);
    else if (argv[i] === '--max-pages') args.maxPages = Number(argv[++i]) || 30;
    else if (argv[i] === '--key-pages') args.keyPages = Number(argv[++i]) || 5;
    else rest.push(argv[i]);
  }
  args.url = rest[0];
  return args;
}

function ensureHttps(raw) {
  if (!/^https?:\/\//i.test(raw)) return `https://${raw}`;
  return raw;
}

// Key pages = homepage + most-linked internal pages (nav links appear on every page).
function pickKeyPages(crawl, homepage, count) {
  const freq = new Map();
  for (const page of crawl.pages) {
    const seenOnPage = new Set();
    for (const link of page.links || []) {
      const n = normalizeUrl(link.href);
      if (!n || !sameSite(n, crawl.origin) || seenOnPage.has(n)) continue;
      seenOnPage.add(n);
      freq.set(n, (freq.get(n) || 0) + 1);
    }
  }
  const crawledUrls = new Set(crawl.pages.map((p) => p.url));
  const ranked = [...freq.entries()]
    .filter(([u]) => crawledUrls.has(u) && u !== homepage)
    .sort((a, b) => b[1] - a[1])
    .map(([u]) => u);
  return [homepage, ...ranked].slice(0, count);
}

async function auditCompetitor(browser, url, screenshotDir) {
  log(`--- Competitor: ${url}`);
  const result = { url };
  try {
    const res = await fetch(url, { redirect: 'follow' });
    const html = await res.text();
    const { load } = await import('cheerio');
    const $ = load(html);
    $('script,style,noscript,svg').remove();
    result.title = $('title').first().text().trim();
    result.metaDescription = $('meta[name="description"]').attr('content') || '';
    result.h1 = $('h1').first().text().trim();
    result.bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 8000);
    result.jsonLdCount = $('script[type="application/ld+json"]').length;
  } catch (err) {
    result.fetchError = String(err && err.message ? err.message : err);
  }
  try {
    result.lighthouseMobile = await runLighthouse(browser, url, 'mobile');
  } catch (err) {
    result.lighthouseMobile = { error: String(err && err.message ? err.message : err).slice(0, 200) };
  }
  try {
    const shots = await browserAudit(browser, [url], screenshotDir);
    result.browser = shots[0];
  } catch (err) {
    result.browserError = String(err && err.message ? err.message : err).slice(0, 200);
  }
  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.url) {
    console.error('Usage: node src/audit.js <url> [--competitors url1,url2] [--max-pages N] [--key-pages N]');
    process.exit(1);
  }
  const url = ensureHttps(args.url);
  const date = new Date().toISOString().slice(0, 10);
  const outDir = path.join(__dirname, '..', 'output', hostSlug(url), date);
  const dataDir = path.join(outDir, 'data');
  const screenshotDir = path.join(outDir, 'screenshots');
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(screenshotDir, { recursive: true });
  const save = (name, obj) => fs.writeFileSync(path.join(dataDir, name), JSON.stringify(obj, null, 2));

  log(`Audit starting: ${url}`);
  log(`Output: ${outDir}`);

  // 1. Site-level infrastructure checks + crawl (parallel).
  const [siteChecks, crawl] = await Promise.all([checkSite(url), crawlSite(url, { maxPages: args.maxPages })]);
  save('site.json', siteChecks);
  if (!crawl.pages.length) {
    console.error('FATAL: could not crawl any pages. Site may block bots or be unreachable.');
    save('crawl.json', crawl);
    process.exit(2);
  }

  // 2. Per-page + site-wide SEO analysis.
  const pageAnalyses = crawl.pages.map(analyzePage);
  const siteWide = analyzeSiteWide(crawl.pages);
  save('seo.json', { pages: pageAnalyses, siteWide });

  // Slim page content for qualitative (messaging) review.
  save(
    'content.json',
    crawl.pages.map((p) => ({
      url: p.url,
      title: p.title,
      metaDescription: p.metaDescription,
      headings: p.headings,
      bodyText: (p.bodyText || '').slice(0, 6000),
      wordCount: p.wordCount,
    }))
  );
  save('crawl-summary.json', {
    origin: crawl.origin,
    pagesCrawled: crawl.pages.length,
    discoveredCount: crawl.discoveredCount,
    errors: crawl.errors,
    pages: crawl.pages.map((p) => ({ url: p.url, status: p.status, title: p.title, wordCount: p.wordCount })),
  });

  // 3. Broken links.
  const links = await checkLinks(crawl);
  save('links.json', links);
  log(`Links: ${links.ok} ok, ${links.broken.length} broken of ${links.totalChecked}`);

  // 4. Key pages -> real-browser rendering + Lighthouse.
  const homepage = crawl.pages[0].url;
  const keyPages = pickKeyPages(crawl, homepage, args.keyPages);
  save('key-pages.json', keyPages);
  log(`Key pages: ${keyPages.join(', ')}`);

  const browser = await launchBrowser();
  try {
    const rendering = await browserAudit(browser, keyPages, screenshotDir);
    save('rendering.json', rendering);

    // Lighthouse on homepage (mobile+desktop) + up to 2 more key pages (mobile only, for speed).
    const lhFull = await lighthouseAudit(browser, [homepage]);
    const lhExtra = [];
    for (const kp of keyPages.slice(1, 3)) {
      try {
        lhExtra.push({ url: kp, mobile: await runLighthouse(browser, kp, 'mobile') });
      } catch (err) {
        lhExtra.push({ url: kp, mobile: { error: String(err && err.message ? err.message : err).slice(0, 200) } });
      }
    }
    save('lighthouse.json', [...lhFull, ...lhExtra]);

    // 5. Competitors (homepage-only light audit).
    if (args.competitors.length) {
      const comps = [];
      for (const comp of args.competitors.slice(0, 3)) comps.push(await auditCompetitor(browser, ensureHttps(comp), screenshotDir));
      save('competitors.json', comps);
    }
  } finally {
    await browser.close();
  }

  save('meta.json', {
    url,
    homepage,
    date,
    competitors: args.competitors,
    generatedAt: new Date().toISOString(),
    outDir,
  });
  log('DONE. All data collected.');
  console.log(`\nOUTPUT_DIR=${outDir}`);
}

main().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
