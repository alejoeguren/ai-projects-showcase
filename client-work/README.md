# Client work (described, not included)

> The code for these belongs to clients, so it isn't in this repo. Clients are described by type only. What's worth showing is the **integration work**: getting data out of the tools a small business already uses and turning it into something they look at every week.

Three client systems, built back to back between late July and late September 2026, each from first commit to in-use within a couple of weeks.

## 1. Marketing analytics hub for an education/certification business

**Problem:** social media and website numbers lived in separate tools, and nobody could say whether any of it was producing the one thing that mattered: program signups.

**What was built:** a dashboard that joins social and web data and points all of it at a single conversion goal.

| Source | How it's connected |
|---|---|
| **Metricool** (Instagram + Facebook) | Through Claude's **MCP connector**. Metricool has no REST API key for this plan, so Claude itself pulls the data. |
| **Google Analytics 4** | Python + **GA4 Data API**, OAuth installed-app flow, six standard reports |
| **Signups** | A manual CSV kept outside the repo because it holds prospect personal data, with written privacy rules for what may and may not be reported |

**Runs:** as a weekly scheduled Claude task that refreshes the data and rebuilds the dashboard.

**Learned the hard way:** filter the client's own back-office traffic out of GA4 before you trust any number; record exactly when each data source's history starts so nobody "discovers" a fake growth spike; keep personal data out of version control from day one.

## 2. Weekly search, local, and AI-visibility report for a local services business

**Problem:** "Are people finding us?" had four different answers depending on which tool you opened, and nobody knew whether AI assistants recommend the business at all.

**What was built:** one weekly report from four sources, published straight into the client's **Google Sheet** plus a visual dashboard.

| Source | What it answers | How it's connected |
|---|---|---|
| **Technical SEO crawl** | What search engines actually read on the site | Custom crawler, no credentials needed |
| **GA4** | How traffic arrives and which pages hold it | Google Analytics Data + Admin APIs |
| **Google Business Profile** | Local visibility: views, calls, direction requests | Business Profile Performance + Account Management + Business Information APIs |
| **AI-search probes** | Do ChatGPT-style assistants name this business when asked? | **Anthropic API**: a fixed set of realistic questions asked weekly, answers checked for the business's name |

**Runs:** a Claude scheduled task every week, end to end, with no one touching it. It replaced an earlier Windows Task Scheduler job that couldn't do the AI steps.

**Learned the hard way:** Google Business Profile **rejects service accounts** (a person owns the listing, so a person has to consent), so the whole thing moved to a single OAuth sign-in that covers GA4 too. Search Console wasn't available for this property, and Business Profile turned out to answer most of the same questions.

## 3. Persona landing pages for the same business

**Problem:** one generic website was trying to talk to very different customers: someone in a crisis, someone planning ahead, someone overwhelmed, someone coordinating a whole family.

**What was built:** four landing pages, one per customer persona, all on a single shared template that follows a written page schema. Each has persona-specific copy and form wording, a short quiz to help visitors self-identify, and a shared **review room** (a hosted page) where the client could comment on every page before launch.

**Why it's interesting:** the template and schema made the fourth page as cheap as the first, and the review room replaced a long email thread of feedback.

## What these have in common

- **Use the tools the client already has.** Metricool, GA4, Google Business Profile, Google Sheets. Nobody had to adopt anything new.
- **Every API is its own small project.** Auth, permissions, and quirks take most of the effort, so each one gets documented the first time to avoid relearning it.
- **Weekly and automatic, or it doesn't get used.** A report someone has to remember to run stops getting run.
- **Privacy is part of the design.** Personal data stays out of the repo, and each project writes down what may be reported.
