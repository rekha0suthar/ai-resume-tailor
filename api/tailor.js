/**
 * Vercel Serverless Function — POST /api/tailor
 *
 * Body: { resumeText: string, jobDescription: string }
 *
 * Calls Groq's Llama 3.3 70B with a prompt that asks for structured JSON:
 *   {
 *     tailored_bullets: [{ original, rewrite, why }],
 *     missing_keywords: [{ keyword, importance, suggestion }],
 *     interview_questions: [{ question, what_they_want, prep_tip }],
 *     overall_match_score: number  // 0–100
 *   }
 *
 * The Groq API key is read from process.env.GROQ_API_KEY (set in Vercel
 * dashboard → Settings → Environment Variables). It never reaches the browser.
 */
import Groq from 'groq-sdk';

const MODEL = 'llama-3.3-70b-versatile';
const MAX_TOKENS = 4096;

const SYSTEM_PROMPT = `You are an expert career coach and resume editor. You help job seekers tailor their resume to a specific job description.

Given a candidate's resume and a target job description, you produce three things:

1. TAILORED BULLETS — rewrite 3–6 of the candidate's existing resume bullets so they:
   - Foreground the skills/keywords the job description prioritises (without inventing experience).
   - Use the job description's vocabulary where it honestly fits the candidate's work.
   - Lead with the strongest verb and keep concrete metrics where they exist.
   - Stay one line, ≤ 32 words.
   For each, include the original line, your rewrite, and a short reason ("why").

2. MISSING KEYWORDS — list the 4–8 most important skills/concepts from the job
   description that are NOT clearly present in the resume. For each, mark
   importance ("must-have" | "nice-to-have") and give one short, actionable
   suggestion (e.g. "Add a 1-line bullet about your school project on X" or
   "Worth a 2-week side project").

3. INTERVIEW QUESTIONS — predict 5 likely interview questions a hiring manager
   would ask, given this resume + JD pairing. For each, include:
   - "question": the question itself.
   - "what_they_want": one sentence on what the interviewer is really probing.
   - "prep_tip": one concrete prep suggestion.

Also include "overall_match_score": an integer 0–100 reflecting how well this
candidate's resume currently aligns with the JD before tailoring.

Be honest. If the resume is weak for the role, say so via the score and the
missing-keywords section — do NOT invent skills the candidate doesn't have.

Return ONLY valid JSON matching this exact shape:
{
  "tailored_bullets": [{"original": "", "rewrite": "", "why": ""}],
  "missing_keywords": [{"keyword": "", "importance": "", "suggestion": ""}],
  "interview_questions": [{"question": "", "what_they_want": "", "prep_tip": ""}],
  "overall_match_score": 0
}

No markdown, no commentary outside the JSON.`;

export default async function handler(req, res) {
  // CORS — keep it simple for the v0; tighten for production.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error:
        'Server is missing GROQ_API_KEY. Set it in Vercel → Settings → Environment Variables.',
    });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON in request body.' });
    }
  }

  const resumeText = (body?.resumeText || '').trim();
  const jobDescription = (body?.jobDescription || '').trim();

  if (resumeText.length < 50) {
    return res.status(400).json({
      error: 'Resume looks too short — paste at least your summary + experience.',
    });
  }
  if (jobDescription.length < 50) {
    return res.status(400).json({
      error: 'Job description looks too short — paste the full posting.',
    });
  }

  // Hard cap on input size so we don't blow through the model context.
  const trim = (s, n) => (s.length > n ? s.slice(0, n) + '\n…[truncated]' : s);
  const resumeIn = trim(resumeText, 8000);
  const jdIn = trim(jobDescription, 6000);

  const userPrompt = `RESUME:\n"""\n${resumeIn}\n"""\n\nJOB DESCRIPTION:\n"""\n${jdIn}\n"""\n\nReturn the JSON now.`;

  const groq = new Groq({ apiKey });

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: MAX_TOKENS,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices?.[0]?.message?.content || '{}';

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return res.status(502).json({
        error:
          'The model returned non-JSON output. Try again — Llama occasionally drifts on first attempt.',
        raw,
      });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error('Groq call failed:', err);
    return res.status(502).json({
      error:
        err?.message ||
        'Upstream model call failed. Check your GROQ_API_KEY and try again.',
    });
  }
}
