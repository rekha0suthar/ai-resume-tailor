import { describe, it, expect } from 'vitest';
import { partialValidate, TAILORED_RESUME_MIN_LENGTH } from './schema.js';

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
  tailoredResume: completeResume,
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
    expect(out.tailoredResume).toBe('');
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
    expect(out.overall_match_score).toBe(validResponse.overall_match_score);
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
