---
name: website-audit
description: Run a comprehensive website audit (SEO, AEO, speed, mobile, messaging, broken links, competitors) and produce an interactive HTML dashboard report. Use whenever the user asks to audit a website, gives a URL to analyze, or says "audit <site>".
---

# Website Audit

Produce a full audit of a website as a self-contained HTML dashboard. The pipeline collects technical evidence; Claude adds the qualitative judgment (messaging, CTA clarity, design/UX); the generator merges both into `report.html`.

## Workflow

### 1. Collect data

```
node src/audit.js <url> [--competitors url1,url2] [--max-pages 30]
```

- Takes 3–10 minutes (crawl + link check + Lighthouse + screenshots). Run in background and monitor.
- Output goes to `output/<host>/<date>/` — the final line prints `OUTPUT_DIR=...`.
- If the user named competitors, pass up to 3 with `--competitors`.
- If the crawl fails entirely (exit code 2), the site likely blocks bots — tell the user and try `--max-pages 5` or check the URL.

### 2. Review the evidence (the part only Claude can do)

Read from `OUTPUT_DIR/data/`:
- `content.json` — page text + headings for messaging analysis
- `rendering.json` — per-page `visibleText`, mobile overflow, console errors
- `seo.json`, `site.json`, `links.json`, `lighthouse.json` — skim for context
- `competitors.json` if present

**Look at the screenshots** in `OUTPUT_DIR/screenshots/` with the Read tool (they are images) — at minimum the homepage desktop-fold, mobile-fold, and desktop-full, plus 2–3 other key pages. Judge:

1. **Messaging** — Within 5 seconds of the first screen: what does this business do, for whom, and why should I care? Is there one clear primary call-to-action above the fold? Is contact info findable? Is the value proposition specific or generic fluff?
2. **Design & UX** — Does it look current or dated? Visual hierarchy, whitespace, readability of text over images, navigation clarity, trust signals (testimonials, real photos, credentials), consistency across pages, obvious rendering breakage (overlaps, cut-off text) on either viewport.
3. **Competitors** (if provided) — compare messaging sharpness and first impressions using their screenshots and `bodyText`.

### 3. Write `OUTPUT_DIR/analysis.json`

```json
{
  "siteName": "Business Name",
  "executiveSummary": "3-5 sentence plain-English verdict: overall state, the 2-3 things holding the site back most, and expected payoff of fixing them.",
  "overallScore": 0-100,
  "sections": {
    "messaging": {
      "score": 0-100,
      "summary": "one-paragraph verdict",
      "strengths": ["..."],
      "findings": [
        {"severity": "high|medium|low", "title": "...", "detail": "what was observed",
         "recommendation": "concrete fix, plain English", "evidence": "quote or observation",
         "screenshot": "home-desktop-fold.jpg", "url": "https://..."}
      ]
    },
    "ux": { same shape },
    "competitors": { "summary": "...", "findings": [...] }
  },
  "topActions": [
    {"title": "...", "why": "business impact in plain English", "how": "concrete first step",
     "impact": "high|medium", "effort": "low|medium|high", "category": "messaging|seo|..."}
  ]
}
```

Rules for analysis quality:
- 5–8 `topActions`, ordered by impact-to-effort ratio, mixing technical findings (from the data) and qualitative ones. These are the heart of the report.
- Every finding needs a concrete `recommendation` a non-technical owner can act on or hand to a developer.
- Reference a `screenshot` filename (from `OUTPUT_DIR/screenshots/`) whenever the finding is visual.
- Be honest but constructive; include `strengths` so the report is credible, not a pile-on.
- Scores: 90+ excellent, 70–89 good with gaps, 50–69 needs work, <50 seriously hurting the business.

### 4. Generate and deliver

```
node src/report/generate-report.js <OUTPUT_DIR>
```

Then open it for the user: `Start-Process <OUTPUT_DIR>\report.html` (PowerShell), and summarize the overall score, top 3 actions, and anything surprising in chat.

## Notes
- Node deps are already installed (`puppeteer`, `lighthouse`, `cheerio`). If `node_modules` is missing, run `npm install` first.
- Screenshot naming: `<page-slug>-<desktop|mobile>-<fold|full>.jpg`; homepage slug is `home`.
- Sites behind aggressive bot protection (Cloudflare challenge) may return 403s — report that honestly rather than auditing the challenge page.
