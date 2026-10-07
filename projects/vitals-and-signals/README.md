# Vitals & Signals

> **Status: working pipeline.** Episodes have been produced and published with it. (This repo is also public on GitHub.)

A weekly podcast and newsletter on AI in healthcare, researched, written, and voiced by AI, with a human approval step in the middle.

## The pipeline

```
research.py   →  Claude agent searches the week's AI + healthcare news (four sections)
              →  Claude writes a newsletter post + a 15–25 minute podcast script
              →  both pushed to a Notion database as a Draft
   [ human reviews in Notion, sets Status = Approved ]
publish.py    →  finds Approved episodes in Notion
              →  ElevenLabs turns the script into an MP3
              →  MP3 uploaded as a GitHub Release asset, feed.xml updated
              →  Notion status set to Published
```

GitHub itself is the podcast host: `feed.xml` is a standard iTunes-compatible RSS feed served from the repo, and the audio files live on GitHub Releases. No hosting bill.

## Files

| Path | What it does |
|---|---|
| `scripts/research.py` | Research + writing agent (Claude), Notion push |
| `scripts/publish.py` | Approval → audio → upload → RSS → status update |
| `scripts/notion_push.py` | Notion helpers |
| `feed.xml` | The live podcast RSS feed |
| `music/`, `cover.png` | Intro/outro music and cover art |

Needs `ANTHROPIC_API_KEY`, a Notion integration token, an ElevenLabs key, and a GitHub token, all from environment variables.

## Why it's interesting

The pattern carries over to any recurring content job: **AI does the research and the first draft, a person approves in a tool they already use (Notion), and the publishing is automated.** The approval gate is the important part.
