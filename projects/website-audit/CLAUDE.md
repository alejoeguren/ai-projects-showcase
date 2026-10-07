# Website Audit Tool

Comprehensive website audit tool. User says "audit <url>" (optionally with competitor URLs) → follow the `website-audit` skill (`.claude/skills/website-audit/SKILL.md`).

## Architecture
- `src/audit.js` — data collector CLI: crawls up to 30 pages, checks links, runs Lighthouse (mobile+desktop), captures desktop+mobile screenshots, site infrastructure checks. Writes everything to `output/<host>/<date>/`.
- `src/lib/` — crawl, seo (per-page + site-wide checks, readability), links, site (robots/sitemap/AI-crawler access/https/404), browser (puppeteer rendering + screenshots), lighthouse.
- `src/report/generate-report.js` — merges `data/*.json` + `analysis.json` (Claude-authored qualitative review) into self-contained `report.html` dashboard.
- `analysis.json` is written by Claude per audit — schema documented in the skill file.

## Conventions
- ESM modules (`"type": "module"`).
- The user is non-technical: reports and chat summaries must be plain English, business-impact framed.
- `output/` is per-audit disposable data; never commit-worthy.
