/**
 * POST /api/tailor — streaming Server-Sent Events endpoint.
 *
 * Body: { resumeText, jobDescription }
 *
 * Response: SSE event stream with two kinds of messages:
 *   - event: chunk   data: { text }    — appended to the accumulating JSON
 *   - event: done    data: { ok: true }
 *   - event: error   data: { error }
 *
 * The client uses `partial-json` to parse the accumulating buffer after every
 * chunk, so tailored bullets / keyword gaps / interview questions appear in
 * the UI as soon as each one is complete in the model's output.
 *
 * JSON is prompt-enforced rather than requested via response_format — see
 * the note on the Groq call below for why (json_object mode buffers the
 * whole completion into a single delta on gpt-oss-120b).
 */
import Groq from 'groq-sdk';
import { MODEL, MAX_TOKENS, SYSTEM_PROMPT, buildUserPrompt } from '../src/lib/prompts.js';
import { rateLimited, clientIp } from './_lib/ratelimit.js';

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
  const resumeText = (body?.resumeText || '').trim();
  const jobDescription = (body?.jobDescription || '').trim();

  if (resumeText.length < 50) {
    return res.status(400).json({ error: 'Resume looks too short — paste at least your summary + experience.' });
  }
  if (jobDescription.length < 50) {
    return res.status(400).json({ error: 'Job description looks too short — paste the full posting.' });
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
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(resumeText, jobDescription) },
      ],
      temperature: 0.4,
      max_tokens: MAX_TOKENS,
      // NO response_format here, deliberately: with { type: 'json_object' }
      // Groq delivers gpt-oss-120b output as ONE content delta at the very
      // end (measured: 1 delta vs ~100 without it), which kills progressive
      // rendering. The prompt enforces JSON instead, and the client strips
      // stray ```json fences + parses tolerantly (partial-json).
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
    console.error('Groq stream failed:', err);
    send('error', {
      error: 'The AI service is unavailable right now — please try again in a moment.',
    });
    res.end();
  }
}
