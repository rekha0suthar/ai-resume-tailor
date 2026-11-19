/**
 * In-memory sliding-window rate limiter, keyed by client IP.
 * Shared by /api/tailor and /api/refine.
 *
 * Lives under api/_lib — Vercel ignores underscore-prefixed paths inside
 * api/, so this never becomes a serverless function, and the dev Vite
 * plugin only routes real /api/* requests, so it's import-only there too.
 *
 * Serverless caveat: this Map lives per warm instance (and on Vercel each
 * function gets its own bundle), so it's a best-effort guard, not a hard
 * quota — a cold start or a second instance gets a fresh window. Good
 * enough to stop casual abuse of a free-tier demo without adding a
 * dependency. The production answer is a shared store (e.g. Upstash Redis
 * via @upstash/ratelimit).
 */
const RATE_LIMIT = 10; // requests…
const RATE_WINDOW_MS = 10 * 60 * 1000; // …per 10 minutes
const hits = new Map(); // ip -> [timestamps]
let lastSweep = Date.now();

export function rateLimited(ip) {
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

/** Resolve the client IP the same way for every endpoint. */
export function clientIp(req) {
  return (
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}
