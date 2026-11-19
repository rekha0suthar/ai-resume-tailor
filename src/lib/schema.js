/**
 * Zod schema for the tailor API response.
 * Used by both client and server to validate the model's output.
 */
import { z } from 'zod';
import { coerceScore } from './scores.js';

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
  tailored_match_score: ScoreSchema.default(null),
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
  // last known score.
  updatedScore: ScoreSchema.default(null),
  // Same gate as tailoredResume: a full markdown resume, hidden while it's
  // still a short mid-stream fragment so the preview never collapses to a
  // few characters.
  updatedResume: z.string().min(TAILORED_RESUME_MIN_LENGTH).catch(''),
});

/** Partial-tolerant parser for the refine response. */
export function partialValidateRefine(rawObj) {
  if (!rawObj || typeof rawObj !== 'object') return null;
  try {
    return RefineResponseSchema.parse(rawObj);
  } catch {
    return {
      note: typeof rawObj.note === 'string' ? rawObj.note : '',
      updatedScore: coerceScore(rawObj.updatedScore),
      updatedResume:
        typeof rawObj.updatedResume === 'string' &&
        rawObj.updatedResume.length >= TAILORED_RESUME_MIN_LENGTH
          ? rawObj.updatedResume
          : '',
    };
  }
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
  try {
    return TailorResponseSchema.parse(rawObj);
  } catch {
    // Fall back to whatever shapes parse individually.
    return {
      original_match_score: coerceScore(rawObj.original_match_score),
      tailored_match_score: coerceScore(rawObj.tailored_match_score),
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
    };
  }
}
