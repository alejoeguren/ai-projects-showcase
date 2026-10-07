// Shared helpers for the audit pipeline.

const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 SiteAuditBot/1.0';

export async function fetchWithTimeout(url, { timeout = 20000, method = 'GET', headers = {}, redirect = 'follow' } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      method,
      redirect,
      signal: controller.signal,
      headers: { 'user-agent': DEFAULT_UA, accept: '*/*', ...headers },
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// Normalize a URL for dedupe: strip hash, trailing slash (except root), default ports.
export function normalizeUrl(raw, base) {
  try {
    const u = new URL(raw, base);
    u.hash = '';
    if (u.pathname !== '/' && u.pathname.endsWith('/')) u.pathname = u.pathname.slice(0, -1);
    return u.toString();
  } catch {
    return null;
  }
}

export function sameSite(url, origin) {
  try {
    const a = new URL(url);
    const b = new URL(origin);
    const strip = (h) => h.replace(/^www\./, '');
    return strip(a.hostname) === strip(b.hostname);
  } catch {
    return false;
  }
}

export function slugify(url) {
  try {
    const u = new URL(url);
    const path = u.pathname === '/' ? 'home' : u.pathname.replace(/^\/|\/$/g, '').replace(/[^a-z0-9]+/gi, '-');
    return path.slice(0, 60).toLowerCase() || 'home';
  } catch {
    return 'page';
  }
}

export function hostSlug(url) {
  return new URL(url).hostname.replace(/^www\./, '').replace(/[^a-z0-9.]+/gi, '-');
}

// Run async tasks with limited concurrency.
export async function pool(items, limit, worker) {
  const results = new Array(items.length);
  let i = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      try {
        results[idx] = await worker(items[idx], idx);
      } catch (err) {
        results[idx] = { error: String(err && err.message ? err.message : err) };
      }
    }
  });
  await Promise.all(runners);
  return results;
}

export function log(msg) {
  const t = new Date().toISOString().slice(11, 19);
  console.log(`[${t}] ${msg}`);
}
