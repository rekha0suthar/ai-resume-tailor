# AI Resume Tailor

Paste (or upload) a resume + a job description, get back **streaming** tailored bullet rewrites, ATS keyword gaps, and likely interview questions. Built end-to-end on free tools — Vite + React + Tailwind on the front, a Vercel Serverless Function calling Groq's Llama 3.3 70B on the back.

🔗 **Live**: [ai-resume-tailor-ruby.vercel.app](https://ai-resume-tailor-ruby.vercel.app/)

---

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
Browser              Vercel Edge                 Groq Cloud
-------              -----------                 ----------
React UI ─ POST /api/tailor ─▶  api/tailor.js  ──▶  Llama 3.3 70B
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
- **Groq Cloud** — Llama 3.3 70B (`llama-3.3-70b-versatile`) in JSON mode, streaming.
- **lucide-react** icons, **framer-motion** animations, **react-hot-toast** notifications.
- **zod** for response schema validation, **partial-json** for incremental parsing.

## Folder layout

```
api/
  tailor.js                ← Streaming SSE endpoint
src/
  components/
    Hero.jsx
    TailorForm.jsx
    PdfUpload.jsx
    ResultsPanel.jsx
    Footer.jsx
  hooks/
    useTailor.js           ← Streaming state machine
  lib/
    prompts.js             ← System prompt + bounds
    schema.js              ← Zod schema + partial validator
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

## Deploy

Connect the repo to Vercel, add `GROQ_API_KEY` under Environment Variables, deploy. Every `git push origin main` triggers a fresh deploy.

## Roadmap

- [x] **v0** — Paste-in form, structured JSON response, three result panels.
- [x] **v1** — Streaming SSE, PDF upload, try-with-sample, inline-edit, toast + animations.
- [ ] **v2** — Template-based resume generation. Pick a template, get a fully formatted resume from your content + the AI's suggestions, download as PDF.
- [ ] **v3** — Multi-JD comparison (paste 3 JDs, see which one fits best).

Build notes for each version are published on [dev.to/rekha0suthar](https://dev.to/rekha0suthar).

## License

MIT.
