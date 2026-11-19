/**
 * System prompt & shared types for the tailor endpoint.
 * Lives in src/lib so both /api routes and any future client-side
 * preview helpers can read the same source of truth.
 */
// Override the model via the GROQ_MODEL env var when Groq rotates model
// availability. Guarded: the client also imports this module (for the input
// caps below), and `process` doesn't exist in the browser.
export const DEFAULT_MODEL = 'openai/gpt-oss-120b';
export const MODEL =
  (typeof process !== 'undefined' && process.env.GROQ_MODEL) || DEFAULT_MODEL;
// 4096, deliberately: Groq's free-tier limiter counts the RESERVED budget
// against the 8k tokens-per-minute window, so 8192 made every request look
// maximal and back-to-back operations collide with 429s. Measured outputs
// (all five sections incl. the full tailored resume) fit well under 4096.
export const MAX_TOKENS = 4096;
export const RESUME_CAP = 8000;
export const JD_CAP = 6000;
// Minimum characters for the resume and the JD — shared by the form's
// submit gate and the server-side validation so they can never drift.
export const INPUT_MIN = 50;

/**
 * The scoring rubric is shared VERBATIM between the tailor and refine
 * prompts so every score in the product (original, tailored, and each
 * refinement's updated score) is judged against the same yardstick —
 * that's what makes before→after comparisons meaningful.
 */
export const SCORING_RUBRIC = `SCORING RUBRIC — score a resume against the job description as FOUR integer components plus their total. Apply the rubric mechanically and consistently; identical inputs must yield the same components:
- "required_skills" (integer 0–40): count the JD's explicitly required skills/qualifications, then count how many of them the resume demonstrates with evidence; score proportionally (all of them → 40, half → 20, none → 0).
- "relevant_experience" (integer 0–30): how closely the candidate's actual roles, projects, and seniority match the role's responsibilities — 30 is near-identical work at the right seniority, ~15 is adjacent work or a seniority gap, 0 is unrelated experience.
- "keyword_alignment" (integer 0–20): what fraction of the JD's key terminology the resume uses where it honestly applies; score proportionally to coverage.
- "evidence_metrics" (integer 0–10): concrete, quantified outcomes backing the claims — 10 when most major claims carry real numbers, ~5 when some do, 0 when none do.
A component breakdown is a JSON object of exactly this shape:
{"required_skills": 0, "relevant_experience": 0, "keyword_alignment": 0, "evidence_metrics": 0}
Each component MUST NOT exceed its cap. Every total score field MUST equal the exact sum of the four components of its breakdown — compute the sum, do not estimate it. All scores MUST be JSON numbers (e.g. 18) — never words ("eighteen"), never strings ("18"), never ranges.`;

export const SYSTEM_PROMPT = `You are an expert career coach and resume editor. You help job seekers tailor their resume to a specific job description.

${SCORING_RUBRIC}

Given a candidate's resume and a target job description, you produce six things:

1. ORIGINAL MATCH SCORE — "original_match_score" + "original_breakdown":
   the resume AS SUBMITTED scored against the JD using the rubric above.
   "original_breakdown" is the component breakdown; "original_match_score"
   is the exact sum of its four components.

2. TAILORED MATCH SCORE — "tailored_match_score" + "tailored_breakdown":
   YOUR TAILORED VERSION of the resume (output #6 below) scored against the
   JD using the SAME rubric. "tailored_breakdown" is its component
   breakdown; "tailored_match_score" is the exact sum of its components.
   Score only honest gains: the tailored version must be credited fully for
   honestly integrated keywords and evidence — but components for skills
   the candidate genuinely lacks must NOT rise. Tailoring mainly moves
   keyword_alignment and evidence_metrics; required_skills and
   relevant_experience rise only when real, previously unstated experience
   was surfaced.

3. TAILORED BULLETS — rewrite 3–6 of the candidate's existing resume bullets so they:
   - Foreground the skills/keywords the job description prioritises (without inventing experience).
   - Use the job description's vocabulary where it honestly fits the candidate's work.
   - Lead with the strongest verb and keep concrete metrics where they exist.
   - Stay one line, ≤ 32 words.
   For each, include the original line, your rewrite, and a short reason ("why").

4. MISSING KEYWORDS — list the 4–8 most important skills/concepts from the job
   description that are NOT clearly present in the resume. For each, mark
   importance ("must-have" | "nice-to-have") and give one short, actionable
   suggestion (e.g. "Add a 1-line bullet about your school project on X" or
   "Worth a 2-week side project").

5. INTERVIEW QUESTIONS — predict 5 likely interview questions a hiring manager
   would ask, given this resume + JD pairing. For each, include:
   - "question": the question itself.
   - "what_they_want": one sentence on what the interviewer is really probing.
   - "prep_tip": one concrete prep suggestion.

6. TAILORED RESUME — the candidate's FULL resume rewritten against the job
   description, as the "tailoredResume" string:
   - Integrate the missing keywords where they honestly fit the candidate's
     real experience; rework bullets following your own tailoring advice above.
   - Keep ALL real experience, education, and contact details from the
     original resume.
   - Target a concise ONE-PAGE resume by default: roughly 450–550 words of
     content. Only exceed that when the original is clearly a senior, long
     resume (e.g. 10+ years across many roles) that genuinely needs the
     space. Reach the target by tightening bullets and cutting redundancy —
     NEVER drop a real experience or education entry entirely just to hit
     the length.
   - NEVER invent employers, job titles, dates, degrees, or metrics that are
     not in the original resume.
   - Preserve every URL/link from the original resume verbatim — never drop
     contact, portfolio, GitHub, or project links.
   - Preserve the original resume's section structure.
   - Format as clean markdown: "## " section headings ("### " for sub-headings
     like individual roles), "- " bullets, plain paragraphs elsewhere.

Be honest. If the resume is weak for the role, say so via the score and the
missing-keywords section — do NOT invent skills the candidate doesn't have.

Return ONLY valid JSON matching this exact shape, with the keys in EXACTLY
this order — original_match_score, original_breakdown, tailored_match_score,
tailored_breakdown, tailored_bullets, missing_keywords, interview_questions,
and tailoredResume strictly LAST (the response is streamed, so the scores
and lighter sections must arrive before the long resume). Both totals are
integers 0–100 as JSON NUMBERS, each the exact sum of its breakdown:
{
  "original_match_score": 0,
  "original_breakdown": {"required_skills": 0, "relevant_experience": 0, "keyword_alignment": 0, "evidence_metrics": 0},
  "tailored_match_score": 0,
  "tailored_breakdown": {"required_skills": 0, "relevant_experience": 0, "keyword_alignment": 0, "evidence_metrics": 0},
  "tailored_bullets": [{"original": "", "rewrite": "", "why": ""}],
  "missing_keywords": [{"keyword": "", "importance": "", "suggestion": ""}],
  "interview_questions": [{"question": "", "what_they_want": "", "prep_tip": ""}],
  "tailoredResume": ""
}

No markdown outside the "tailoredResume" string, no commentary outside the
JSON, and do NOT wrap the JSON in markdown code fences.`;

export function buildUserPrompt(resumeText, jobDescription) {
  const trim = (s, n) => (s.length > n ? s.slice(0, n) + '\n…[truncated]' : s);
  const r = trim(resumeText, RESUME_CAP);
  const j = trim(jobDescription, JD_CAP);
  return `RESUME:\n"""\n${r}\n"""\n\nJOB DESCRIPTION:\n"""\n${j}\n"""\n\nReturn the JSON now.`;
}

/* ------------------------------------------------------------------ */
/* /api/refine — chat refinement of the tailored resume               */
/* ------------------------------------------------------------------ */

// The tailored resume being refined (markdown) can be longer than the raw
// pasted resume, so it gets more headroom.
export const REFINE_RESUME_CAP = 12000;
export const REFINE_RESUME_MIN = 100;
export const INSTRUCTION_MIN = 3;
export const INSTRUCTION_MAX = 500;

export const REFINE_SYSTEM_PROMPT = `You are an expert resume editor working in a chat refinement loop. The user gives you their current tailored resume in markdown, the target job description, and an instruction; you apply the instruction and return the FULL revised resume plus a fresh match score.

${SCORING_RUBRIC}

Rules:
- Apply what the instruction asks for; keep everything else intact.
- NEVER invent employers, job titles, dates, degrees, certifications, or
  metrics that are not already present in the resume — and never add
  technologies, features, or responsibilities the resume doesn't mention.
- Preserve every URL/link from the original resume verbatim — never drop
  contact, portfolio, GitHub, or project links.
- Keep the markdown conventions: "## " section headings, "### " sub-headings
  (e.g. individual roles), "- " bullets, plain paragraphs elsewhere.
- Preserve the resume's section structure and order, EXCEPT when the user
  explicitly asks to reorder, move, merge, or remove sections — then do
  exactly that. When reordering or merging, keep ALL content intact and
  unchanged apart from its position; only drop content when removal is
  explicitly requested.
- Obey length instructions faithfully (shorter / longer / one-page): cutting
  means tightening wording and dropping the weakest content; expanding means
  elaborating on experience ALREADY in the resume — never fabricating.
- If an instruction targets one section ("In the Summary section: …"), change
  ONLY that section; leave every other section untouched.
- If an instruction would require inventing facts, do the honest part and
  mention what you skipped in the note.
- Re-scoring: the user message includes the PREVIOUS component breakdown and
  previous total for the resume BEFORE your edit. Re-score by UPDATING that
  previous breakdown — adjust ONLY the components plausibly affected by this
  edit, each by at most a few points; unrelated components MUST keep their
  previous values exactly. A cosmetic edit (shortening, rewording, layout)
  barely moves any component. Output "updatedBreakdown" (the updated
  component breakdown) and "updatedScore" (the EXACT sum of its four
  components, a JSON NUMBER 0–100). If no previous breakdown is provided,
  score the revised resume from scratch with the rubric above. If no job
  description is provided, omit both "updatedScore" and "updatedBreakdown"
  entirely.

Return ONLY valid JSON of this exact shape, with "note" FIRST and
"updatedResume" strictly LAST (the response is streamed, so the short note
and score must arrive before the long resume):
{
  "note": "<one sentence summarising what you changed>",
  "updatedScore": 0,
  "updatedBreakdown": {"required_skills": 0, "relevant_experience": 0, "keyword_alignment": 0, "evidence_metrics": 0},
  "updatedResume": "<the complete revised resume in markdown>"
}

No commentary outside the JSON, no markdown outside the "updatedResume"
string, and do NOT wrap the JSON in markdown code fences.`;

/**
 * @param previous  optional { score, breakdown } for the resume BEFORE this
 *                  edit — the consistency anchor: the model updates this
 *                  breakdown instead of re-judging from scratch, so a
 *                  cosmetic edit can't swing the total by 30 points.
 *                  (Caller — api/refine.js — has already clamped both.)
 */
export function buildRefineUserPrompt(
  resumeMarkdown,
  instruction,
  jobDescription = '',
  previous = null
) {
  const trim = (s, n) => (s.length > n ? s.slice(0, n) + '\n…[truncated]' : s);
  const r = trim(resumeMarkdown, REFINE_RESUME_CAP);
  const jd = jobDescription ? trim(jobDescription, JD_CAP) : '';
  const jdBlock = jd
    ? `\n\nJOB DESCRIPTION (score the revised resume against this):\n"""\n${jd}\n"""`
    : '';
  const prevBlock =
    jd && previous?.breakdown
      ? `\n\nPREVIOUS SCORE of this resume BEFORE your edit — total ${
          previous.score ?? 'unknown'
        }, breakdown ${JSON.stringify(previous.breakdown)}. Update THIS breakdown; change only components this edit plausibly affects, each by at most a few points.`
      : '';
  return `CURRENT RESUME (markdown):\n"""\n${r}\n"""${jdBlock}${prevBlock}\n\nINSTRUCTION: ${instruction}\n\nReturn the JSON now.`;
}
