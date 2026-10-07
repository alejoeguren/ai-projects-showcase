// Lighthouse runner: reuses the Puppeteer-bundled Chrome via its debugging port.
// Runs mobile + desktop passes and extracts scores, Core Web Vitals, and top opportunities.
import lighthouse from 'lighthouse';
import { log } from './util.js';

const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];

function extract(lhr) {
  const audits = lhr.audits || {};
  const num = (id) => (audits[id] && audits[id].numericValue != null ? Math.round(audits[id].numericValue) : null);

  const opportunities = Object.values(audits)
    .filter((a) => a.details && a.details.type === 'opportunity' && a.score !== null && a.score < 0.9)
    .sort((a, b) => (b.details.overallSavingsMs || 0) - (a.details.overallSavingsMs || 0))
    .slice(0, 8)
    .map((a) => ({ title: a.title, savingsMs: Math.round(a.details.overallSavingsMs || 0), description: (a.description || '').split('[')[0].trim() }));

  const failedAudits = {};
  for (const cat of CATEGORIES) {
    const categoryRef = lhr.categories[cat === 'best-practices' ? 'best-practices' : cat];
    if (!categoryRef) continue;
    failedAudits[cat] = categoryRef.auditRefs
      .map((ref) => audits[ref.id])
      .filter((a) => a && a.score !== null && a.score < 0.9 && a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'notApplicable')
      .slice(0, 12)
      .map((a) => ({ id: a.id, title: a.title, description: (a.description || '').split('[')[0].trim().slice(0, 250), score: a.score }));
  }

  return {
    scores: Object.fromEntries(
      CATEGORIES.map((c) => {
        const key = c === 'best-practices' ? 'best-practices' : c;
        return [c, lhr.categories[key] ? Math.round(lhr.categories[key].score * 100) : null];
      })
    ),
    metrics: {
      firstContentfulPaintMs: num('first-contentful-paint'),
      largestContentfulPaintMs: num('largest-contentful-paint'),
      totalBlockingTimeMs: num('total-blocking-time'),
      cumulativeLayoutShift: audits['cumulative-layout-shift'] ? Math.round((audits['cumulative-layout-shift'].numericValue || 0) * 1000) / 1000 : null,
      speedIndexMs: num('speed-index'),
      timeToInteractiveMs: num('interactive'),
      totalByteWeight: num('total-byte-weight'),
    },
    opportunities,
    failedAudits,
  };
}

export async function runLighthouse(browser, url, formFactor) {
  const port = new URL(browser.wsEndpoint()).port;
  const flags = { port: Number(port), output: 'json', logLevel: 'error', onlyCategories: CATEGORIES };
  const config = {
    extends: 'lighthouse:default',
    settings:
      formFactor === 'desktop'
        ? {
            formFactor: 'desktop',
            screenEmulation: { mobile: false, width: 1440, height: 900, deviceScaleFactor: 1, disabled: false },
            throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1 },
          }
        : { formFactor: 'mobile' }, // default LH mobile emulation + throttling
  };
  log(`Lighthouse ${formFactor}: ${url}`);
  const result = await lighthouse(url, flags, config);
  return extract(result.lhr);
}

export async function lighthouseAudit(browser, urls) {
  const results = [];
  for (const url of urls) {
    const entry = { url };
    try {
      entry.mobile = await runLighthouse(browser, url, 'mobile');
    } catch (err) {
      entry.mobile = { error: String(err && err.message ? err.message : err).slice(0, 300) };
    }
    try {
      entry.desktop = await runLighthouse(browser, url, 'desktop');
    } catch (err) {
      entry.desktop = { error: String(err && err.message ? err.message : err).slice(0, 300) };
    }
    results.push(entry);
  }
  return results;
}
