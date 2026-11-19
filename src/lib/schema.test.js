import { describe, it, expect } from 'vitest';
import { partialValidate } from './schema.js';

const validResponse = {
  overall_match_score: 72,
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
};

describe('partialValidate', () => {
  it('passes through a complete valid object', () => {
    const out = partialValidate(validResponse);
    expect(out).toEqual(validResponse);
  });

  it('fills defaults for a truncated object missing fields', () => {
    const out = partialValidate({
      overall_match_score: 40,
      tailored_bullets: [{ original: 'a', rewrite: 'b' }],
    });
    expect(out.overall_match_score).toBe(40);
    expect(out.tailored_bullets).toEqual([{ original: 'a', rewrite: 'b', why: '' }]);
    expect(out.missing_keywords).toEqual([]);
    expect(out.interview_questions).toEqual([]);
  });

  it('drops wrong-typed entries instead of crashing', () => {
    const out = partialValidate({
      overall_match_score: 'ninety',
      tailored_bullets: [
        { original: 'a', rewrite: 'b' },
        { original: 'c', rewrite: 123 }, // bad rewrite type → filtered out
        'not-an-object',
      ],
      missing_keywords: 'nope',
      interview_questions: [{ question: 'ok?' }, { nope: true }],
    });
    expect(out.overall_match_score).toBe(0);
    expect(out.tailored_bullets).toHaveLength(1);
    expect(out.tailored_bullets[0].rewrite).toBe('b');
    expect(out.missing_keywords).toEqual([]);
    expect(out.interview_questions).toHaveLength(1);
    expect(out.interview_questions[0].question).toBe('ok?');
  });

  it('returns all defaults for an empty object', () => {
    expect(partialValidate({})).toEqual({
      overall_match_score: 0,
      tailored_bullets: [],
      missing_keywords: [],
      interview_questions: [],
    });
  });

  it('returns null for garbage input', () => {
    expect(partialValidate(null)).toBeNull();
    expect(partialValidate(undefined)).toBeNull();
    expect(partialValidate('a string')).toBeNull();
    expect(partialValidate(42)).toBeNull();
  });
});
