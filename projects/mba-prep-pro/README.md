# MBA Prep Pro

> **Status: live product (beta).** The most complete project in this repo: auth, payments, admin, and a real AI pipeline.

AI mock interviews for MBA applicants. A candidate uploads their resume, picks target schools, and does a **live voice interview** with an AI interviewer that knows the school and their background. Afterward they get a scored evaluation with specific things to fix.

## How it works

1. **Onboarding:** resume upload is parsed into a structured profile (`process-resume`). School materials are processed into interviewer context (`process-school-materials`).
2. **Live interview:** browser ↔ OpenAI Realtime voice session (`realtime-session`), with a school-specific interviewer persona, the candidate's profile, and a question bank. There's also a text-chat mode (`chat-completion`) and text-to-speech (`text-to-speech`).
3. **Evaluation:** the transcript is graded on three dimensions (**Substance, Structure, Presence**) with a checklist plus a quality bonus per dimension, justifications for every point, and a short list of "top opportunities" (`evaluate-interview`).
4. **Reports:** session history, scores over time, and per-question feedback.
5. **Business layer:** Stripe checkout with three tiers plus add-ons (`create-payment`, `verify-payment`), usage limits enforced in Postgres functions, a beta tier, a waitlist, and an admin panel.

## Stack

- **Frontend:** React + TypeScript + Vite, Tailwind, shadcn/ui. Started in Lovable, then developed with Claude Code.
- **Backend:** Supabase (Postgres + row-level security, storage buckets, auth) and Deno edge functions in `supabase/functions/`.
- **AI:** OpenAI Realtime (voice interview), GPT-4.1 (grading), GPT-4o-mini (resume parsing, chat), Whisper, TTS, and Gemini Flash (school materials).
- **Payments:** Stripe.

## Where to look

| Path | What's there |
|---|---|
| `supabase/functions/evaluate-interview/` | The grading rubric and prompt: the most interesting single file |
| `supabase/functions/realtime-session/` | How the live interviewer is configured |
| `supabase/migrations/` | Data model: profiles, schools, sessions, tiers, usage limits |
| `src/pages/MockInterview.tsx` | The interview experience |
| `src/pages/admin/` | Admin tools |

## Note on this copy

This is a snapshot for reading. Project IDs, keys, and Stripe price IDs are replaced with placeholders (`YOUR_SUPABASE_PROJECT_REF`, `YOUR_SUPABASE_ANON_KEY`, `price_REPLACE_ME`), so it won't connect to the live backend as-is.
