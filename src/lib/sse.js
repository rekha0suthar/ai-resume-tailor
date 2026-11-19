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
