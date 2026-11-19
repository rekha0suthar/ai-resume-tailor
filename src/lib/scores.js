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
