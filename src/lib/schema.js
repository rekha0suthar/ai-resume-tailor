/**
 * Zod schema for the tailor API response.
 * Used by both client and server to validate the model's output.
 */
import { z } from 'zod';

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
  overall_match_score: z.number().min(0).max(100).optional().default(0),
  tailored_bullets: z.array(TailoredBulletSchema).default([]),
  missing_keywords: z.array(MissingKeywordSchema).default([]),
  interview_questions: z.array(InterviewQuestionSchema).default([]),
  // .catch(''): absent / truncated / wrong-typed mid-stream states all
  // collapse to '' instead of failing the whole parse.
  tailoredResume: z.string().min(TAILORED_RESUME_MIN_LENGTH).catch(''),
});

/** Partial-tolerant parser: accepts whatever pieces have arrived. */
export function partialValidate(rawObj) {
  if (!rawObj || typeof rawObj !== 'object') return null;
  try {
    return TailorResponseSchema.parse(rawObj);
  } catch {
    // Fall back to whatever shapes parse individually.
    return {
      overall_match_score:
        typeof rawObj.overall_match_score === 'number'
          ? rawObj.overall_match_score
          : 0,
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
