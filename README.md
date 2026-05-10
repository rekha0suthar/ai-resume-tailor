# AI Resume Tailor

Paste a resume + a job description, get back tailored bullet rewrites, ATS keyword gaps, and likely interview questions. Built end-to-end on free tools — Vite + React + Tailwind on the front, a Vercel Serverless Function calling Groq's Llama 3.3 70B on the back.

> **Why this exists.** The resume tailoring task is the same prompt-engineering, structured-output, "talk to an LLM and render the response" pattern that AI app companies hire for every day. This is the canonical "AI Application Engineer" portfolio piece.

**Stack**

- React 18 + Vite + Tailwind CSS
- Vercel Serverless Functions (Node 18)
- Groq Cloud — Llama 3.3 70B (`llama-3.3-70b-versatile`), JSON-mode output

**Architecture**

```
Browser              Vercel Edge                 Groq Cloud
-------              -----------                 ----------
React UI  ─POST/api/tailor─▶  api/tailor.js  ──▶  Llama 3.3 70B
                                                 (JSON response)
       ◀──────── tailored JSON ──────────────────────┘
```

The `GROQ_API_KEY` lives only in Vercel's environment variables — it never reaches the browser.

---

## Run it locally

You'll need [Node 18+](https://nodejs.org/) and a free [Groq API key](https://console.groq.com/keys).

```bash
git clone https://github.com/rekha0suthar/ai-resume-tailor.git
cd ai-resume-tailor
npm install
cp .env.example .env
# paste your GROQ_API_KEY into .env
```

Then run with the Vercel CLI so the `/api/tailor` function works locally:

```bash
npm install -g vercel
vercel dev
```

Open `http://localhost:3000`.

> If you only want to render the UI (no API calls), `npm run dev` runs Vite alone on port 5173 — but the form submit will fail because there's no API.

---

## Deploy to Vercel (free tier)

**One-time setup:**

1. **Get a Groq API key** — sign up at [console.groq.com](https://console.groq.com/), go to *API Keys*, create a new key, copy it.
2. **Create the GitHub repo** — push this code to `https://github.com/rekha0suthar/ai-resume-tailor`.
3. **Sign up at Vercel** — [vercel.com](https://vercel.com/), connect your GitHub.
4. **Import the project** — Vercel detects it as a Vite app automatically.
5. **Add the env var** — *Settings → Environment Variables* → add `GROQ_API_KEY` with the key from step 1, scope to *Production, Preview, Development*.
6. **Deploy.** Vercel gives you a URL like `https://ai-resume-tailor.vercel.app`.

After every `git push origin main`, Vercel redeploys automatically.

---

## What the API returns

`POST /api/tailor` with body:

```json
{
  "resumeText": "…",
  "jobDescription": "…"
}
```

Returns:

```json
{
  "overall_match_score": 62,
  "tailored_bullets": [
    {
      "original": "Built grocery web app with React and MongoDB.",
      "rewrite": "Shipped a MERN e-commerce app with role-based dashboards (React, Redux, Express, MongoDB), implementing JWT auth, cart/checkout flows, and admin tooling.",
      "why": "Foregrounds the MERN keyword + role-based access mentioned in the JD."
    }
  ],
  "missing_keywords": [
    {
      "keyword": "TypeScript",
      "importance": "must-have",
      "suggestion": "Convert one existing project to TS — even a 2-day refactor counts."
    }
  ],
  "interview_questions": [
    {
      "question": "Walk me through how you handled authorization in your grocery app.",
      "what_they_want": "How you reason about server vs client trust boundaries.",
      "prep_tip": "Have a 90-second answer covering JWT, middleware, and the lesson learned about UI guards being UX, not security."
    }
  ]
}
```

---

## Roadmap

- [x] **v0** — Paste-in form, structured JSON response, three result panels.
- [ ] **v1** — Streaming responses (SSE) so output appears live.
- [ ] **v2** — PDF upload (extract text via pdfjs).
- [ ] **v3** — History (localStorage), shareable result links.
- [ ] **v4** — Multiple JD comparison (paste 3 JDs, see which fits best).

Build notes are published in the [portfolio's Writing section](https://rekha-suthar-portfolio.netlify.app/#writing).

---

## License

MIT. Use it, fork it, ship your own version.
