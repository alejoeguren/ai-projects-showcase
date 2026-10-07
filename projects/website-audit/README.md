# Website Audit Tool

Give it a website, get back an interactive HTML dashboard covering everything that matters — for desktop **and** mobile.

## How to use it

Open Claude Code in this folder and say:

> **audit example.com**

Optionally with competitors:

> **audit example.com, compare against competitor1.com and competitor2.com**

That's it. Claude runs the data collection (3–10 minutes), personally reviews the screenshots and page content for messaging/design quality, and produces `report.html` — which opens automatically when done.

## What's in the report

| Section | What it answers |
|---|---|
| **Overview** | Overall score + category scorecards (click any card to drill in) |
| **Priority Actions** | The 5–8 fixes that matter most, ordered by impact vs effort |
| **Messaging & CTA** | Is it clear what the business does and what visitors should do next? *(AI-reviewed)* |
| **Design & UX** | Does it look credible and current? Anything broken or confusing? *(AI-reviewed)* |
| **Speed** | Google Lighthouse scores + Core Web Vitals, mobile and desktop |
| **Mobile Experience** | Real-browser checks at iPhone size: overflow, tiny text, rendering failures |
| **SEO** | Titles, descriptions, headings, duplicates, indexability across all pages |
| **AI Search (AEO)** | Can ChatGPT/Claude/Perplexity crawl and cite the site? Structured data, AI-crawler access |
| **Content & Readability** | Reading-ease scores per page, thin content |
| **Accessibility** | Lighthouse accessibility audit + missing alt text |
| **Technical Health** | Broken links, HTTPS, 404 handling, console errors |
| **Competitors** | Side-by-side scores and messaging comparison (if competitors given) |
| **Screenshots** | Desktop vs mobile, first-screen and full-page, for every key page |

Reports are self-contained single HTML files (screenshots embedded) — you can email them or share them with clients as-is. Past audits live in `output/<site>/<date>/`.

## Running the collector manually (optional)

```
node src/audit.js https://example.com --competitors https://a.com,https://b.com --max-pages 30
node src/report/generate-report.js output/example.com/2026-07-07
```

Run manually you get the technical report only; the Messaging, Design/UX, and Priority Actions sections are filled in when the audit runs through Claude Code.
