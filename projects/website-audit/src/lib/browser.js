// Real-browser rendering checks with Puppeteer: desktop + mobile screenshots,
// console errors, failed requests, mobile horizontal-overflow detection.
import puppeteer from 'puppeteer';
import path from 'node:path';
import fs from 'node:fs';
import { slugify, log } from './util.js';

const VIEWPORTS = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

export async function launchBrowser() {
  return puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
}

async function auditViewport(browser, url, viewportName, screenshotDir) {
  const page = await browser.newPage();
  const consoleErrors = [];
  const failedRequests = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 300));
  });
  page.on('requestfailed', (req) => {
    const failure = req.failure();
    if (failure && failure.errorText !== 'net::ERR_ABORTED')
      failedRequests.push({ url: req.url().slice(0, 200), error: failure.errorText });
  });
  page.on('response', (res) => {
    if (res.status() >= 400) failedRequests.push({ url: res.url().slice(0, 200), status: res.status() });
  });

  const vp = VIEWPORTS[viewportName];
  await page.setViewport(vp);
  if (viewportName === 'mobile') {
    await page.setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    );
  }

  const result = { viewport: viewportName, url };
  try {
    const start = Date.now();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    result.loadMs = Date.now() - start;
    await new Promise((r) => setTimeout(r, 1500)); // settle animations/lazy content

    // Dismiss trivially-dismissible cookie banners is out of scope; capture as-is.
    const slug = slugify(url);
    const foldPath = path.join(screenshotDir, `${slug}-${viewportName}-fold.jpg`);
    await page.screenshot({ path: foldPath, type: 'jpeg', quality: 78 });
    result.screenshotFold = path.basename(foldPath);

    const fullPath = path.join(screenshotDir, `${slug}-${viewportName}-full.jpg`);
    await page.screenshot({ path: fullPath, fullPage: true, captureBeyondViewport: true, type: 'jpeg', quality: 65 });
    result.screenshotFull = path.basename(fullPath);

    const metrics = await page.evaluate(() => {
      const doc = document.documentElement;
      const overflowX = doc.scrollWidth > window.innerWidth + 2;
      // Find elements wider than the viewport (common mobile-breakage culprits).
      const wide = [];
      if (overflowX) {
        for (const el of document.querySelectorAll('body *')) {
          const r = el.getBoundingClientRect();
          if (r.width > window.innerWidth + 10 && wide.length < 5) {
            wide.push(`<${el.tagName.toLowerCase()} class="${(el.className || '').toString().slice(0, 60)}"> width=${Math.round(r.width)}px`);
          }
        }
      }
      // Smallest font size in visible body text.
      let tinyTextCount = 0;
      for (const el of document.querySelectorAll('p, li, span, a, td')) {
        const size = parseFloat(getComputedStyle(el).fontSize);
        if (el.textContent.trim().length > 20 && size < 12) tinyTextCount++;
      }
      return {
        pageHeight: doc.scrollHeight,
        horizontalOverflow: overflowX,
        overflowingElements: wide,
        tinyTextElements: tinyTextCount,
        visibleText: document.body.innerText.slice(0, 3000),
      };
    });
    Object.assign(result, metrics);
  } catch (err) {
    result.error = String(err && err.message ? err.message : err).slice(0, 300);
  }

  result.consoleErrors = [...new Set(consoleErrors)].slice(0, 15);
  result.failedRequests = failedRequests.slice(0, 15);
  await page.close();
  return result;
}

export async function browserAudit(browser, urls, screenshotDir) {
  fs.mkdirSync(screenshotDir, { recursive: true });
  const results = [];
  for (const url of urls) {
    log(`Rendering ${url} (desktop + mobile)…`);
    const desktop = await auditViewport(browser, url, 'desktop', screenshotDir);
    const mobile = await auditViewport(browser, url, 'mobile', screenshotDir);
    results.push({ url, desktop, mobile });
  }
  return results;
}
