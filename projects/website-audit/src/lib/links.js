// Broken link checker: validates every unique link found during the crawl.
import { fetchWithTimeout, pool, sameSite, log } from './util.js';

export async function checkLinks(crawl) {
  const { origin, pages } = crawl;
  // Map each unique target URL -> where it appears.
  const targets = new Map();
  for (const page of pages) {
    for (const link of page.links || []) {
      if (!targets.has(link.href)) targets.set(link.href, { foundOn: [], text: link.text });
      const entry = targets.get(link.href);
      if (entry.foundOn.length < 5 && !entry.foundOn.includes(page.url)) entry.foundOn.push(page.url);
    }
    for (const img of page.images || []) {
      if (img.src && !targets.has(img.src)) targets.set(img.src, { foundOn: [page.url], text: '(image)' });
    }
  }

  const urls = [...targets.keys()].slice(0, 400); // safety cap
  log(`Checking ${urls.length} unique links…`);

  const results = await pool(urls, 10, async (url) => {
    const check = async (method) => {
      const res = await fetchWithTimeout(url, { method, timeout: 15000 });
      return res.status;
    };
    try {
      let status = await check('HEAD');
      // Many servers reject HEAD; retry with GET before declaring failure.
      if (status >= 400) status = await check('GET');
      return { url, status };
    } catch (err) {
      try {
        return { url, status: await check('GET') };
      } catch (err2) {
        return { url, status: 0, error: String(err2 && err2.message ? err2.message : err2).slice(0, 120) };
      }
    }
  });

  // Bot-defense responses (rate limits, LinkedIn's 999, forbidden-to-bots) are not
  // proof a link is broken for humans — report them separately as "unverified".
  const BLOCKED_ANY = new Set([429, 999]);
  const BLOCKED_EXTERNAL = new Set([400, 401, 403]);
  const broken = [];
  const unverified = [];
  let ok = 0;
  for (const r of results) {
    if (!r) continue;
    const internal = sameSite(r.url, origin);
    const meta = targets.get(r.url) || { foundOn: [], text: '' };
    const entry = { ...r, internal, linkText: meta.text, foundOn: meta.foundOn };
    if (BLOCKED_ANY.has(r.status) || (!internal && BLOCKED_EXTERNAL.has(r.status))) unverified.push(entry);
    else if (r.status >= 400 || r.status === 0) broken.push(entry);
    else ok++;
  }
  broken.sort((a, b) => (b.internal === a.internal ? 0 : b.internal ? 1 : -1));
  return { totalChecked: urls.length, ok, broken, unverified };
}
