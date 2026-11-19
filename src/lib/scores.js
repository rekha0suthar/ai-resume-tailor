/**
 * Score coercion for the match-score fields.
 *
 * The prompt demands JSON numbers, but a live run once emitted
 * `"overall_match_score": thirty` (an unquoted word — partial-json surfaces
 * quoted variants as strings). Rather than blanking the score card on a bad
 * value, coerce the obvious shapes and degrade gracefully:
 *   42        → 42
 *   "42"      → 42
 *   " 73.4 "  → 73
 *   "thirty"  → 30
 *   "forty-five" / "forty five" → 45
 *   "one hundred" → 100
 *   anything else → null (treated as "not scored yet")
 *
 * Pure module — no imports — so it's trivially unit-testable and usable by
 * both the zod schema (via preprocess) and the tolerant fallback paths.
 */

const UNITS = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};

const TENS = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

/**
 * Parse an English number word (0–100) → number, or null.
 * Handles "thirty", "forty-five", "forty five", "a hundred", "one hundred".
 */
export function wordToNumber(input) {
  if (typeof input !== 'string') return null;
  const words = input
    .toLowerCase()
    .trim()
    .split(/[\s-]+/)
    .filter(Boolean);
  if (!words.length) return null;

  if (words[words.length - 1] === 'hundred') {
    const head = words.slice(0, -1);
    if (head.length === 0 || (head.length === 1 && (head[0] === 'one' || head[0] === 'a')))
      return 100;
    return null; // "two hundred" etc. — out of range anyway
  }

  if (words.length === 1) {
    const w = words[0];
    if (w in UNITS) return UNITS[w];
    if (w in TENS) return TENS[w];
    return null;
  }

  if (words.length === 2 && words[0] in TENS && words[1] in UNITS && UNITS[words[1]] >= 1 && UNITS[words[1]] <= 9) {
    return TENS[words[0]] + UNITS[words[1]];
  }

  return null;
}

/**
 * Coerce any value the model might emit for a score into an integer 0–100,
 * or null when it can't be read as one. null means "no score" — callers
 * must keep showing the previous score / a placeholder, never 0.
 */
export function coerceScore(value) {
  let n = null;
  if (typeof value === 'number') {
    n = value;
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) n = Number(trimmed);
    else n = wordToNumber(trimmed);
  }
  if (n === null || Number.isNaN(n) || !Number.isFinite(n)) return null;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/* ------------------------------------------------------------------ */
/* Component breakdowns — computed scoring                             */
/* ------------------------------------------------------------------ */

/**
 * The four rubric components, with display labels and integer caps. The
 * caps mirror the rubric weights (40/30/20/10) so a breakdown's sum is a
 * 0–100 score by construction. Single source of truth for the schema,
 * the hooks, and the ScoreStrip breakdown panel.
 */
export const BREAKDOWN_COMPONENTS = [
  { key: 'required_skills', label: 'Required skills', cap: 40 },
  { key: 'relevant_experience', label: 'Relevant experience', cap: 30 },
  { key: 'keyword_alignment', label: 'Keyword alignment', cap: 20 },
  { key: 'evidence_metrics', label: 'Evidence & metrics', cap: 10 },
];

/** Coerce one component value like coerceScore, but clamped to its cap. */
export function coerceComponent(value, cap) {
  const n = coerceScore(value);
  if (n === null) return null;
  return Math.min(cap, n);
}

/**
 * Coerce a model-emitted breakdown object into a clean
 * { required_skills, relevant_experience, keyword_alignment, evidence_metrics }
 * with every component an integer within its cap — or null when the input
 * isn't an object or ANY component is missing/unreadable. All-or-nothing on
 * purpose: a half-arrived breakdown (mid-stream) must not render as a
 * low-ball "0" on the missing rows, and a breakdown with a garbage component
 * can't be summed into an honest total.
 */
export function coerceBreakdown(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const out = {};
  for (const { key, cap } of BREAKDOWN_COMPONENTS) {
    const n = coerceComponent(value[key], cap);
    if (n === null) return null;
    out[key] = n;
  }
  return out;
}

/** Sum of a (coerced) breakdown's components, or null for no breakdown. */
export function sumBreakdown(breakdown) {
  const clean = coerceBreakdown(breakdown);
  if (!clean) return null;
  return BREAKDOWN_COMPONENTS.reduce((acc, { key }) => acc + clean[key], 0);
}

/**
 * Reconcile a model-claimed total with its component breakdown: when a
 * valid breakdown exists its SUM wins (computed beats vibed — this is the
 * fix for same-judge score jumps), otherwise fall back to the coerced
 * total. Returns an integer 0–100 or null.
 */
export function reconcileScore(total, breakdown) {
  const sum = sumBreakdown(breakdown);
  if (sum !== null) return sum;
  return coerceScore(total);
}
