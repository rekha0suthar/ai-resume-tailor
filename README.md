# AI Resume Tailor

[![CI](https://github.com/rekha0suthar/ai-resume-tailor/actions/workflows/ci.yml/badge.svg)](https://github.com/rekha0suthar/ai-resume-tailor/actions/workflows/ci.yml)

Paste (or upload) a resume + a job description, and watch a **complete tailored resume** stream onto a real document sheet — scored **before and after** against the JD on a fixed rubric, refinable through chat (whole-resume or one section at a time), and downloadable as a PDF in one of four templates. Keyword gap analysis, rewrite rationale, and interview prep ride along as secondary panels. Built end-to-end on free tools — Vite + React + Tailwind on the front, a Vercel Serverless Function calling Groq's gpt-oss-120b on the back.

🔗 **Live**: [ai-resume-tailor-ruby.vercel.app](https://ai-resume-tailor-ruby.vercel.app/)

![Demo: tailoring a resume — live streaming, before/after match score, templates](docs/demo.gif)

---

## The flow

1. **Input stage** — paste your resume (or upload a PDF) and the job description. "See a demo" pre-fills both with a curated example.
2. **Results stage** — a score strip shows `original → tailored` with a delta badge, so the improvement is evident (both scores come from the same explicit rubric: required-skills coverage 40%, relevant experience 30%, keyword alignment 20%, evidence/metrics 10%). Below it, the hero: the tailored resume on a paper sheet (template tabs + **Download PDF** as the primary action) with the refinement chat docked beside it. A badge next to the template tabs shows the true page count of the downloadable PDF (rendered quietly in the background): "PDF: 1 page" on target, or "PDF: N pages" with a nudge toward "Fit to one page" or the Compact template.
3. **Refine** — type an instruction, tap a section chip, or hover a section heading on the sheet and click the pencil to target just that section ("In the Experience section: …"). Sections can be reordered/moved/merged by asking ("Move Education to the bottom" — the "Reorder sections…" chip prefills it). Every refinement streams into the preview and returns a fresh score against the *same* JD, appended to the score history.
4. **Secondary panels** (collapsible, below the hero): Keyword gaps, What changed & why, and Interview prep — in that order, least urgent last.

"Edit inputs" returns to the input stage without losing results; "Start over" clears everything.

## Post-v5 polish (user-testing round)

- **Links no longer vanish** (user-found bug): the markdown parser preserved `[text](url)` links only as text, so portfolio/GitHub/project links disappeared from the preview and the PDF. Links now survive as structured tokens, render as real `<a href>` on the sheet (bare `https://…`/`www.…` URLs too), stay clickable in the saved PDF, and both prompts demand every original URL be kept verbatim.
- **One-page support**: the tailor prompt targets ~450–550 words unless the original is clearly senior/long (tightening bullets, never dropping real entries); a badge reports the actual page count of the downloadable PDF — it re-checks after refinements and template switches, since page counts differ per template.
- **Direct PDF download** (asked for twice in user testing): "Download PDF" now saves `<Name> - Resume.pdf` straight to disk — no OS print dialog. [@react-pdf/renderer](https://www.npmjs.com/package/@react-pdf/renderer) renders the *same parsed structure* as the on-screen sheet through per-template PDF styles (Classic → Times, the rest → Helvetica, matching margins/accents), so text stays selectable and ATS-readable and every link stays clickable. The engine loads lazily on first click (its own chunk — the main bundle doesn't grow), and a quiet "Print…" button keeps the old print-portal path for paper.
- **Section reordering via chat**: the refine prompt's structure-preservation rule now yields to explicit reorder/move/merge/remove requests; a "Reorder sections…" chip prefills the instruction.
- **Design tokens**: app-shell colors consolidated into `accent` / `surface-1..3` / `success|warn|error` tokens in `tailwind.config.js` (the four resume templates keep their own document palettes).
- **Honest expectations**: a quiet line under the score strip notes that honest tailoring typically gains 5–15 points and a low ceiling means a skills gap.
- **Privacy**: in-app note + the [Privacy](#privacy) section below, backed by an audit of every `api/` path.

## What v5 adds over v4

- **Before → after scoring, computed not vibed.** One score per run used to be a single eyeballed 0–100 number, so a cosmetic edit could swing it by 30 points. Scores are now **component-based**: the model scores four rubric components separately (required skills /40, relevant experience /30, keyword alignment /20, evidence & metrics /10) and the total is their sum — if the model's claimed total disagrees with a valid breakdown, the sum wins. Refinements carry the previous breakdown and may only adjust components their edit plausibly touched, so small edits move the score by small amounts (verified: a summary condensation now moves it by 0). Click the score to see the full breakdown, original vs current.
- **Word-number guard.** A live run once emitted `"overall_match_score": thirty`. Scores are now coerced (numeric strings, English word-numbers 0–100) and degrade to "not scored" instead of blanking the card; the legacy `overall_match_score` key is still accepted as an alias.
- **Resume-first information architecture.** The sheet + PDF download is the hero; bullets/keywords/questions moved into collapsible panels below, interview prep last. Per-section refinement via chips and on-sheet pencil affordances. Two-view shell (focused input card ↔ results workspace), honest rate-limit and error cards, skeleton/shimmer streaming states, reduced-motion support.

## What v4 adds over v3

- **Resume templates + PDF export.** The tailored resume renders as a real document on a white A4-style sheet, in one of four templates — Classic (serif, centered, small-caps), Modern (sans, muted-teal accents), Compact (tight one-pager), Minimal (airy, no rules) — picked via a chip row and remembered in localStorage. "Download PDF" prints just the sheet through the browser's print dialog with per-template page margins and page-break rules, no PDF library needed.

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

Full request flow, key decisions (SSE-over-POST, prompt-enforced JSON and
the 1-delta discovery, dual rubric scores, `parseResume` as single source of
truth, lazy PDF chunk, rate-limiting tradeoff, privacy posture) are in
**[ARCHITECTURE.md](ARCHITECTURE.md)**. The short version:

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

## Privacy

Your resume is processed in memory and sent only to Groq's API for AI processing. It is never stored, logged, or used for anything else by this app. State lives in your browser tab.

Specifically (verified against the code in `api/`):

- No database, no file writes, no analytics — the serverless functions hold the request only in memory while streaming the response.
- Server logs never contain resume or job-description content; the only `console.error` calls log error objects on upstream failures.
- The browser's `localStorage` holds just one preference (the chosen template) — never your text. Closing the tab discards everything else. PDF generation happens entirely in your browser.
- Content sent to Groq is subject to [Groq's privacy policy](https://groq.com/privacy-policy/); this app adds no storage of its own.

## Stack

- **React 18 + Vite** — modern build chain, instant HMR.
- **Tailwind CSS** — zero-runtime styling.
- **Vercel Serverless Functions** — same repo as the frontend.
- **Groq Cloud** — gpt-oss-120b (`openai/gpt-oss-120b`), streaming, prompt-enforced JSON.
- **lucide-react** icons, **framer-motion** animations, **react-hot-toast** notifications.
- **zod** for response schema validation, **partial-json** for incremental parsing.
- **@react-pdf/renderer** (lazy-loaded) — client-side PDF generation for the direct download; standard PDF fonts, so no font files ship.

## Folder layout

```
api/
  tailor.js                ← Streaming SSE endpoint (resume + JD → results)
  refine.js                ← Streaming SSE endpoint (chat refinement)
  _lib/
    ratelimit.js           ← Shared in-memory rate limiter (not a function)
    groqError.js           ← Quota vs generic upstream-error classifier
src/
  components/
    Navbar.jsx
    Hero.jsx
    HowItWorks.jsx
    TailorForm.jsx
    PdfUpload.jsx
    ResultsPanel.jsx       ← Results IA: score strip, hero, collapsibles
    ScoreStrip.jsx         ← Before → after score + delta + history
    ResumePreview.jsx      ← Templated resume sheet (preview + print)
    ChatRefine.jsx         ← Docked chat: section chips, prefill, undo
    Footer.jsx
  pdf/
    ResumePdf.jsx          ← @react-pdf Document (lazy chunk, direct download)
    pdfStyles.js           ← Pure template→PDF style mapping (unit-tested)
  hooks/
    useTailor.js           ← Streaming state machine (tailor)
    useRefine.js           ← Chat session: history, versions, score trail
    usePdfPageCount.js     ← True PDF page count (lazy, debounced, raced-safe)
  lib/
    prompts.js             ← System prompts + shared scoring rubric + bounds
    schema.js              ← Zod schemas + partial validators
    scores.js              ← Score coercion (word-number guard, pure)
    history.js             ← Chat-history clamping (shared client/server)
    resumeParser.js        ← Resume markdown → structure (pure, tested)
    pdfPageCount.js        ← PDF page count from raw bytes (pure, tested)
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

Run the 141 unit tests (resume parsing, schema validation, score coercion,
SSE frame parsing, fence stripping, history clamping, PDF style mapping and
WinAnsi text folding, PDF page counting, quota-error classification) and the
linter with:

```bash
npm test
npm run lint
```

## Deploy

Connect the repo to Vercel, add `GROQ_API_KEY` under Environment Variables, deploy. Optionally set `GROQ_MODEL` to swap models without a code change (defaults to `openai/gpt-oss-120b`).

### Deployment (CI-gated)

Vercel's **production branch should be set to `release`**, not `main` (Vercel project → Settings → Git → Production Branch). CI runs lint + tests + build on every push to `main`, and only when that job is green does the `promote` job fast-forward `release` to the same commit (`git push origin HEAD:release`) — so broken code never deploys. Pushes to `main` with failing tests simply never reach production.

## Known limitations & next steps

- **Rate limiting is best-effort.** The limiter in `api/_lib/ratelimit.js` is an in-memory sliding window, so it's per serverless instance — a cold start resets the count. Enough to stop casual abuse of a free demo; a shared store (e.g. Upstash Redis + `@upstash/ratelimit`) is the production answer.
- **No auth or accounts.** Everything is anonymous and stateless; nothing you paste is stored.
- **Model availability shifts.** Groq rotates hosted models; when the default is deprecated, set the `GROQ_MODEL` env var instead of redeploying code.
- **Free-tier quota can run out.** When Groq's rate limit/quota is exhausted upstream, the UI says so honestly ("free AI quota … temporarily exhausted") instead of a generic failure.

## Roadmap

- [x] **v0** — Paste-in form, structured JSON response, three result panels.
- [x] **v1** — Streaming SSE, PDF upload, try-with-sample, inline-edit, toast + animations.
- [x] **v2** — Full tailored resume as a fifth streamed output, with copy-markdown + download-.md actions.
- [x] **v3** — Chat refinement of the tailored resume: streaming edits, quick actions, history-aware follow-ups, revert.
- [x] **v4** — Template-based formatting: pick one of four templates, download the tailored resume as PDF (print stylesheet, zero new dependencies).
- [x] **v5** — Before→after scoring on a fixed rubric, resume-first redesign (score strip, docked chat, per-section refinement, collapsible secondary panels, two-view shell).
- [ ] **v6** — Multi-JD comparison (paste 3 JDs, see which one fits best).

Build notes for each version are published on [dev.to/rekha0suthar](https://dev.to/rekha0suthar).

## License

MIT.
