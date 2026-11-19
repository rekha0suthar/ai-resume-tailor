/**
 * Classify Groq failures so the client can show an honest message.
 *
 * Pure module (no imports, no env) shared by /api/tailor and /api/refine —
 * lives under api/_lib so Vercel never turns it into a function, same as
 * ratelimit.js. Unit-tested in groqError.test.js.
 *
 * The demo runs on Groq's free tier, so the most common upstream failure is
 * an exhausted rate limit / quota — telling users "the AI service is
 * unavailable" for that is misleading (nothing is down, it recovers on its
 * own). Everything else keeps the generic message; provider detail is never
 * forwarded to clients.
 */

export const QUOTA_ERROR_MESSAGE =
  'The free AI quota for this demo is temporarily exhausted — please try again in a few minutes.';

export const GENERIC_ERROR_MESSAGE =
  'The AI service is unavailable right now — please try again in a moment.';

/** HTTP status Groq returns for rate-limit / quota exhaustion. */
const HTTP_TOO_MANY_REQUESTS = 429;

/** Phrases Groq uses in rate-limit / quota error bodies. */
const QUOTA_MESSAGE_RE = /rate limit|quota/i;

/** How deep to follow `cause` chains (guards against cycles). */
const MAX_CAUSE_DEPTH = 5;

/**
 * True when an error (or anything in its `cause` chain) looks like a Groq
 * rate-limit / quota failure: HTTP 429, or "rate limit" / "quota" in the
 * message. Accepts Error instances, SDK APIError-shaped objects
 * ({ status, message }), and plain strings; never throws.
 *
 * @param {unknown} err
 * @returns {boolean}
 */
export function isQuotaError(err) {
  let current = err;
  for (let depth = 0; depth < MAX_CAUSE_DEPTH && current != null; depth++) {
    if (typeof current === 'string') {
      return QUOTA_MESSAGE_RE.test(current);
    }
    if (typeof current === 'object') {
      if (current.status === HTTP_TOO_MANY_REQUESTS) return true;
      if (typeof current.message === 'string' && QUOTA_MESSAGE_RE.test(current.message)) {
        return true;
      }
      current = current.cause;
      continue;
    }
    return false;
  }
  return false;
}

/**
 * The user-facing SSE error message for an upstream Groq failure.
 *
 * @param {unknown} err
 * @returns {string} quota message for rate-limit/quota errors, generic otherwise
 */
export function groqErrorMessage(err) {
  return isQuotaError(err) ? QUOTA_ERROR_MESSAGE : GENERIC_ERROR_MESSAGE;
}
