#!/usr/bin/env node
// Report generator: merges collected data (data/*.json) + Claude's qualitative
// analysis (analysis.json) into a single self-contained HTML dashboard.
// Usage: node src/report/generate-report.js <output-dir-from-audit>
import fs from 'node:fs';
import path from 'node:path';

const outDir = process.argv[2];
if (!outDir || !fs.existsSync(path.join(outDir, 'data'))) {
  console.error('Usage: node src/report/generate-report.js <audit output dir containing data/>');
  process.exit(1);
}

const readJson = (name, fallback = null) => {
  const p = path.join(outDir, 'data', name);
  if (!fs.existsSync(p)) return fallback;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
};

const meta = readJson('meta.json', {});
const site = readJson('site.json', {});
const seo = readJson('seo.json', { pages: [], siteWide: { issues: [] } });
const links = readJson('links.json', { broken: [], totalChecked: 0, ok: 0 });
const rendering = readJson('rendering.json', []);
const lighthouse = readJson('lighthouse.json', []);
const competitors = readJson('competitors.json', []);
const crawlSummary = readJson('crawl-summary.json', { pages: [] });
const analysisPath = path.join(outDir, 'analysis.json');
const analysis = fs.existsSync(analysisPath) ? JSON.parse(fs.readFileSync(analysisPath, 'utf8')) : null;

const esc = (s) =>
  String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// --- Screenshots as data URIs ---
const shotDir = path.join(outDir, 'screenshots');
const shotCache = new Map();
function shot(name) {
  if (!name) return null;
  if (shotCache.has(name)) return shotCache.get(name);
  const p = path.join(shotDir, name);
  if (!fs.existsSync(p)) return null;
  const uri = `data:image/jpeg;base64,${fs.readFileSync(p).toString('base64')}`;
  shotCache.set(name, uri);
  return uri;
}

// --- Scoring ---
const SEVERITY_WEIGHT = { high: 12, medium: 5, low: 2 };
const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));

function issueScore(issues) {
  return clamp(100 - issues.reduce((sum, i) => sum + (SEVERITY_WEIGHT[i.severity] || 2), 0));
}

const homeLh = lighthouse.find((l) => l.mobile && l.mobile.scores) || lighthouse[0] || {};
const lhMobile = homeLh.mobile && homeLh.mobile.scores ? homeLh.mobile.scores : {};
const lhDesktop = homeLh.desktop && homeLh.desktop.scores ? homeLh.desktop.scores : {};

const allPageIssues = seo.pages.flatMap((p) => p.issues.map((i) => ({ ...i, url: p.url })));
const siteIssues = seo.siteWide.issues || [];
const seoIssues = [...allPageIssues, ...siteIssues].filter((i) => i.category === 'seo');
const aeoIssues = [...allPageIssues, ...siteIssues].filter((i) => i.category === 'aeo');
const a11yIssues = allPageIssues.filter((i) => i.category === 'accessibility');
const mobileIssues = allPageIssues.filter((i) => i.category === 'mobile');
const contentIssues = allPageIssues.filter((i) => i.category === 'content');

// Mobile rendering problems from real-browser pass.
const mobileRenderIssues = [];
for (const r of rendering) {
  const m = r.mobile || {};
  if (m.horizontalOverflow)
    mobileRenderIssues.push({
      severity: 'high',
      category: 'mobile',
      message: `Horizontal scrolling on mobile at ${r.url}`,
      detail: (m.overflowingElements || []).join('\n'),
      url: r.url,
    });
  if (m.tinyTextElements > 3)
    mobileRenderIssues.push({ severity: 'medium', category: 'mobile', message: `${m.tinyTextElements} blocks of text smaller than 12px on mobile`, url: r.url });
  if (m.error) mobileRenderIssues.push({ severity: 'high', category: 'mobile', message: `Page failed to render on mobile: ${m.error}`, url: r.url });
}
const consoleErrorPages = rendering.filter((r) => ((r.desktop || {}).consoleErrors || []).length > 0);

// Technical/infrastructure issues.
const techIssues = [];
if (site.httpsRedirect && site.httpsRedirect.redirectsToHttps === false)
  techIssues.push({ severity: 'high', category: 'technical', message: 'HTTP does not redirect to HTTPS' });
if (site.notFoundHandling && site.notFoundHandling.soft404)
  techIssues.push({ severity: 'medium', category: 'technical', message: 'Missing pages return 200 instead of 404 ("soft 404") — confuses search engines' });
if (site.robotsTxt && !site.robotsTxt.exists) techIssues.push({ severity: 'medium', category: 'technical', message: 'No robots.txt file' });
if (site.sitemap && !site.sitemap.exists) techIssues.push({ severity: 'medium', category: 'seo', message: 'No sitemap.xml — search engines must discover pages by crawling alone' });
if (site.robotsTxt && site.robotsTxt.exists && !site.robotsTxt.sitemapDeclared && site.sitemap && site.sitemap.exists)
  techIssues.push({ severity: 'low', category: 'seo', message: 'sitemap.xml exists but is not declared in robots.txt' });
const firstPageHeaders = (readJson('crawl-summary.json', {}).pages || [])[0];
const homePageData = seo.pages[0];
for (const b of links.broken.filter((x) => x.internal))
  techIssues.push({ severity: 'high', category: 'links', message: `Broken internal link (${b.status || 'unreachable'}): ${b.url}`, detail: `Found on: ${(b.foundOn || []).join(', ')}` });
for (const b of links.broken.filter((x) => !x.internal).slice(0, 20))
  techIssues.push({ severity: 'medium', category: 'links', message: `Broken outbound link (${b.status || 'unreachable'}): ${b.url}`, detail: `Found on: ${(b.foundOn || []).join(', ')}` });
const unverifiedLinks = links.unverified || [];
if (unverifiedLinks.length)
  techIssues.push({
    severity: 'low',
    category: 'links',
    message: `${unverifiedLinks.length} link(s) could not be verified automatically (the destination blocks bots — they likely work for real visitors)`,
    detail: unverifiedLinks.slice(0, 15).map((b) => `${b.status}: ${b.url}`).join('\n'),
  });

// AEO extras.
const blockedAi = site.robotsTxt && site.robotsTxt.aiCrawlers ? Object.entries(site.robotsTxt.aiCrawlers).filter(([, v]) => v === 'blocked') : [];
if (blockedAi.length)
  aeoIssues.push({
    severity: 'high',
    category: 'aeo',
    message: `robots.txt blocks AI crawlers: ${blockedAi.map(([k]) => k).join(', ')}`,
    detail: 'Blocked AI crawlers cannot read the site, so the business cannot be cited in ChatGPT/Claude/Perplexity answers.',
  });

const scores = {
  performance: lhMobile.performance != null ? clamp(lhMobile.performance * 0.6 + (lhDesktop.performance ?? lhMobile.performance) * 0.4) : null,
  seo: lhMobile.seo != null ? clamp(lhMobile.seo * 0.5 + issueScore(seoIssues) * 0.5) : issueScore(seoIssues),
  aeo: issueScore(aeoIssues),
  accessibility: lhMobile.accessibility != null ? clamp(lhMobile.accessibility * 0.7 + issueScore(a11yIssues) * 0.3) : issueScore(a11yIssues),
  mobile: clamp(issueScore([...mobileIssues, ...mobileRenderIssues]) * 0.6 + (lhMobile.performance ?? 70) * 0.4),
  technical: issueScore(techIssues),
  content: issueScore(contentIssues),
};

// Qualitative sections from analysis.json.
const qual = (analysis && analysis.sections) || {};
if (qual.messaging && qual.messaging.score != null) scores.messaging = qual.messaging.score;
if (qual.ux && qual.ux.score != null) scores.ux = qual.ux.score;

const scoreValues = Object.values(scores).filter((v) => v != null);
const overall = analysis && analysis.overallScore != null ? analysis.overallScore : clamp(scoreValues.reduce((a, b) => a + b, 0) / (scoreValues.length || 1));

const scoreColor = (v) => (v == null ? '#8b93a7' : v >= 90 ? '#0cce6b' : v >= 70 ? '#5ec26a' : v >= 50 ? '#ffa400' : '#ff4e42');
const sevColor = { high: '#ff4e42', medium: '#ffa400', low: '#8b93a7' };
const sevLabel = { high: 'High', medium: 'Medium', low: 'Low' };

function findingCard(f) {
  const shotUri = f.screenshot ? shot(f.screenshot) : null;
  return `<details class="finding sev-${esc(f.severity || 'low')}">
    <summary><span class="sev" style="background:${sevColor[f.severity] || '#8b93a7'}">${sevLabel[f.severity] || 'Info'}</span>
      <span class="ftitle">${esc(f.title || f.message)}</span>
      ${f.url ? `<span class="furl">${esc(new URL(f.url).pathname)}</span>` : ''}</summary>
    <div class="fbody">
      ${f.detail ? `<pre class="fdetail">${esc(f.detail)}</pre>` : ''}
      ${f.recommendation ? `<p class="frec"><strong>How to fix:</strong> ${esc(f.recommendation)}</p>` : ''}
      ${f.evidence ? `<p class="fev"><strong>Evidence:</strong> ${esc(f.evidence)}</p>` : ''}
      ${shotUri ? `<img class="fshot" src="${shotUri}" alt="screenshot evidence">` : ''}
      ${f.url ? `<p class="fev"><a href="${esc(f.url)}" target="_blank">${esc(f.url)}</a></p>` : ''}
    </div>
  </details>`;
}

function issueList(issues) {
  const order = { high: 0, medium: 1, low: 2 };
  const sorted = [...issues].sort((a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3));
  if (!sorted.length) return `<p class="allclear">✓ No issues found in this category.</p>`;
  return sorted.map(findingCard).join('\n');
}

function metricRow(label, valueMs, good, ok, unit = 'ms') {
  if (valueMs == null) return '';
  let display, v = valueMs;
  if (unit === 'ms') display = v >= 1000 ? (v / 1000).toFixed(1) + ' s' : v + ' ms';
  else if (unit === 'kb') display = Math.round(v / 1024) + ' KB';
  else display = String(v);
  const color = v <= good ? '#0cce6b' : v <= ok ? '#ffa400' : '#ff4e42';
  return `<div class="metric"><span class="mlabel">${label}</span><span class="mval" style="color:${color}">${display}</span></div>`;
}

function lhBlock(title, lh) {
  if (!lh || !lh.scores) return `<p class="muted">Lighthouse data unavailable${lh && lh.error ? ': ' + esc(lh.error) : ''}.</p>`;
  const m = lh.metrics || {};
  return `<div class="lhblock"><h4>${title}</h4>
    <div class="lhscores">${['performance', 'accessibility', 'best-practices', 'seo']
      .map((c) => `<div class="lhscore"><div class="ring" style="--v:${lh.scores[c] ?? 0};--c:${scoreColor(lh.scores[c])}"><span>${lh.scores[c] ?? '–'}</span></div><label>${c.replace('best-practices', 'best practices')}</label></div>`)
      .join('')}</div>
    <div class="metrics">
      ${metricRow('First Contentful Paint', m.firstContentfulPaintMs, 1800, 3000)}
      ${metricRow('Largest Contentful Paint', m.largestContentfulPaintMs, 2500, 4000)}
      ${metricRow('Total Blocking Time', m.totalBlockingTimeMs, 200, 600)}
      ${metricRow('Cumulative Layout Shift', m.cumulativeLayoutShift, 0.1, 0.25, 'raw')}
      ${metricRow('Speed Index', m.speedIndexMs, 3400, 5800)}
      ${metricRow('Page Weight', m.totalByteWeight, 1600000, 3500000, 'kb')}
    </div>
    ${(lh.opportunities || []).length ? `<h5>Top speed opportunities</h5><ul class="opps">${lh.opportunities.map((o) => `<li><strong>${esc(o.title)}</strong>${o.savingsMs ? ` <em>(~${(o.savingsMs / 1000).toFixed(1)}s potential saving)</em>` : ''}<br><span class="muted">${esc(o.description)}</span></li>`).join('')}</ul>` : ''}
  </div>`;
}

// Screenshots gallery (fold shots side by side per key page).
function gallery() {
  if (!rendering.length) return '<p class="muted">No screenshots captured.</p>';
  return rendering
    .map((r) => {
      const d = shot((r.desktop || {}).screenshotFold);
      const m = shot((r.mobile || {}).screenshotFold);
      const df = shot((r.desktop || {}).screenshotFull);
      const mf = shot((r.mobile || {}).screenshotFull);
      return `<div class="shotrow"><h4><a href="${esc(r.url)}" target="_blank">${esc(r.url)}</a></h4>
      <div class="shotpair">
        <figure><figcaption>Desktop (1440px) — first screen</figcaption>${d ? `<img src="${d}" loading="lazy">` : '<p class="muted">unavailable</p>'}</figure>
        <figure class="mob"><figcaption>Mobile (390px) — first screen</figcaption>${m ? `<img src="${m}" loading="lazy">` : '<p class="muted">unavailable</p>'}</figure>
      </div>
      ${df || mf ? `<details><summary>Full-page screenshots</summary><div class="shotpair">${df ? `<figure><figcaption>Desktop full page</figcaption><img src="${df}" loading="lazy"></figure>` : ''}${mf ? `<figure class="mob"><figcaption>Mobile full page</figcaption><img src="${mf}" loading="lazy"></figure>` : ''}</div></details>` : ''}
      </div>`;
    })
    .join('\n');
}

function qualSection(key, fallbackTitle) {
  const q = qual[key];
  if (!q)
    return `<p class="muted">This section requires Claude's qualitative review (analysis.json not found). Re-run the audit through Claude Code to fill it in.</p>`;
  return `${q.summary ? `<p class="sectionsummary">${esc(q.summary)}</p>` : ''}
    ${q.strengths && q.strengths.length ? `<div class="strengths"><h4>What's working well</h4><ul>${q.strengths.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div>` : ''}
    ${(q.findings || []).map(findingCard).join('\n')}`;
}

function competitorSection() {
  if (!competitors.length && !qual.competitors) return `<p class="muted">No competitors were provided for this audit. Re-run with <code>--competitors url1,url2</code> to add a comparison.</p>`;
  let html = '';
  if (qual.competitors && qual.competitors.summary) html += `<p class="sectionsummary">${esc(qual.competitors.summary)}</p>`;
  if (competitors.length) {
    const you = { title: (homePageData || {}).title, lh: lhMobile, name: meta.url };
    html += `<table class="comptable"><thead><tr><th></th><th>Your site</th>${competitors.map((c) => `<th>${esc(new URL(c.url).hostname.replace(/^www\./, ''))}</th>`).join('')}</tr></thead><tbody>
      <tr><td>Mobile performance</td><td><strong style="color:${scoreColor(lhMobile.performance)}">${lhMobile.performance ?? '–'}</strong></td>${competitors.map((c) => `<td><strong style="color:${scoreColor((c.lighthouseMobile || {}).scores?.performance)}">${(c.lighthouseMobile || {}).scores?.performance ?? '–'}</strong></td>`).join('')}</tr>
      <tr><td>Mobile SEO score</td><td>${lhMobile.seo ?? '–'}</td>${competitors.map((c) => `<td>${(c.lighthouseMobile || {}).scores?.seo ?? '–'}</td>`).join('')}</tr>
      <tr><td>Accessibility</td><td>${lhMobile.accessibility ?? '–'}</td>${competitors.map((c) => `<td>${(c.lighthouseMobile || {}).scores?.accessibility ?? '–'}</td>`).join('')}</tr>
      <tr><td>Homepage title</td><td class="small">${esc(you.title || '')}</td>${competitors.map((c) => `<td class="small">${esc(c.title || '')}</td>`).join('')}</tr>
    </tbody></table>`;
    for (const c of competitors) {
      const cShot = c.browser && c.browser.desktop ? shot(c.browser.desktop.screenshotFold) : null;
      if (cShot) html += `<details><summary>Screenshot: ${esc(c.url)}</summary><img class="fshot" src="${cShot}" loading="lazy"></details>`;
    }
  }
  if (qual.competitors && (qual.competitors.findings || []).length) html += qual.competitors.findings.map(findingCard).join('\n');
  return html;
}

function topActions() {
  const actions = (analysis && analysis.topActions) || [];
  if (!actions.length) {
    // Fallback: derive from highest-severity technical issues.
    const high = [...techIssues, ...seoIssues, ...aeoIssues, ...mobileRenderIssues].filter((i) => i.severity === 'high').slice(0, 5);
    if (!high.length) return '<p class="muted">No critical actions identified.</p>';
    return `<ol class="actions">${high.map((i) => `<li><strong>${esc(i.message)}</strong></li>`).join('')}</ol>`;
  }
  return `<ol class="actions">${actions
    .map(
      (a) => `<li><div class="acthead"><strong>${esc(a.title)}</strong><span class="pills">${a.impact ? `<span class="pill impact">${esc(a.impact)} impact</span>` : ''}${a.effort ? `<span class="pill effort">${esc(a.effort)} effort</span>` : ''}</span></div>
      ${a.why ? `<p class="muted">${esc(a.why)}</p>` : ''}${a.how ? `<p><strong>How:</strong> ${esc(a.how)}</p>` : ''}</li>`
    )
    .join('')}</ol>`;
}

const siteName = (analysis && analysis.siteName) || (homePageData && homePageData.title) || meta.url;
const sections = [
  { id: 'overview', label: 'Overview', icon: '◉' },
  { id: 'actions', label: 'Priority Actions', icon: '⚑' },
  { id: 'messaging', label: 'Messaging & CTA', icon: '💬', score: scores.messaging },
  { id: 'ux', label: 'Design & UX', icon: '✦', score: scores.ux },
  { id: 'performance', label: 'Speed', icon: '⚡', score: scores.performance },
  { id: 'mobile', label: 'Mobile Experience', icon: '📱', score: scores.mobile },
  { id: 'seo', label: 'SEO', icon: '🔍', score: scores.seo },
  { id: 'aeo', label: 'AI Search (AEO)', icon: '🤖', score: scores.aeo },
  { id: 'content', label: 'Content & Readability', icon: '¶', score: scores.content },
  { id: 'accessibility', label: 'Accessibility', icon: '♿', score: scores.accessibility },
  { id: 'technical', label: 'Technical Health', icon: '⚙', score: scores.technical },
  { id: 'competitors', label: 'Competitors', icon: '⚔' },
  { id: 'screenshots', label: 'Screenshots', icon: '🖼' },
];

const aiAccessTable = site.robotsTxt && site.robotsTxt.aiCrawlers
  ? `<h4>AI crawler access (robots.txt)</h4><table class="comptable small"><tbody>${Object.entries(site.robotsTxt.aiCrawlers)
      .map(([k, v]) => `<tr><td>${esc(k)}</td><td style="color:${v === 'blocked' ? '#ff4e42' : '#0cce6b'}">${v}</td></tr>`)
      .join('')}</tbody></table>`
  : '';

const readabilityRows = seo.pages
  .filter((p) => p.readability && !p.utility)
  .map(
    (p) =>
      `<tr><td class="small"><a href="${esc(p.url)}" target="_blank">${esc(new URL(p.url).pathname)}</a></td><td>${p.readability.fleschReadingEase}</td><td>Grade ${p.readability.gradeLevel}</td><td>${p.wordCount}</td></tr>`
  )
  .join('');

const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Website Audit — ${esc(siteName)}</title>
<style>
:root{--bg:#0f1117;--panel:#181b24;--panel2:#1f2330;--text:#e8eaf0;--muted:#8b93a7;--accent:#4f8ef7;--border:#2a2f3e}
*{box-sizing:border-box}body{margin:0;font-family:'Segoe UI',system-ui,sans-serif;background:var(--bg);color:var(--text);line-height:1.55}
a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}
.layout{display:flex;min-height:100vh}
nav{width:250px;background:var(--panel);border-right:1px solid var(--border);padding:18px 0;position:sticky;top:0;height:100vh;overflow-y:auto;flex-shrink:0}
nav .brand{padding:0 18px 14px;border-bottom:1px solid var(--border);margin-bottom:10px}
nav .brand h1{font-size:15px;margin:0 0 2px}nav .brand p{margin:0;font-size:12px;color:var(--muted);word-break:break-all}
nav button{display:flex;align-items:center;gap:10px;width:100%;padding:9px 18px;background:none;border:none;color:var(--text);font-size:13.5px;cursor:pointer;text-align:left}
nav button:hover{background:var(--panel2)}nav button.active{background:var(--panel2);border-left:3px solid var(--accent);padding-left:15px}
nav button .navscore{margin-left:auto;font-size:11.5px;font-weight:700;padding:1px 7px;border-radius:9px;color:#0f1117}
main{flex:1;padding:28px 34px;max-width:1060px;min-width:0}
section{display:none}section.active{display:block}
h2{font-size:21px;margin:0 0 4px}h4{margin:18px 0 8px}h5{margin:14px 0 6px;color:var(--muted)}
.sectionsummary{font-size:14.5px;background:var(--panel);border:1px solid var(--border);border-left:3px solid var(--accent);padding:12px 16px;border-radius:8px}
.muted{color:var(--muted)}.small{font-size:12.5px}
.scoregrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin:20px 0}
.scorecard{background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:16px;cursor:pointer;text-align:center;transition:transform .12s}
.scorecard:hover{transform:translateY(-2px);border-color:var(--accent)}
.ring{--v:0;--c:#8b93a7;width:64px;height:64px;border-radius:50%;margin:0 auto 8px;display:flex;align-items:center;justify-content:center;background:conic-gradient(var(--c) calc(var(--v)*1%),var(--panel2) 0);position:relative}
.ring::before{content:'';position:absolute;inset:6px;border-radius:50%;background:var(--panel)}
.ring span{position:relative;font-weight:700;font-size:17px}
.bigring{width:120px;height:120px}.bigring::before{inset:10px}.bigring span{font-size:32px}
.scorecard label{font-size:12.5px;color:var(--muted);cursor:pointer}
.hero{display:flex;gap:30px;align-items:center;background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:24px;margin:18px 0}
.hero .ring{margin:0;flex-shrink:0}
.finding{background:var(--panel);border:1px solid var(--border);border-radius:10px;margin:8px 0}
.finding summary{display:flex;align-items:center;gap:10px;padding:11px 14px;cursor:pointer;font-size:13.5px;list-style:none}
.finding summary::-webkit-details-marker{display:none}
.finding summary::after{content:'▸';margin-left:auto;color:var(--muted);transition:transform .15s}
.finding[open] summary::after{transform:rotate(90deg)}
.sev{font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:8px;color:#0f1117;text-transform:uppercase;flex-shrink:0}
.ftitle{font-weight:600}.furl{color:var(--muted);font-size:11.5px;margin-left:4px}
.fbody{padding:2px 16px 14px;font-size:13.5px;border-top:1px solid var(--border)}
.fdetail{background:var(--panel2);padding:10px;border-radius:8px;white-space:pre-wrap;font-size:12px;overflow-x:auto}
.fshot{max-width:100%;border:1px solid var(--border);border-radius:8px;margin-top:8px}
.allclear{color:#0cce6b;background:rgba(12,206,107,.08);padding:12px 16px;border-radius:8px}
.lhblock{background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:16px 20px;margin:14px 0}
.lhscores{display:flex;gap:26px;flex-wrap:wrap;margin:10px 0}
.lhscore{text-align:center}.lhscore label{display:block;font-size:11px;color:var(--muted);margin-top:5px;text-transform:capitalize}
.metrics{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px;margin-top:12px}
.metric{display:flex;justify-content:space-between;background:var(--panel2);padding:8px 12px;border-radius:8px;font-size:12.5px}
.mval{font-weight:700}
.opps{font-size:13px;padding-left:18px}.opps li{margin:7px 0}
.shotrow{margin:22px 0}.shotpair{display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap}
.shotpair figure{margin:0;flex:1;min-width:280px}.shotpair figure.mob{flex:0 0 240px}
.shotpair img{width:100%;border:1px solid var(--border);border-radius:10px}
.shotpair figcaption{font-size:11.5px;color:var(--muted);margin-bottom:6px}
.comptable{border-collapse:collapse;width:100%;margin:14px 0;font-size:13.5px}
.comptable td,.comptable th{border:1px solid var(--border);padding:8px 12px;text-align:left}
.comptable th{background:var(--panel2)}
.actions{padding-left:22px}.actions>li{background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:12px 16px;margin:10px 0}
.acthead{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.pills{margin-left:auto;display:flex;gap:6px}
.pill{font-size:10.5px;padding:2px 9px;border-radius:9px;font-weight:700;text-transform:uppercase}
.pill.impact{background:rgba(79,142,247,.18);color:#7fb0ff}.pill.effort{background:var(--panel2);color:var(--muted)}
.strengths{background:rgba(12,206,107,.06);border:1px solid rgba(12,206,107,.25);border-radius:10px;padding:4px 18px;margin:12px 0}
.execsummary{font-size:15px;white-space:pre-wrap}
.statrow{display:flex;gap:14px;flex-wrap:wrap;margin:16px 0}
.stat{background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:12px 18px;text-align:center}
.stat b{display:block;font-size:22px}.stat span{font-size:11.5px;color:var(--muted)}
@media(max-width:820px){.layout{flex-direction:column}nav{width:100%;height:auto;position:static;display:flex;flex-wrap:wrap}nav .brand{width:100%}nav button{width:auto}main{padding:18px}}
@media print{nav{display:none}section{display:block!important;page-break-before:always}}
</style></head><body>
<div class="layout">
<nav><div class="brand"><h1>Website Audit</h1><p>${esc(meta.url || '')}<br>${esc(meta.date || '')}</p></div>
${sections.map((s) => `<button data-target="${s.id}"><span>${s.icon}</span> ${s.label}${s.score != null ? `<span class="navscore" style="background:${scoreColor(s.score)}">${s.score}</span>` : ''}</button>`).join('\n')}
</nav>
<main>
<section id="overview" class="active">
  <h2>Audit Overview</h2>
  <div class="hero">
    <div class="ring bigring" style="--v:${overall};--c:${scoreColor(overall)}"><span>${overall}</span></div>
    <div><h3 style="margin:0 0 6px">${esc(siteName)}</h3>
    <p class="muted" style="margin:0">Audited ${esc(meta.date || '')} · ${crawlSummary.pagesCrawled || seo.pages.length} pages crawled · ${links.totalChecked} links checked · desktop + mobile</p>
    ${analysis && analysis.executiveSummary ? `<p class="execsummary">${esc(analysis.executiveSummary)}</p>` : ''}</div>
  </div>
  <div class="statrow">
    <div class="stat"><b style="color:${links.broken.length ? '#ff4e42' : '#0cce6b'}">${links.broken.length}</b><span>broken links</span></div>
    <div class="stat"><b>${[...allPageIssues, ...siteIssues, ...techIssues, ...mobileRenderIssues, ...Object.values(qual).flatMap((q) => q.findings || [])].filter((i) => i.severity === 'high').length}</b><span>high-severity issues</span></div>
    <div class="stat"><b>${seo.pages.length}</b><span>pages analyzed</span></div>
    <div class="stat"><b style="color:${scoreColor(lhMobile.performance)}">${lhMobile.performance ?? '–'}</b><span>mobile speed score</span></div>
  </div>
  <h4>Category scores — click any card for details</h4>
  <div class="scoregrid">
  ${sections.filter((s) => s.score != null).map((s) => `<div class="scorecard" data-target="${s.id}"><div class="ring" style="--v:${s.score};--c:${scoreColor(s.score)}"><span>${s.score}</span></div><label>${s.label}</label></div>`).join('\n')}
  </div>
</section>

<section id="actions"><h2>Priority Actions</h2><p class="muted">The fixes that matter most, in order.</p>${topActions()}</section>

<section id="messaging"><h2>Messaging &amp; Call-to-Action</h2><p class="muted">Is it clear what the business does, who it serves, and what a visitor should do next? Reviewed by Claude from real rendered pages.</p>${qualSection('messaging')}</section>

<section id="ux"><h2>Design &amp; User Experience</h2><p class="muted">Visual quality, layout, navigation, and trust signals — reviewed by Claude from desktop and mobile screenshots.</p>${qualSection('ux')}</section>

<section id="performance"><h2>Speed &amp; Performance</h2>
<p class="muted">Measured with Google Lighthouse on the homepage. Mobile uses simulated 4G throttling — that's what Google uses for ranking.</p>
${lhBlock('📱 Mobile', homeLh.mobile)}
${lhBlock('🖥 Desktop', homeLh.desktop)}
${lighthouse.slice(1).map((l) => (l.mobile && l.mobile.scores ? `<details><summary style="cursor:pointer;padding:8px 0">More: ${esc(l.url)} (mobile)</summary>${lhBlock('📱 ' + esc(l.url), l.mobile)}</details>` : '')).join('')}
</section>

<section id="mobile"><h2>Mobile Experience</h2>
<p class="muted">Checked in a real browser at iPhone dimensions (390×844).</p>
${issueList([...mobileIssues, ...mobileRenderIssues])}
${rendering.length ? `<h4>Quick mobile view</h4><div class="shotpair">${rendering.slice(0, 3).map((r) => { const m = shot((r.mobile || {}).screenshotFold); return m ? `<figure class="mob"><figcaption>${esc(new URL(r.url).pathname)}</figcaption><img src="${m}" loading="lazy"></figure>` : ''; }).join('')}</div>` : ''}
</section>

<section id="seo"><h2>SEO</h2>
<p class="muted">Titles, descriptions, headings, indexability, and site structure across all ${seo.pages.length} crawled pages.</p>
${issueList(seoIssues)}</section>

<section id="aeo"><h2>AI Search Visibility (AEO)</h2>
<p class="muted">Can AI assistants (ChatGPT, Claude, Perplexity, Google AI) read this site and cite the business in their answers?</p>
${issueList(aeoIssues)}
${aiAccessTable}
<p class="small muted">llms.txt: ${site.llmsTxt && site.llmsTxt.exists ? 'present' : 'not present'} (optional — most AI crawlers read HTML directly; structured data and crawler access matter far more).</p>
<p class="small muted">Structured data found: ${seo.siteWide.schemaTypes && seo.siteWide.schemaTypes.length ? esc(seo.siteWide.schemaTypes.join(', ')) : 'none'}</p>
</section>

<section id="content"><h2>Content &amp; Readability</h2>
${issueList(contentIssues)}
${readabilityRows ? `<h4>Readability by page</h4><p class="small muted">Reading Ease: 60+ is comfortable for most visitors; below 40 reads like academic text. Aim for grade level 8–10 for general audiences.</p><table class="comptable"><thead><tr><th>Page</th><th>Reading ease</th><th>Grade level</th><th>Words</th></tr></thead><tbody>${readabilityRows}</tbody></table>` : ''}
</section>

<section id="accessibility"><h2>Accessibility</h2>
<p class="muted">Lighthouse accessibility score (homepage, mobile): <strong style="color:${scoreColor(lhMobile.accessibility)}">${lhMobile.accessibility ?? '–'}</strong></p>
${issueList(a11yIssues)}
${homeLh.mobile && homeLh.mobile.failedAudits && homeLh.mobile.failedAudits.accessibility && homeLh.mobile.failedAudits.accessibility.length ? `<h4>Lighthouse accessibility findings</h4>${homeLh.mobile.failedAudits.accessibility.map((a) => findingCard({ severity: a.score < 0.5 ? 'medium' : 'low', title: a.title, detail: a.description })).join('')}` : ''}
</section>

<section id="technical"><h2>Technical Health</h2>
<p class="muted">Broken links, HTTPS, error handling, and infrastructure.</p>
${issueList(techIssues)}
${consoleErrorPages.length ? `<h4>JavaScript console errors</h4>${consoleErrorPages.map((r) => findingCard({ severity: 'medium', title: `${r.desktop.consoleErrors.length} console error(s) on ${new URL(r.url).pathname}`, detail: r.desktop.consoleErrors.join('\n'), url: r.url })).join('')}` : ''}
</section>

<section id="competitors"><h2>Competitor Comparison</h2>${competitorSection()}</section>

<section id="screenshots"><h2>Screenshots — Desktop vs Mobile</h2>${gallery()}</section>
</main></div>
<script>
const show=(id)=>{document.querySelectorAll('section').forEach(s=>s.classList.toggle('active',s.id===id));
document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.target===id));
window.scrollTo(0,0);history.replaceState(null,'','#'+id);};
document.querySelectorAll('[data-target]').forEach(el=>el.addEventListener('click',()=>show(el.dataset.target)));
if(location.hash)show(location.hash.slice(1));else document.querySelector('nav button').classList.add('active');
</script>
</body></html>`;

const reportPath = path.join(outDir, 'report.html');
fs.writeFileSync(reportPath, html);
const sizeMb = (fs.statSync(reportPath).size / 1024 / 1024).toFixed(1);
console.log(`Report written: ${reportPath} (${sizeMb} MB)`);
console.log(`Scores: ${JSON.stringify({ overall, ...scores })}`);
