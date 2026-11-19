/**
 * POST /api/refine — streaming SSE endpoint for chat refinement of the
 * tailored resume.
 *
 * Body: {
 *   resumeMarkdown: string   — the CURRENT tailored resume (markdown),
 *   instruction:    string   — what to change ("Make it one page", …),
 *   jobDescription?: string  — the target JD; when present, the model also
 *                              returns "updatedScore" (same rubric as
 *                              /api/tailor, same JD → comparable numbers).
 *                              Clamped server-side; absent → no score.
 *   history?:       [{ role: 'user'|'assistant', content }]
 *                            — up to 6 prior turns for iterative edits
 *                              (validated + clamped server-side).
 *   previousScore?:     number — the total for the resume BEFORE this edit.
 *   previousBreakdown?: object — its component breakdown; when valid the
 *                              model UPDATES it instead of re-judging from
 *                              scratch (validated + clamped server-side).
 * }
 *
 * Response: same SSE protocol as /api/tailor:
 *   - event: chunk   data: { text }
 *   - event: done    data: { ok: true }
 *   - event: error   data: { error }
 *
 * The model returns JSON { note, updatedScore, updatedBreakdown,
 * updatedResume } with the
 * one-sentence note FIRST so it streams into the chat bubble while the long
 * resume is still generating. JSON is prompt-enforced, not response_format json_object —
 * json_object mode buffers gpt-oss-120b output into a single end-of-stream
 * delta (see api/tailor.js).
 */
import Groq from 'groq-sdk';
import {
  MODEL,
  MAX_TOKENS,
  REFINE_SYSTEM_PROMPT,
  buildRefineUserPrompt,
  REFINE_RESUME_MIN,
  INSTRUCTION_MIN,
  INSTRUCTION_MAX,
  JD_CAP,
} from '../src/lib/prompts.js';
import { clampHistory } from '../src/lib/history.js';
import { coerceScore, coerceBreakdown } from '../src/lib/scores.js';
import { rateLimited, clientIp } from './_lib/ratelimit.js';
import { groqErrorMessage } from './_lib/groqError.js';

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  // Same-origin SPA: no Access-Control-Allow-Origin header on purpose —
  // the browser only needs CORS headers for cross-origin callers, which
  // this endpoint doesn't support.
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (rateLimited(clientIp(req))) {
    return res.status(429).json({
      error: 'Too many requests — please wait a few minutes and try again.',
    });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'Server is missing GROQ_API_KEY.',
    });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body.' });
    }
  }
  const resumeMarkdown = (body?.resumeMarkdown || '').trim();
  const instruction = (body?.instruction || '').trim();
  // Optional: with a JD the model re-scores the revised resume on the same
  // rubric. Clamp server-side (buildRefineUserPrompt trims again — belt and
  // braces against a hostile client inflating the prompt).
  const jobDescription =
    typeof body?.jobDescription === 'string'
      ? body.jobDescription.trim().slice(0, JD_CAP)
      : '';
  // Never trust the wire: drop malformed turns, cap content length, keep
  // only the most recent turns. (buildRefineUserPrompt caps the resume.)
  const history = clampHistory(body?.history);
  // Consistency anchor: the previous score + component breakdown for the
  // resume being refined. Clamped/validated server-side — coerceBreakdown
  // caps each component and rejects malformed shapes entirely, so a hostile
  // client can't inject prompt text or out-of-range numbers through it.
  const previousBreakdown = coerceBreakdown(body?.previousBreakdown);
  const previousScore = coerceScore(body?.previousScore);
  const previous = previousBreakdown
    ? { score: previousScore, breakdown: previousBreakdown }
    : null;

  if (resumeMarkdown.length < REFINE_RESUME_MIN) {
    return res.status(400).json({
      error: 'Nothing to refine yet — generate a tailored resume first.',
    });
  }
  if (instruction.length < INSTRUCTION_MIN) {
    return res.status(400).json({ error: 'Tell me what to change (a few words is enough).' });
  }
  if (instruction.length > INSTRUCTION_MAX) {
    return res.status(400).json({
      error: `Instruction is too long — keep it under ${INSTRUCTION_MAX} characters.`,
    });
  }

  // Switch into SSE mode.
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable proxy buffering
  res.flushHeaders?.();

  const send = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const groq = new Groq({ apiKey });

  try {
    const stream = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: REFINE_SYSTEM_PROMPT },
        // Prior turns (user instructions + assistant notes) give the model
        // conversational context for follow-ups like "a bit longer again".
        ...history,
        {
          role: 'user',
          content: buildRefineUserPrompt(resumeMarkdown, instruction, jobDescription, previous),
        },
      ],
      temperature: 0.3,
      max_tokens: MAX_TOKENS,
      // Low reasoning effort — see api/tailor.js: hidden reasoning tokens
      // share the max_tokens budget and can truncate the JSON.
      reasoning_effort: 'low',
      // NO response_format — see api/tailor.js: json_object mode delivers
      // gpt-oss-120b output as one giant delta and kills streaming.
      stream: true,
    });

    for await (const part of stream) {
      const text = part?.choices?.[0]?.delta?.content;
      if (text) send('chunk', { text });
    }
    send('done', { ok: true });
    res.end();
  } catch (err) {
    // Log the real error server-side; never leak provider detail to clients.
    // Quota/rate-limit failures get an honest "try again in a few minutes"
    // instead of the generic "service unavailable".
    console.error('Groq stream failed:', err);
    send('error', { error: groqErrorMessage(err) });
    res.end();
  }
}
