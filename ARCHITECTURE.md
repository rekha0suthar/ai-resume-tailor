# Architecture

## Request flow

```
┌─────────────────────────────── Browser (React SPA) ───────────────────────────────┐
│                                                                                    │
│  TailorForm ──POST /api/tailor──▶ Vercel fn api/tailor.js ──stream──▶ Groq         │
│   (resume + JD)                    · rate limit (in-memory)          gpt-oss-120b  │
│                                    · validate + cap inputs                         │
│       ◀───────── SSE: event:chunk {text} ····· event:done ──────────┘              │
│                                                                                    │
│  useTailor: accumulate chunks ─▶ stripJsonFences ─▶ partial-json parse             │
│             ─▶ tolerant Zod (partialValidate) ─▶ progressive UI                    │
│                 ├─ ScoreStrip   (original → tailored, same rubric)                 │
│                 ├─ cards        (bullets / keyword gaps / interview qs)            │
│                 └─ tailoredResume markdown                                         │
│                        │                                                           │
│                        ▼                                                           │
│  ChatRefine ──POST /api/refine──▶ api/refine.js ──▶ Groq (note first,              │
│   (instruction + current resume     updatedScore, updatedResume last)              │
│    + JD + last 6 turns)                                                            │
│       ◀── same SSE protocol; useRefine commits versions + score trail ──┘          │
│                        │                                                           │
│                        ▼                                                           │
│  parseResume(markdown) ── single source of truth ──┬─▶ ResumePreview (web sheet,   │
│                                                    │    4 templates, print CSS)    │
│                                                    └─▶ ResumePdf (@react-pdf,      │
│                                                         lazy chunk, download)      │
└────────────────────────────────────────────────────────────────────────────────────┘
```

## Key decisions

**SSE-over-POST instead of EventSource or WebSockets.** `EventSource` only
does GET, and a resume + JD don't belong in a URL. WebSockets are
bidirectional machinery for a strictly one-way stream, and don't fit
serverless functions. A plain `fetch` POST whose response body is
`text/event-stream`, read via `ReadableStream`, gives streaming + request
bodies + `AbortController` cancellation with zero dependencies. The frame
parser (`src/lib/sse.js`) is ~25 lines and unit-tested.

**Prompt-enforced JSON instead of `response_format: json_object`.** Measured
on `openai/gpt-oss-120b` via Groq: with `json_object` the entire completion
arrives as **1** content delta at end-of-stream; without it, ~**100** deltas.
JSON mode killed the product's core feature (progressive rendering), so the
prompt enforces the JSON shape instead, and the client compensates for the
two failure modes that opens up: stray ```` ```json ```` fences
(`src/lib/fences.js` strips them, including partial trailing fences
mid-stream) and occasional word-numbers for scores (`src/lib/scores.js`
coerces `"thirty"` → 30, observed in a live run). Key order is prompt-pinned
so the scores and light cards stream before the long resume.

**Component-based computed scores instead of a single vibed number.** v≤4
returned one eyeballed 0–100 score, re-judged from scratch per call — a
cosmetic refinement once jumped +34 while the full tailoring pass earned
+16, which destroys trust in the number. Scores are now four capped rubric
components (required skills /40, relevant experience /30, keyword alignment
/20, evidence & metrics /10) emitted as explicit breakdowns; the total is
their **sum**, and when the model's claimed total disagrees with a valid
breakdown, the sum wins (`reconcileScore`). Refinements carry the previous
breakdown into the prompt and may only adjust components their edit
plausibly touched — measured result: a summary condensation now moves the
total by 0, and identical tailor reruns land within single digits. The
breakdown is user-visible (expandable score strip), so the number explains
itself.

**`parseResume` as the single source of truth.** The tailored markdown is
parsed once (`src/lib/resumeParser.js`, pure, unit-tested) into
`{name, contact, sections[]}`; the web preview, the print portal, and the
PDF document all render that one structure. A markdown-dialect bug gets
fixed in one place, and the downloaded PDF can't drift from the preview —
this is also what fixed the user-reported "links vanish from the PDF" bug.

**Lazy PDF chunk.** `@react-pdf/renderer` is ~1.2 MB minified. It's loaded
via dynamic `import()` on the first "Download PDF" click, so the main bundle
(~400 KB) doesn't pay for it; `pdfStyles.js` is kept import-free of
@react-pdf so `pdfFileName`/template mapping stay in the main chunk and
unit-testable in plain node. pdfjs (upload parsing) is lazy for the same
reason.

**In-memory rate limiting.** `api/_lib/ratelimit.js` is a sliding window in
a module-level Map — per warm serverless instance, reset on cold start. It
is deliberately best-effort: enough to stop casual abuse of a free-tier
demo with zero dependencies and zero stored data. The production path is a
shared store (Upstash Redis + `@upstash/ratelimit`).

**Privacy posture.** No database, no file writes, no analytics, no logging
of user content (only error objects on upstream failures). Resume/JD exist
in memory for the duration of the request and go only to Groq. The browser
persists exactly one `localStorage` key (chosen template). This is verified
against `api/` and stated in the README and in-app.

## Known tradeoffs

- **Rate limit is advisory** (see above) — a determined user can exceed it
  across instances/cold starts.
- **Prompt-enforced JSON can drift**: tolerant parsing + Zod `.catch()`
  defaults degrade gracefully (missing score → placeholder, short resume →
  hidden), but a badly malformed response yields partial results rather
  than a hard error.
- **Page count costs a background render**: the page badge reports the true
  page count by rendering the actual PDF off-screen (debounced ~800ms after
  content settles; stale renders discarded via a token) — truthful, but it
  spends a render per settle/template switch rather than estimating.
- **Score is an LLM judgment**, rubric-pinned for consistency but not
  deterministic; the UI sets expectations (honest gains ≈ 5–15 points).
- **`maxDuration: 30`** caps a tailor run; very long resumes near the input
  caps (8k/6k chars) still fit comfortably, but a slow upstream could
  truncate a stream — the client commits whatever parsed.
