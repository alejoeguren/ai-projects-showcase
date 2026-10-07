// Per-page SEO/AEO/content checks computed from crawled page data.

// Flesch Reading Ease (approximate syllable counting; good enough for scoring bands).
function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!word) return 0;
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

export function readability(text) {
  const sample = text.slice(0, 12000);
  const sentences = sample.split(/[.!?]+[\s$]/).filter((s) => s.trim().length > 2);
  const words = sample.split(/\s+/).filter((w) => /[a-zA-Z]/.test(w));
  if (sentences.length < 3 || words.length < 50) return null;
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const wps = words.length / sentences.length;
  const spw = syllables / words.length;
  const flesch = 206.835 - 1.015 * wps - 84.6 * spw;
  const grade = 0.39 * wps + 11.8 * spw - 15.59;
  return {
    fleschReadingEase: Math.round(Math.max(0, Math.min(100, flesch))),
    gradeLevel: Math.round(Math.max(0, grade) * 10) / 10,
    avgWordsPerSentence: Math.round(wps * 10) / 10,
  };
}

// Functional/system pages (cart, login, user profiles…) are not content pages:
// they shouldn't be judged on word count, descriptions, or heading structure.
const UTILITY_SEGMENTS = new Set([
  'cart', 'checkout', 'login', 'signin', 'sign-in', 'signup', 'sign-up', 'register',
  'password', 'reset-password', 'account', 'my-account', 'profile', 'search',
  'session', 'wishlist', 'compare', 'logout', 'auth',
]);
export function isUtilityPage(url) {
  try {
    const segs = new URL(url).pathname.toLowerCase().split('/').filter(Boolean);
    return segs.some((s) => UTILITY_SEGMENTS.has(s));
  } catch {
    return false;
  }
}

export function analyzePage(page) {
  const issues = [];
  const utility = isUtilityPage(page.url);
  const add = (severity, category, message, detail) => issues.push({ severity, category, message, detail });

  // --- SEO basics ---
  if (!page.title) add('high', 'seo', 'Missing <title> tag');
  else if (page.title.length < 15) add('medium', 'seo', `Title too short (${page.title.length} chars)`, page.title);
  else if (page.title.length > 65) add('low', 'seo', `Title may get cut off in search results (${page.title.length} chars)`, page.title);

  if (!page.metaDescription) add('medium', 'seo', 'Missing meta description');
  else if (page.metaDescription.length > 165)
    add('low', 'seo', `Meta description too long (${page.metaDescription.length} chars)`, page.metaDescription.slice(0, 120) + '…');

  if (page.h1Count === 0) add('medium', 'seo', 'No H1 heading on page');
  else if (page.h1Count > 1) add('low', 'seo', `Multiple H1 headings (${page.h1Count}) — should usually be one`);

  if (!page.canonical) add('low', 'seo', 'No canonical URL specified');
  if (/noindex/i.test(page.metaRobots)) add('high', 'seo', 'Page is set to NOINDEX — it will not appear in search results', page.metaRobots);
  if (!page.lang) add('low', 'seo', 'Missing lang attribute on <html> (helps search engines and screen readers)');

  // Heading hierarchy: h3 before any h2, etc.
  let lastLevel = 0;
  for (const h of page.headings) {
    const level = Number(h.tag[1]);
    if (lastLevel && level > lastLevel + 1) {
      add('low', 'seo', `Heading levels skip from H${lastLevel} to H${level}`, `"${h.text.slice(0, 60)}"`);
      break;
    }
    lastLevel = level;
  }

  // --- Images ---
  const imgs = page.images || [];
  const missingAlt = imgs.filter((i) => i.src && (i.alt === undefined || i.alt === null));
  if (missingAlt.length)
    add('medium', 'accessibility', `${missingAlt.length} of ${imgs.length} images missing alt text`, missingAlt.slice(0, 5).map((i) => i.src).join('\n'));
  const noLazy = imgs.filter((i) => i.src && !i.loading);
  if (imgs.length > 8 && noLazy.length > 8)
    add('low', 'performance', `${noLazy.length} images without lazy loading (loading="lazy")`);

  // --- Mobile ---
  if (!page.viewport) add('high', 'mobile', 'Missing viewport meta tag — page will not scale properly on phones');

  // --- Social sharing ---
  if (!page.ogTags['og:title'] && !page.ogTags['og:description'])
    add('low', 'seo', 'No Open Graph tags — link previews on social media/messaging apps will look bare');

  // --- AEO ---
  if (page.jsonLdTypes.includes('INVALID_JSON_LD')) add('medium', 'aeo', 'Page has structured data (JSON-LD) that fails to parse');
  const questionHeadings = page.headings.filter((h) => /^(what|how|why|when|where|who|which|can|do|does|is|are|should)\b/i.test(h.text) || h.text.endsWith('?'));

  // --- Content ---
  if (page.wordCount < 100 && page.status === 200)
    add('medium', 'content', `Very thin content (${page.wordCount} words) — little for search or AI engines to work with`);

  const read = readability(page.bodyText);

  return {
    url: page.url,
    title: page.title,
    utility,
    // Utility pages: only rendering problems matter, not content/SEO polish.
    issues: utility ? issues.filter((i) => i.category === 'mobile') : issues,
    readability: read,
    wordCount: page.wordCount,
    jsonLdTypes: page.jsonLdTypes.filter((t) => t !== 'INVALID_JSON_LD'),
    questionHeadingCount: questionHeadings.length,
    headings: page.headings,
    metaDescription: page.metaDescription,
  };
}

// Site-wide rollups across all crawled pages.
export function analyzeSiteWide(pages) {
  const issues = [];

  // Utility/system pages shouldn't be in search results at all — flag once, site-wide.
  const utilityPages = pages.filter((p) => isUtilityPage(p.url) && !/noindex/i.test(p.metaRobots || ''));
  if (utilityPages.length)
    issues.push({
      severity: 'medium',
      category: 'seo',
      message: `${utilityPages.length} internal/system page(s) (login, cart, user profiles…) are visible to search engines`,
      detail:
        utilityPages.slice(0, 10).map((p) => p.url).join('\n') +
        '\n\nThese pages have no value to searchers and dilute the site. Unpublish them or mark them noindex.',
    });

  const contentPages = pages.filter((p) => !isUtilityPage(p.url));
  const byTitle = new Map();
  const byDesc = new Map();
  for (const p of contentPages) {
    if (p.title) byTitle.set(p.title, (byTitle.get(p.title) || []).concat(p.url));
    if (p.metaDescription) byDesc.set(p.metaDescription, (byDesc.get(p.metaDescription) || []).concat(p.url));
  }
  const dupTitles = [...byTitle.entries()].filter(([, urls]) => urls.length > 1);
  const dupDescs = [...byDesc.entries()].filter(([, urls]) => urls.length > 1);
  if (dupTitles.length)
    issues.push({
      severity: 'medium',
      category: 'seo',
      message: `${dupTitles.length} duplicate title(s) shared across pages`,
      detail: dupTitles.slice(0, 5).map(([t, urls]) => `"${t.slice(0, 70)}" → ${urls.length} pages`).join('\n'),
    });
  if (dupDescs.length)
    issues.push({
      severity: 'low',
      category: 'seo',
      message: `${dupDescs.length} duplicate meta description(s) shared across pages`,
      detail: dupDescs.slice(0, 3).map(([d, urls]) => `"${d.slice(0, 70)}…" → ${urls.length} pages`).join('\n'),
    });

  const allSchemaTypes = [...new Set(pages.flatMap((p) => p.jsonLdTypes || []))].filter((t) => t !== 'INVALID_JSON_LD');
  const hasOrg = allSchemaTypes.some((t) => /Organization|LocalBusiness/i.test(String(t)));
  const hasFaq = allSchemaTypes.some((t) => /FAQPage|QAPage/i.test(String(t)));
  if (!allSchemaTypes.length)
    issues.push({
      severity: 'medium',
      category: 'aeo',
      message: 'No structured data (schema.org JSON-LD) found anywhere on the site',
      detail: 'Structured data helps search and AI engines extract facts about the business (name, services, location, FAQs).',
    });
  else {
    if (!hasOrg)
      issues.push({ severity: 'low', category: 'aeo', message: 'No Organization/LocalBusiness schema — engines must guess basic business facts' });
    if (!hasFaq)
      issues.push({ severity: 'low', category: 'aeo', message: 'No FAQ/QA schema found — FAQ markup makes answers easy for AI engines to quote' });
  }

  return { issues, schemaTypes: allSchemaTypes, duplicateTitles: dupTitles.length, duplicateDescriptions: dupDescs.length };
}
