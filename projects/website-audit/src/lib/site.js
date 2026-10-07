// Site-level infrastructure checks: robots.txt, sitemap, AI-crawler access,
// HTTPS behavior, 404 handling, security headers, llms.txt.
import { fetchWithTimeout } from './util.js';

const AI_CRAWLERS = ['GPTBot', 'ClaudeBot', 'Claude-Web', 'PerplexityBot', 'Google-Extended', 'anthropic-ai', 'CCBot', 'OAI-SearchBot'];

function parseRobots(text) {
  // Group rules per user-agent, then evaluate root-path access per AI crawler.
  const groups = [];
  let current = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    const m = line.match(/^(user-agent|disallow|allow|sitemap)\s*:\s*(.*)$/i);
    if (!m) continue;
    const [, key, valueRaw] = m;
    const value = valueRaw.trim();
    if (/^user-agent$/i.test(key)) {
      if (!current || current.rules.length) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if (/^(disallow|allow)$/i.test(key) && current) {
      current.rules.push({ type: key.toLowerCase(), path: value });
    }
  }
  return groups;
}

function crawlerBlocked(groups, agent) {
  const lower = agent.toLowerCase();
  let group = groups.find((g) => g.agents.some((a) => a === lower));
  if (!group) group = groups.find((g) => g.agents.includes('*'));
  if (!group) return false;
  // Blocked if a "Disallow: /" applies and no explicit allow for root.
  const disallowAll = group.rules.some((r) => r.type === 'disallow' && r.path === '/');
  const allowRoot = group.rules.some((r) => r.type === 'allow' && (r.path === '/' || r.path === ''));
  return disallowAll && !allowRoot;
}

export async function checkSite(startUrl) {
  const u = new URL(startUrl);
  const origin = u.origin;
  const result = { origin };

  // robots.txt
  try {
    const res = await fetchWithTimeout(new URL('/robots.txt', origin).toString(), { timeout: 12000 });
    if (res.ok) {
      const text = await res.text();
      const groups = parseRobots(text);
      result.robotsTxt = {
        exists: true,
        sitemapDeclared: /sitemap\s*:/i.test(text),
        allBlocked: crawlerBlocked(groups, '*'),
        aiCrawlers: Object.fromEntries(AI_CRAWLERS.map((a) => [a, crawlerBlocked(groups, a) ? 'blocked' : 'allowed'])),
      };
    } else result.robotsTxt = { exists: false };
  } catch {
    result.robotsTxt = { exists: false, error: true };
  }

  // sitemap.xml
  try {
    const res = await fetchWithTimeout(new URL('/sitemap.xml', origin).toString(), { timeout: 12000 });
    result.sitemap = { exists: res.ok, status: res.status };
  } catch {
    result.sitemap = { exists: false };
  }

  // llms.txt (informational — most AI crawlers don't read it, but it signals AEO effort)
  try {
    const res = await fetchWithTimeout(new URL('/llms.txt', origin).toString(), { timeout: 10000 });
    const ct = res.headers.get('content-type') || '';
    result.llmsTxt = { exists: res.ok && ct.includes('text/plain') };
  } catch {
    result.llmsTxt = { exists: false };
  }

  // HTTP -> HTTPS redirect
  try {
    const httpUrl = `http://${u.hostname}/`;
    const res = await fetchWithTimeout(httpUrl, { timeout: 12000, redirect: 'follow' });
    result.httpsRedirect = { redirectsToHttps: res.url.startsWith('https://'), finalUrl: res.url };
  } catch {
    result.httpsRedirect = { redirectsToHttps: null, error: 'http request failed' };
  }

  // www / non-www consistency
  try {
    const alt = u.hostname.startsWith('www.') ? u.hostname.slice(4) : `www.${u.hostname}`;
    const res = await fetchWithTimeout(`https://${alt}/`, { timeout: 12000, redirect: 'follow' });
    const finalHost = new URL(res.url).hostname;
    result.wwwConsistency = { altHost: alt, resolvesTo: finalHost, consistent: finalHost === u.hostname || res.url.startsWith(origin) };
  } catch {
    result.wwwConsistency = { error: 'alternate host unreachable' };
  }

  // 404 handling: a made-up URL should return HTTP 404, not 200 ("soft 404").
  try {
    const res = await fetchWithTimeout(new URL('/this-page-should-not-exist-audit-check-9x7z', origin).toString(), { timeout: 12000 });
    result.notFoundHandling = { status: res.status, soft404: res.status === 200 };
  } catch {
    result.notFoundHandling = { error: true };
  }

  return result;
}
