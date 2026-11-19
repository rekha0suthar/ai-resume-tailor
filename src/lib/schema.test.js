import { describe, it, expect } from 'vitest';
import {
  partialValidate,
  partialValidateRefine,
  TAILORED_RESUME_MIN_LENGTH,
} from './schema.js';

const completeResume = [
  '## Summary',
  'Full-stack engineer with 4 years of experience shipping React and Node.js products.',
  '',
  '## Experience',
  '### Software Engineer — Acme Corp (2021–present)',
  '- Shipped stuff to 1M users',
  '- Cut page load time by 40%',
  '',
  '## Education',
  'B.Tech in Computer Science',
].join('\n');

const validResponse = {
  original_match_score: 45,
  tailored_match_score: 78,
  tailored_bullets: [
    { original: 'Did stuff', rewrite: 'Shipped stuff to 1M users', why: 'metrics' },
  ],
  missing_keywords: [
    { keyword: 'Kubernetes', importance: 'must-have', suggestion: 'Add a bullet' },
  ],
  interview_questions: [
    {
      question: 'Tell me about a time…',
      what_they_want: 'Ownership',
      prep_tip: 'Use STAR',
    },
  ],
  tailoredResume: completeResume,
};

const originalBreakdown = {
  required_skills: 15,
  relevant_experience: 15,
  keyword_alignment: 10,
  evidence_metrics: 5,
}; // sums to 45

const tailoredBreakdown = {
  required_skills: 25,
  relevant_experience: 25,
  keyword_alignment: 18,
  evidence_metrics: 10,
}; // sums to 78

describe('partialValidate', () => {
  it('passes through a complete valid object (breakdowns default to null)', () => {
    const out = partialValidate(validResponse);
    expect(out).toEqual({
      ...validResponse,
      original_breakdown: null,
      tailored_breakdown: null,
    });
  });

  it('keeps valid breakdowns whose sums match the totals', () => {
    const out = partialValidate({
      ...validResponse,
      original_breakdown: originalBreakdown,
      tailored_breakdown: tailoredBreakdown,
    });
    expect(out.original_breakdown).toEqual(originalBreakdown);
    expect(out.tailored_breakdown).toEqual(tailoredBreakdown);
    expect(out.original_match_score).toBe(45);
    expect(out.tailored_match_score).toBe(78);
  });

  it('prefers the breakdown SUM over a mismatched claimed total', () => {
    const out = partialValidate({
      ...validResponse,
      original_match_score: 60, // vibed — disagrees with the components
      original_breakdown: originalBreakdown, // sums to 45
    });
    expect(out.original_match_score).toBe(45);
  });

  it('clamps breakdown components to their caps before summing', () => {
    const out = partialValidate({
      ...validResponse,
      tailored_breakdown: {
        required_skills: 55, // → 40
        relevant_experience: 30,
        keyword_alignment: 20,
        evidence_metrics: 12, // → 10
      },
    });
    expect(out.tailored_breakdown).toEqual({
      required_skills: 40,
      relevant_experience: 30,
      keyword_alignment: 20,
      evidence_metrics: 10,
    });
    expect(out.tailored_match_score).toBe(100);
  });

  it('degrades a partial (mid-stream) breakdown to null, keeping the total', () => {
    const out = partialValidate({
      ...validResponse,
      tailored_breakdown: { required_skills: 25, relevant_experience: 20 },
    });
    expect(out.tailored_breakdown).toBeNull();
    expect(out.tailored_match_score).toBe(78);
  });

  it('degrades a garbage breakdown to null without breaking the score', () => {
    for (const bad of ['high', 42, [1, 2, 3], { required_skills: 'great' }]) {
      const out = partialValidate({ ...validResponse, original_breakdown: bad });
      expect(out.original_breakdown).toBeNull();
      expect(out.original_match_score).toBe(45);
    }
  });

  it('fills defaults for a truncated object missing fields', () => {
    const out = partialValidate({
      original_match_score: 40,
      tailored_bullets: [{ original: 'a', rewrite: 'b' }],
    });
    expect(out.original_match_score).toBe(40);
    expect(out.tailored_match_score).toBeNull();
    expect(out.tailored_bullets).toEqual([{ original: 'a', rewrite: 'b', why: '' }]);
    expect(out.missing_keywords).toEqual([]);
    expect(out.interview_questions).toEqual([]);
    expect(out.tailoredResume).toBe('');
  });

  it('accepts legacy overall_match_score as an alias for the original score', () => {
    const out = partialValidate({ overall_match_score: 62 });
    expect(out.original_match_score).toBe(62);
    expect(out.tailored_match_score).toBeNull();
  });

  it('prefers original_match_score over the legacy alias when both exist', () => {
    const out = partialValidate({ original_match_score: 50, overall_match_score: 90 });
    expect(out.original_match_score).toBe(50);
  });

  it('coerces word-number scores instead of blanking the card', () => {
    const out = partialValidate({
      ...validResponse,
      original_match_score: 'thirty',
      tailored_match_score: 'seventy-five',
    });
    expect(out.original_match_score).toBe(30);
    expect(out.tailored_match_score).toBe(75);
  });

  it('coerces numeric-string scores', () => {
    const out = partialValidate({ ...validResponse, original_match_score: '42' });
    expect(out.original_match_score).toBe(42);
  });

  it('degrades an unreadable score to null, not 0, keeping siblings', () => {
    const out = partialValidate({
      ...validResponse,
      tailored_match_score: 'pretty good',
    });
    expect(out.tailored_match_score).toBeNull();
    expect(out.original_match_score).toBe(45);
    expect(out.tailored_bullets).toEqual(validResponse.tailored_bullets);
  });

  it('clamps out-of-range scores into 0–100', () => {
    const out = partialValidate({ ...validResponse, tailored_match_score: 140 });
    expect(out.tailored_match_score).toBe(100);
  });

  it('keeps a complete tailoredResume', () => {
    expect(completeResume.length).toBeGreaterThanOrEqual(TAILORED_RESUME_MIN_LENGTH);
    const out = partialValidate(validResponse);
    expect(out.tailoredResume).toBe(completeResume);
  });

  it('defaults tailoredResume to empty string when absent', () => {
    const { tailoredResume, ...withoutResume } = validResponse;
    const out = partialValidate(withoutResume);
    expect(out.tailoredResume).toBe('');
    // The other four sections still come through untouched.
    expect(out.tailored_bullets).toEqual(validResponse.tailored_bullets);
    expect(out.interview_questions).toEqual(validResponse.interview_questions);
  });

  it('hides a truncated (still-streaming) tailoredResume', () => {
    const out = partialValidate({
      ...validResponse,
      tailoredResume: '## Summ', // mid-stream fragment, below min length
    });
    expect(out.tailoredResume).toBe('');
  });

  it('drops a wrong-typed tailoredResume without crashing', () => {
    const out = partialValidate({ ...validResponse, tailoredResume: 42 });
    expect(out.tailoredResume).toBe('');
    expect(out.original_match_score).toBe(validResponse.original_match_score);
  });

  it('drops wrong-typed entries instead of crashing', () => {
    const out = partialValidate({
      original_match_score: { nope: true },
      tailored_bullets: [
        { original: 'a', rewrite: 'b' },
        { original: 'c', rewrite: 123 }, // bad rewrite type → filtered out
        'not-an-object',
      ],
      missing_keywords: 'nope',
      interview_questions: [{ question: 'ok?' }, { nope: true }],
    });
    expect(out.original_match_score).toBeNull();
    expect(out.tailored_bullets).toHaveLength(1);
    expect(out.tailored_bullets[0].rewrite).toBe('b');
    expect(out.missing_keywords).toEqual([]);
    expect(out.interview_questions).toHaveLength(1);
    expect(out.interview_questions[0].question).toBe('ok?');
  });

  it('returns all defaults for an empty object', () => {
    expect(partialValidate({})).toEqual({
      original_match_score: null,
      original_breakdown: null,
      tailored_match_score: null,
      tailored_breakdown: null,
      tailored_bullets: [],
      missing_keywords: [],
      interview_questions: [],
      tailoredResume: '',
    });
  });

  it('returns null for garbage input', () => {
    expect(partialValidate(null)).toBeNull();
    expect(partialValidate(undefined)).toBeNull();
    expect(partialValidate('a string')).toBeNull();
    expect(partialValidate(42)).toBeNull();
  });
});

describe('partialValidateRefine', () => {
  const full = {
    note: 'Shortened the summary.',
    updatedScore: 81,
    updatedResume: completeResume,
  };

  it('passes through a complete valid object (breakdown defaults to null)', () => {
    expect(partialValidateRefine(full)).toEqual({ ...full, updatedBreakdown: null });
  });

  it('keeps a valid updatedBreakdown and recomputes the score from its sum', () => {
    const out = partialValidateRefine({
      ...full,
      updatedScore: 95, // vibed — disagrees with the components
      updatedBreakdown: tailoredBreakdown, // sums to 78
    });
    expect(out.updatedBreakdown).toEqual(tailoredBreakdown);
    expect(out.updatedScore).toBe(78);
  });

  it('degrades a garbage updatedBreakdown to null, keeping the claimed score', () => {
    const out = partialValidateRefine({ ...full, updatedBreakdown: 'much better' });
    expect(out.updatedBreakdown).toBeNull();
    expect(out.updatedScore).toBe(81);
  });

  it('defaults updatedScore to null when absent (no JD sent)', () => {
    const out = partialValidateRefine({ note: 'Done.', updatedResume: completeResume });
    expect(out.updatedScore).toBeNull();
    expect(out.updatedResume).toBe(completeResume);
  });

  it('coerces a word-number updatedScore', () => {
    const out = partialValidateRefine({ ...full, updatedScore: 'eighty-one' });
    expect(out.updatedScore).toBe(81);
  });

  it('degrades an unreadable updatedScore to null without losing the resume', () => {
    const out = partialValidateRefine({ ...full, updatedScore: [81] });
    expect(out.updatedScore).toBeNull();
    expect(out.updatedResume).toBe(completeResume);
  });

  it('keeps a partial (still-streaming) note with no resume yet', () => {
    const out = partialValidateRefine({ note: 'Shortened the su' });
    expect(out.note).toBe('Shortened the su');
    expect(out.updatedResume).toBe('');
  });

  it('hides a truncated (still-streaming) updatedResume', () => {
    const out = partialValidateRefine({ note: 'Done.', updatedResume: '## Summ' });
    expect(out.note).toBe('Done.');
    expect(out.updatedResume).toBe('');
  });

  it('keeps a complete updatedResume', () => {
    expect(completeResume.length).toBeGreaterThanOrEqual(TAILORED_RESUME_MIN_LENGTH);
    expect(partialValidateRefine(full).updatedResume).toBe(completeResume);
  });

  it('drops wrong-typed fields without crashing', () => {
    const out = partialValidateRefine({ note: 42, updatedResume: ['nope'] });
    expect(out).toEqual({
      note: '',
      updatedScore: null,
      updatedBreakdown: null,
      updatedResume: '',
    });
  });

  it('salvages a valid resume when the sibling field is wrong-typed', () => {
    const out = partialValidateRefine({ note: 42, updatedResume: completeResume });
    expect(out.note).toBe('');
    expect(out.updatedResume).toBe(completeResume);
  });

  it('returns all defaults for an empty object', () => {
    expect(partialValidateRefine({})).toEqual({
      note: '',
      updatedScore: null,
      updatedBreakdown: null,
      updatedResume: '',
    });
  });

  it('returns null for garbage input', () => {
    expect(partialValidateRefine(null)).toBeNull();
    expect(partialValidateRefine(undefined)).toBeNull();
    expect(partialValidateRefine('a string')).toBeNull();
    expect(partialValidateRefine(42)).toBeNull();
  });
});
