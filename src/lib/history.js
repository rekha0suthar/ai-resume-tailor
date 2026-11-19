/**
 * clampHistory() — validate + clamp the chat history sent with a refine turn.
 *
 * Pure module shared by both sides:
 *   - client (useRefine) trims what it sends,
 *   - server (/api/refine) never trusts the wire and clamps again.
 *
 * Rules: only {role: 'user'|'assistant', content: string} turns survive,
 * content is trimmed and capped at HISTORY_CONTENT_CAP chars, and only the
 * LAST HISTORY_MAX_TURNS turns are kept (the most recent context matters).
 */
export const HISTORY_MAX_TURNS = 6;
export const HISTORY_CONTENT_CAP = 1000;

export function clampHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter(
      (t) =>
        t &&
        typeof t === 'object' &&
        (t.role === 'user' || t.role === 'assistant') &&
        typeof t.content === 'string' &&
        t.content.trim().length > 0
    )
    .map((t) => ({
      role: t.role,
      content: t.content.trim().slice(0, HISTORY_CONTENT_CAP),
    }))
    .slice(-HISTORY_MAX_TURNS);
}
