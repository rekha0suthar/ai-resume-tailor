# AI Resume Tailor

[![CI](https://github.com/rekha0suthar/ai-resume-tailor/actions/workflows/ci.yml/badge.svg)](https://github.com/rekha0suthar/ai-resume-tailor/actions/workflows/ci.yml)

Paste (or upload) a resume + a job description, get back **streaming** tailored bullet rewrites, ATS keyword gaps, likely interview questions, a match score, and a **complete tailored resume rewrite** in markdown. Built end-to-end on free tools — Vite + React + Tailwind on the front, a Vercel Serverless Function calling Groq's gpt-oss-120b on the back.

🔗 **Live**: [ai-resume-tailor-ruby.vercel.app](https://ai-resume-tailor-ruby.vercel.app/)

<!-- TODO: demo GIF -->

---

## What v3 adds over v2

- **Chat refinement.** Once the tailored resume is generated, a chat panel lets you iterate on it conversationally — type an instruction (or tap a quick action like "Make it one page") and the updated resume streams live into the preview, with a one-sentence summary of what changed in the chat, the last 6 turns sent as context for follow-ups, and a Revert button backed by a 10-deep version history. Copy/download always act on the current version.
- **True progressive streaming.** Dropped Groq's `json_object` response format — on gpt-oss-120b it buffered the whole completion into a single end-of-stream delta (measured: 1 delta vs ~100 without it). JSON is now prompt-enforced, and the client strips stray ```` ```json ```` fences before its tolerant partial parse.

## What v2 adds over v1

- **Full tailored resume.** A fifth streamed output: the entire resume rewritten against the JD — missing keywords integrated where honest, bullets reworked per the tailoring advice, original section structure preserved, nothing invented (no fake employers, titles, dates, degrees, or metrics). The prompt orders it last in the JSON so the four lighter sections render first while the long resume is still generating.
- **Copy & download.** The resume card has "Copy markdown" (clipboard + toast) and "Download .md" (`tailored-resume.md`) actions.
- **Zero new dependencies.** The markdown (## headings, bullets, bold) is rendered by a ~60-line renderer, not a markdown library.

## What v1 adds over v0

- **Streaming output (SSE).** Bullets, keyword gaps, and interview questions appear in the UI as soon as each one is complete in the model's stream. Perceived speed bump is roughly 5–10× over the v0 wait-for-everything approach. The client uses [partial-json](https://www.npmjs.com/package/partial-json) to parse the accumulating buffer after every chunk.
- **PDF upload with client-side text extraction.** Drag & drop a PDF (or click). [pdfjs-dist](https://www.npmjs.com/package/pdfjs-dist) is dynamically imported so the initial bundle stays small. Scanned PDFs surface a clear error.
- **Try with sample.** One-click pre-fills both fields with a curated example resume + JD pairing. Lets recruiters test the demo in 3 seconds.
- **Inline edit + copy** on each tailored bullet. Tweak the rewrite before copying.
- **Zod schema** validates every model response. Drift in the JSON shape no longer crashes the UI.
- **react-hot-toast** for action feedback (copy, upload, error).
- **framer-motion** for smooth section/card transitions.
- **Skeleton loading** while the first tokens land.

## Architecture

```
Browser         Vercel serverless (Node)         Groq Cloud
-------         ------------------------         ----------
React UI ─ POST /api/tailor ─▶  api/tailor.js  ──▶  gpt-oss-120b
       (SSE chunks)                                  (stream=true)
      ◀──── event: chunk { text } ───────────────────┘
      ◀──── event: done  { ok: true }
```

- The `GROQ_API_KEY` lives only in Vercel's environment variables. It never reaches the browser.
- The serverless function streams `event: chunk` SSE messages as Groq generates tokens. The client appends to an accumulating buffer and reparses with `partial-json` on every chunk, so completed objects (bullet rewrites, missing keywords, etc.) appear progressively.

## Stack

- **React 18 + Vite** — modern build chain, instant HMR.
- **Tailwind CSS** — zero-runtime styling.
- **Vercel Serverless Functions** (Node 18) — same repo as the frontend.
- **Groq Cloud** — gpt-oss-120b (`openai/gpt-oss-120b`), streaming, prompt-enforced JSON.
- **lucide-react** icons, **framer-motion** animations, **react-hot-toast** notifications.
- **zod** for response schema validation, **partial-json** for incremental parsing.

## Folder layout

```
api/
  tailor.js                ← Streaming SSE endpoint (resume + JD → results)
  refine.js                ← Streaming SSE endpoint (chat refinement)
  _lib/
    ratelimit.js           ← Shared in-memory rate limiter (not a function)
src/
  components/
    Hero.jsx
    TailorForm.jsx
    PdfUpload.jsx
    ResultsPanel.jsx
    ChatRefine.jsx         ← Chat panel for iterating on the resume
    Footer.jsx
  hooks/
    useTailor.js           ← Streaming state machine (tailor)
    useRefine.js           ← Chat session: history, versions, streaming
  lib/
    prompts.js             ← System prompts + bounds
    schema.js              ← Zod schemas + partial validators
    history.js             ← Chat-history clamping (shared client/server)
    fences.js              ← ```json fence stripping for the accumulator
    sample.js              ← Curated demo data
  App.jsx
  main.jsx
  index.css
```

## Run locally

You'll need [Node 18+](https://nodejs.org/) and a free [Groq API key](https://console.groq.com/keys).

```bash
git clone https://github.com/rekha0suthar/ai-resume-tailor.git
cd ai-resume-tailor
npm install
cp .env.example .env       # paste your GROQ_API_KEY into .env
npm run dev
```

Open `http://localhost:5173`. The custom Vite plugin in `vite.config.js` routes `/api/*` through your serverless function files, so streaming works locally with no Vercel CLI needed.

Run the unit tests (schema validation + SSE frame parsing) with:

```bash
npm test
```

## Deploy

Connect the repo to Vercel, add `GROQ_API_KEY` under Environment Variables, deploy. Every `git push origin main` triggers a fresh deploy. Optionally set `GROQ_MODEL` to swap models without a code change (defaults to `openai/gpt-oss-120b`).

## Known limitations & next steps

- **Rate limiting is best-effort.** The limiter in `api/_lib/ratelimit.js` is an in-memory sliding window, so it's per serverless instance — a cold start resets the count. Enough to stop casual abuse of a free demo; a shared store (e.g. Upstash Redis + `@upstash/ratelimit`) is the production answer.
- **No auth or accounts.** Everything is anonymous and stateless; nothing you paste is stored.
- **Model availability shifts.** Groq rotates hosted models; when the default is deprecated, set the `GROQ_MODEL` env var instead of redeploying code.

## Roadmap

- [x] **v0** — Paste-in form, structured JSON response, three result panels.
- [x] **v1** — Streaming SSE, PDF upload, try-with-sample, inline-edit, toast + animations.
- [x] **v2** — Full tailored resume as a fifth streamed output, with copy-markdown + download-.md actions.
- [x] **v3** — Chat refinement of the tailored resume: streaming edits, quick actions, history-aware follow-ups, revert.
- [ ] **v4** — Template-based formatting: pick a template, download the tailored resume as PDF.
- [ ] **v5** — Multi-JD comparison (paste 3 JDs, see which one fits best).

Build notes for each version are published on [dev.to/rekha0suthar](https://dev.to/rekha0suthar).

## License

MIT.
