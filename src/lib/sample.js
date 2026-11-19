/**
 * Curated example resume + JD for the "See a demo" button.
 * Deliberately a candidate with genuinely relevant experience that the
 * resume UNDER-SELLS — buried LLM-API and streaming work, missing JD
 * vocabulary, metrics in the wrong places — so honest tailoring has real
 * credit to earn (visible score movement) while the keyword-gaps panel
 * still surfaces the true gaps (RAG, FastAPI, vector DBs, evals).
 */
export const SAMPLE_RESUME = `Riya Sharma — Full-Stack Developer

Summary: Front-end leaning full-stack engineer with 2 years of React experience. Built and shipped two MERN apps in production. Interested in moving into AI-powered product work.

Skills: JavaScript, TypeScript, React, Redux, Node.js, Express, MongoDB, Tailwind CSS, REST APIs, Git, Jest.

Experience — Frontend Engineer, Brightcart (Jan 2024 – present):
• Built and shipped a product-listing page for 50k SKUs with infinite scroll and faceted filters in React.
• Added a live order-status widget that pushes updates to the browser using server-sent events, rendering new data as it arrives.
• Migrated the checkout flow from class components to hooks; reduced bundle size 18% and Lighthouse perf score rose from 64 to 82.
• Owned the design-system rollout: introduced design tokens and a shared Button/Card library used by 7 product squads.
• Wrote Jest + React Testing Library coverage for the cart and checkout flows; raised line coverage from 12% to 71%.

Projects:
• Recipe helper chatbot (side project) — a React app that calls the OpenAI API with reusable prompt templates and checks the JSON replies against a schema before rendering; handles malformed responses gracefully. github.com/example/recipe-chat.
• Personal-finance dashboard — React + Node + MongoDB. Charts (Recharts), monthly budget tracking, REST API. github.com/example/finance.

Education: B.E. Computer Science, BMS College of Engineering (2018–2022).`;

export const SAMPLE_JD = `AI Application Engineer — Series A startup, remote (India-friendly)

About: We are building an AI assistant that helps support teams resolve customer tickets 3× faster. Live with 12 enterprise customers; growing fast.

We are hiring an AI Application Engineer to ship LLM-powered product features end to end. You will:

• Design and ship streaming chat UIs in React + TypeScript that handle SSE responses and partial JSON gracefully.
• Build FastAPI / Node endpoints that orchestrate prompt templates, tool-use, and RAG retrieval over customer docs.
• Improve answer quality via prompt engineering, evaluation harnesses, and grounding strategies. We rerun evals nightly.
• Own features from spec to deployment — small team, no QA hand-off, you ship.

Requirements:
• 1–3 years of full-stack experience (React + Python or React + Node).
• Hands-on with at least one LLM API (OpenAI, Anthropic, Groq).
• Comfortable with prompt engineering, structured-output design, and JSON-schema validation.
• Strong TypeScript + React fundamentals. You will write a lot of streaming UI.
• Bonus: vector DB experience (pgvector, FAISS, Qdrant), evals tooling, prior AI startup experience.

Nice to have: open-source contributions, public technical writing, prior fintech or support-tooling domain experience.`;
