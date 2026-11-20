/**
 * Zod schema for the tailor API response.
 * Used by both client and server to validate the model's output.
 */
import { z } from 'zod';
import { coerceScore, coerceBreakdown, reconcileScore } from './scores.js';

/**
 * Match-score field: the prompt demands JSON numbers, but a live run once
 * emitted a word ("thirty"), so values are coerced (numeric strings, number
 * words) before validation. Unreadable / absent → null, NOT 0 — null means
 * "not scored (yet)", which the UI renders as a placeholder instead of a
 * bogus zero.
 */
const ScoreSchema = z
  .preprocess(coerceScore, z.number().min(0).max(100).nullable())
  .catch(null);

/**
 * Component-breakdown field: coerced all-or-nothing (each component clamped
 * to its cap); a missing, partial (mid-stream) or garbage breakdown degrades
 * to null without breaking the sibling score. After parsing, the totals are
 * reconciled against the breakdowns: when a valid breakdown exists its sum
 * REPLACES the model's claimed total ("computed beats vibed").
 */
const BreakdownSchema = z
  .preprocess(coerceBreakdown, z.record(z.number()).nullable())
  .catch(null);

/** Reconcile score/breakdown pairs on a parsed result (sum wins). */
function reconcile(out, pairs) {
  for (const [scoreKey, breakdownKey] of pairs) {
    out[scoreKey] = reconcileScore(out[scoreKey], out[breakdownKey]);
  }
  return out;
}

export const TailoredBulletSchema = z.object({
  original: z.string(),
  rewrite: z.string(),
  why: z.string().optional().default(''),
});

export const MissingKeywordSchema = z.object({
  keyword: z.string(),
  importance: z.enum(['must-have', 'nice-to-have']).or(z.string()).default('nice-to-have'),
  suggestion: z.string().optional().default(''),
});

export const InterviewQuestionSchema = z.object({
  question: z.string(),
  what_they_want: z.string().optional().default(''),
  prep_tip: z.string().optional().default(''),
});

// A "complete" tailored resume is a full markdown document — anything shorter
// than this is still streaming in (or the model bailed), so we hide it.
export const TAILORED_RESUME_MIN_LENGTH = 200;

export const TailorResponseSchema = z.object({
  original_match_score: ScoreSchema.default(null),
  original_breakdown: BreakdownSchema.default(null),
  tailored_match_score: ScoreSchema.default(null),
  tailored_breakdown: BreakdownSchema.default(null),
  tailored_bullets: z.array(TailoredBulletSchema).default([]),
  missing_keywords: z.array(MissingKeywordSchema).default([]),
  interview_questions: z.array(InterviewQuestionSchema).default([]),
  // .catch(''): absent / truncated / wrong-typed mid-stream states all
  // collapse to '' instead of failing the whole parse.
  tailoredResume: z.string().min(TAILORED_RESUME_MIN_LENGTH).catch(''),
});

/* ------------------------------------------------------------------ */
/* /api/refine response                                                */
/* ------------------------------------------------------------------ */

export const RefineResponseSchema = z.object({
  // The note streams in first and is shown live, so no minimum — any string
  // prefix is renderable. .catch(''): absent / wrong-typed → ''.
  note: z.string().catch(''),
  // Re-score of the revised resume on the same rubric/JD. Optional by
  // design: no JD on the request → the model omits it and the UI keeps the
  // last known score. The breakdown is the updated component breakdown the
  // model derived from the previous one (consistency anchor).
  updatedScore: ScoreSchema.default(null),
  updatedBreakdown: BreakdownSchema.default(null),
  // Same gate as tailoredResume: a full markdown resume, hidden while it's
  // still a short mid-stream fragment so the preview never collapses to a
  // few characters.
  updatedResume: z.string().min(TAILORED_RESUME_MIN_LENGTH).catch(''),
});

/** Partial-tolerant parser for the refine response. */
export function partialValidateRefine(rawObj) {
  if (!rawObj || typeof rawObj !== 'object') return null;
  const pairs = [['updatedScore', 'updatedBreakdown']];
  try {
    return reconcile(RefineResponseSchema.parse(rawObj), pairs);
  } catch {
    return reconcile(
      {
        note: typeof rawObj.note === 'string' ? rawObj.note : '',
        updatedScore: coerceScore(rawObj.updatedScore),
        updatedBreakdown: coerceBreakdown(rawObj.updatedBreakdown),
        updatedResume:
          typeof rawObj.updatedResume === 'string' &&
          rawObj.updatedResume.length >= TAILORED_RESUME_MIN_LENGTH
            ? rawObj.updatedResume
            : '',
      },
      pairs
    );
  }
}

/**
 * True when a (validated) tailor result carries nothing the results page can
 * render — no scores, no bullets, no keywords, no questions, no resume. A
 * stream that truncates before any parseable content but still ends with a
 * `done` event produces exactly this shape; the UI must treat it as a
 * failure (retry card), not a successful empty page.
 */
export function isBlankTailorResult(result) {
  if (!result || typeof result !== 'object') return true;
  return (
    typeof result.original_match_score !== 'number' &&
    typeof result.tailored_match_score !== 'number' &&
    !result.tailored_bullets?.length &&
    !result.missing_keywords?.length &&
    !result.interview_questions?.length &&
    !result.tailoredResume
  );
}

/**
 * Back-compat: older responses (and the v≤4 prompt) carried a single
 * "overall_match_score" — treat it as the ORIGINAL score when the new key
 * is absent, so a cached/old response still lights up the before side.
 */
function normalizeScoreAliases(rawObj) {
  if (
    rawObj.original_match_score === undefined &&
    rawObj.overall_match_score !== undefined
  ) {
    return { ...rawObj, original_match_score: rawObj.overall_match_score };
  }
  return rawObj;
}

/** Partial-tolerant parser: accepts whatever pieces have arrived. */
export function partialValidate(input) {
  if (!input || typeof input !== 'object') return null;
  const rawObj = normalizeScoreAliases(input);
  const pairs = [
    ['original_match_score', 'original_breakdown'],
    ['tailored_match_score', 'tailored_breakdown'],
  ];
  try {
    return reconcile(TailorResponseSchema.parse(rawObj), pairs);
  } catch {
    // Fall back to whatever shapes parse individually.
    return reconcile(
      {
        original_match_score: coerceScore(rawObj.original_match_score),
        original_breakdown: coerceBreakdown(rawObj.original_breakdown),
        tailored_match_score: coerceScore(rawObj.tailored_match_score),
        tailored_breakdown: coerceBreakdown(rawObj.tailored_breakdown),
        tailored_bullets: Array.isArray(rawObj.tailored_bullets)
          ? rawObj.tailored_bullets.filter(
              (b) => b && typeof b === 'object' && typeof b.rewrite === 'string'
            )
          : [],
        missing_keywords: Array.isArray(rawObj.missing_keywords)
          ? rawObj.missing_keywords.filter(
              (k) => k && typeof k === 'object' && typeof k.keyword === 'string'
            )
          : [],
        interview_questions: Array.isArray(rawObj.interview_questions)
          ? rawObj.interview_questions.filter(
              (q) => q && typeof q === 'object' && typeof q.question === 'string'
            )
          : [],
        tailoredResume:
          typeof rawObj.tailoredResume === 'string' &&
          rawObj.tailoredResume.length >= TAILORED_RESUME_MIN_LENGTH
            ? rawObj.tailoredResume
            : '',
      },
      pairs
    );
  }
}
