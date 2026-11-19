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
 * Groq Llama 3.3 70B in JSON mode produces well-formed JSON in roughly 1.5s.
 * Streaming makes the perceived latency about 200ms (first token).
 */
import Groq from 'groq-sdk';
import { MODEL, MAX_TOKENS, SYSTEM_PROMPT, buildUserPrompt } from '../src/lib/prompts.js';

export const config = { maxDuration: 30 };

/**
 * In-memory sliding-window rate limiter, keyed by client IP.
 *
 * Serverless caveat: this Map lives per warm instance, so it's a best-effort
 * guard, not a hard quota — a cold start or a second instance gets a fresh
 * window. Good enough to stop casual abuse of a free-tier demo without adding
 * a dependency. The production answer is a shared store (e.g. Upstash Redis
 * via @upstash/ratelimit).
 */
const RATE_LIMIT = 10; // requests…
const RATE_WINDOW_MS = 10 * 60 * 1000; // …per 10 minutes
const hits = new Map(); // ip -> [timestamps]
let lastSweep = Date.now();

function rateLimited(ip) {
  const now = Date.now();
  // Periodic cleanup so the Map doesn't grow unbounded on long-lived instances.
  if (now - lastSweep > RATE_WINDOW_MS) {
    lastSweep = now;
    for (const [key, times] of hits) {
      const fresh = times.filter((t) => now - t < RATE_WINDOW_MS);
      if (fresh.length) hits.set(key, fresh);
      else hits.delete(key);
    }
  }
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

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

  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';
  if (rateLimited(ip)) {
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
      response_format: { type: 'json_object' },
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
