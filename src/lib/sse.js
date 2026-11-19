/**
 * Minimal SSE frame parser for the /api/tailor stream.
 *
 * Takes the accumulated buffer string and returns:
 *   events: [{ event, data }]  — one per complete frame (blank-line terminated).
 *                                `data` is the raw concatenated data payload;
 *                                callers decide how to decode it (JSON here).
 *   rest:   string             — trailing partial frame to prepend to the next
 *                                chunk (frames can split anywhere mid-stream).
 *
 * Pure function so it's trivially unit-testable; useTailor feeds it each
 * decoded chunk.
 */
/**
 * User-facing message for a fetch Response that is NOT the expected SSE
 * stream (HTTP error, or a non-SSE content type). Shared by useTailor and
 * useRefine so both hooks surface identical errors.
 *
 * Prefers the server's own JSON `{ error }` message; an HTML body means the
 * SPA fallback answered (no /api routing) and gets a targeted hint; anything
 * else falls back to the HTTP status.
 *
 * @param {Response} res — the non-OK / non-SSE response (body is consumed)
 * @returns {Promise<string>} message safe to render in the error UI
 */
export async function httpErrorMessage(res) {
  const raw = await res.text();
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.error) return parsed.error;
  } catch {
    if (raw.trimStart().startsWith('<')) {
      return 'Server returned HTML — run with `npm run dev` (which routes /api) or check the deploy.';
    }
  }
  return `Request failed (HTTP ${res.status}).`;
}

export function parseSSE(buffer) {
  const parts = buffer.split('\n\n');
  const rest = parts.pop() ?? '';
  const events = [];
  for (const block of parts) {
    const lines = block.split('\n');
    let event = 'message';
    let data = '';
    for (const line of lines) {
      if (line.startsWith('event: ')) event = line.slice(7).trim();
      else if (line.startsWith('data: ')) data += line.slice(6);
    }
    if (!data) continue;
    events.push({ event, data });
  }
  return { events, rest };
}
