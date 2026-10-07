// Crawler: discovers pages via sitemap.xml + link-following, fetches HTML, parses with cheerio.
import * as cheerio from 'cheerio';
import { fetchWithTimeout, normalizeUrl, sameSite, pool, log } from './util.js';

const SKIP_EXTENSIONS = /\.(pdf|jpg|jpeg|png|gif|webp|svg|ico|css|js|mp4|mp3|zip|gz|xml|json|woff2?|ttf|eot|avif|webm|doc|docx|xls|xlsx)(\?|$)/i;

async function discoverFromSitemap(origin) {
  const urls = new Set();
  const tryFetch = async (sitemapUrl, depth = 0) => {
    if (depth > 2 || urls.size > 500) return;
    try {
      const res = await fetchWithTimeout(sitemapUrl, { timeout: 15000 });
      if (!res.ok) return;
      const xml = await res.text();
      // Nested sitemap indexes
      const sitemapRefs = [...xml.matchAll(/<sitemap>[\s\S]*?<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
      for (const ref of sitemapRefs.slice(0, 5)) await tryFetch(ref, depth + 1);
      const locs = [...xml.matchAll(/<url>[\s\S]*?<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
      for (const loc of locs) urls.add(loc);
    } catch {
      /* sitemap unavailable */
    }
  };
  await tryFetch(new URL('/sitemap.xml', origin).toString());
  return [...urls];
}

function extractPageData(url, html, res) {
  const $ = cheerio.load(html);
  // Resolve relative links against the FINAL url (after redirects), not the requested one.
  const abs = (href) => normalizeUrl(href, res.url || url);

  const links = [];
  $('a[href]').each((_, el) => {
    const href = ($(el).attr('href') || '').trim();
    if (!href || href.startsWith('#') || /^(mailto:|tel:|javascript:|sms:)/i.test(href)) return;
    const target = abs(href);
    if (!target || !/^https?:/.test(target)) return;
    links.push({ href: target, text: $(el).text().trim().slice(0, 100) });
  });

  const images = [];
  $('img').each((_, el) => {
    images.push({
      src: abs($(el).attr('src') || $(el).attr('data-src') || ''),
      alt: $(el).attr('alt'),
      width: $(el).attr('width'),
      height: $(el).attr('height'),
      loading: $(el).attr('loading'),
    });
  });

  const headings = [];
  $('h1,h2,h3,h4').each((_, el) => {
    headings.push({ tag: el.tagName.toLowerCase(), text: $(el).text().trim().replace(/\s+/g, ' ').slice(0, 200) });
  });

  const jsonLd = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const parsed = JSON.parse($(el).contents().text());
      const items = Array.isArray(parsed) ? parsed : parsed['@graph'] || [parsed];
      for (const item of items) if (item && item['@type']) jsonLd.push(item['@type']);
    } catch {
      jsonLd.push('INVALID_JSON_LD');
    }
  });

  $('script,style,noscript,svg').remove();
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();

  return {
    url,
    finalUrl: res.url,
    status: res.status,
    contentType: res.headers.get('content-type') || '',
    title: $('title').first().text().trim(),
    metaDescription: $('meta[name="description"]').attr('content') || '',
    metaRobots: $('meta[name="robots"]').attr('content') || '',
    canonical: abs($('link[rel="canonical"]').attr('href') || '') || '',
    viewport: $('meta[name="viewport"]').attr('content') || '',
    lang: $('html').attr('lang') || '',
    ogTags: Object.fromEntries(
      $('meta[property^="og:"]')
        .map((_, el) => [[$(el).attr('property'), $(el).attr('content')]])
        .get()
    ),
    twitterCard: $('meta[name="twitter:card"]').attr('content') || '',
    favicon: !!$('link[rel~="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]').length,
    headings,
    h1Count: headings.filter((h) => h.tag === 'h1').length,
    links,
    images,
    jsonLdTypes: jsonLd,
    bodyText: bodyText.slice(0, 20000),
    wordCount: bodyText ? bodyText.split(/\s+/).length : 0,
    htmlBytes: html.length,
    securityHeaders: {
      'strict-transport-security': res.headers.get('strict-transport-security'),
      'content-security-policy': !!res.headers.get('content-security-policy'),
      'x-content-type-options': res.headers.get('x-content-type-options'),
      'x-frame-options': res.headers.get('x-frame-options'),
      'referrer-policy': res.headers.get('referrer-policy'),
    },
  };
}

export async function crawlSite(startUrl, { maxPages = 30 } = {}) {
  const origin = new URL(startUrl).origin;
  const queue = [normalizeUrl(startUrl)];
  const seen = new Set(queue);
  const pages = [];
  const errors = [];

  // Seed queue from sitemap (prioritized after the start URL).
  const sitemapUrls = await discoverFromSitemap(origin);
  log(`Sitemap discovery: ${sitemapUrls.length} URLs found`);
  for (const u of sitemapUrls) {
    const n = normalizeUrl(u);
    if (n && sameSite(n, origin) && !seen.has(n) && !SKIP_EXTENSIONS.test(n)) {
      seen.add(n);
      queue.push(n);
    }
  }

  while (queue.length && pages.length < maxPages) {
    const batch = queue.splice(0, 5);
    const results = await pool(batch, 5, async (url) => {
      try {
        const res = await fetchWithTimeout(url, { timeout: 25000, headers: { accept: 'text/html,*/*' } });
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('text/html')) return { url, status: res.status, skipped: 'non-html' };
        // Redirect endpoints (e.g. /social/facebook) land off-site: not part of this site's audit.
        if (!sameSite(res.url, origin)) return { url, status: res.status, skipped: 'redirects-offsite' };
        const html = await res.text();
        return extractPageData(url, html, res);
      } catch (err) {
        return { url, fetchError: String(err && err.message ? err.message : err) };
      }
    });

    for (const page of results) {
      if (!page) continue;
      if (page.fetchError || page.skipped) {
        if (page.fetchError) errors.push(page);
        continue;
      }
      if (pages.length >= maxPages) break;
      pages.push(page);
      log(`Crawled (${pages.length}/${maxPages}): ${page.url} [${page.status}]`);
      // Follow same-site links found on this page.
      for (const link of page.links || []) {
        const n = normalizeUrl(link.href);
        if (n && sameSite(n, origin) && !seen.has(n) && !SKIP_EXTENSIONS.test(n)) {
          seen.add(n);
          queue.push(n);
        }
      }
    }
  }

  return { origin, pages, errors, discoveredCount: seen.size };
}
