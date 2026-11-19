import { describe, it, expect } from 'vitest';
import {
  coerceScore,
  wordToNumber,
  BREAKDOWN_COMPONENTS,
  coerceComponent,
  coerceBreakdown,
  sumBreakdown,
  reconcileScore,
} from './scores.js';

describe('wordToNumber', () => {
  it('parses unit words', () => {
    expect(wordToNumber('zero')).toBe(0);
    expect(wordToNumber('seven')).toBe(7);
    expect(wordToNumber('nineteen')).toBe(19);
  });

  it('parses tens words', () => {
    expect(wordToNumber('thirty')).toBe(30);
    expect(wordToNumber('ninety')).toBe(90);
  });

  it('parses hyphenated and spaced compounds', () => {
    expect(wordToNumber('forty-five')).toBe(45);
    expect(wordToNumber('forty five')).toBe(45);
    expect(wordToNumber('Seventy-Eight')).toBe(78);
  });

  it('parses one hundred variants', () => {
    expect(wordToNumber('hundred')).toBe(100);
    expect(wordToNumber('one hundred')).toBe(100);
    expect(wordToNumber('a hundred')).toBe(100);
  });

  it('rejects out-of-vocabulary and malformed words', () => {
    expect(wordToNumber('two hundred')).toBeNull();
    expect(wordToNumber('thirty-thirty')).toBeNull();
    expect(wordToNumber('twenty-zero')).toBeNull();
    expect(wordToNumber('great')).toBeNull();
    expect(wordToNumber('')).toBeNull();
    expect(wordToNumber(42)).toBeNull();
  });
});

describe('coerceScore', () => {
  it('passes through in-range numbers, rounding floats', () => {
    expect(coerceScore(42)).toBe(42);
    expect(coerceScore(73.4)).toBe(73);
    expect(coerceScore(0)).toBe(0);
    expect(coerceScore(100)).toBe(100);
  });

  it('clamps out-of-range numbers into 0–100', () => {
    expect(coerceScore(140)).toBe(100);
    expect(coerceScore(-5)).toBe(0);
  });

  it('parses numeric strings', () => {
    expect(coerceScore('42')).toBe(42);
    expect(coerceScore(' 73.4 ')).toBe(73);
  });

  it('parses word-number strings (the live-run regression)', () => {
    expect(coerceScore('thirty')).toBe(30);
    expect(coerceScore('forty-five')).toBe(45);
    expect(coerceScore('one hundred')).toBe(100);
  });

  it('returns null for everything unreadable', () => {
    expect(coerceScore('pretty good')).toBeNull();
    expect(coerceScore('')).toBeNull();
    expect(coerceScore(null)).toBeNull();
    expect(coerceScore(undefined)).toBeNull();
    expect(coerceScore(NaN)).toBeNull();
    expect(coerceScore(Infinity)).toBeNull();
    expect(coerceScore({})).toBeNull();
    expect(coerceScore([42])).toBeNull();
    expect(coerceScore(true)).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Component breakdowns                                                */
/* ------------------------------------------------------------------ */

const goodBreakdown = {
  required_skills: 18,
  relevant_experience: 16,
  keyword_alignment: 13,
  evidence_metrics: 6,
}; // sums to 53

describe('BREAKDOWN_COMPONENTS', () => {
  it('caps sum to 100 (a breakdown sum IS a 0-100 score)', () => {
    const capSum = BREAKDOWN_COMPONENTS.reduce((a, c) => a + c.cap, 0);
    expect(capSum).toBe(100);
  });
});

describe('coerceComponent', () => {
  it('passes a clean in-range integer through', () => {
    expect(coerceComponent(18, 40)).toBe(18);
    expect(coerceComponent(0, 40)).toBe(0);
    expect(coerceComponent(40, 40)).toBe(40);
  });

  it('clamps to the component cap, not 100', () => {
    expect(coerceComponent(55, 40)).toBe(40);
    expect(coerceComponent(12, 10)).toBe(10);
  });

  it('coerces strings and word-numbers like coerceScore', () => {
    expect(coerceComponent('18', 40)).toBe(18);
    expect(coerceComponent('eighteen', 40)).toBe(18);
    expect(coerceComponent(' 7.4 ', 10)).toBe(7);
  });

  it('clamps negatives to 0 and rejects garbage', () => {
    expect(coerceComponent(-3, 40)).toBe(0);
    expect(coerceComponent('meh', 40)).toBeNull();
    expect(coerceComponent(undefined, 40)).toBeNull();
  });
});

describe('coerceBreakdown', () => {
  it('passes a clean breakdown through', () => {
    expect(coerceBreakdown(goodBreakdown)).toEqual(goodBreakdown);
  });

  it('coerces word/string components and clamps each to its cap', () => {
    expect(
      coerceBreakdown({
        required_skills: '45', // over the 40 cap
        relevant_experience: 'twenty',
        keyword_alignment: 13.6,
        evidence_metrics: -2,
      })
    ).toEqual({
      required_skills: 40,
      relevant_experience: 20,
      keyword_alignment: 14,
      evidence_metrics: 0,
    });
  });

  it('drops extra keys the model invented', () => {
    const out = coerceBreakdown({ ...goodBreakdown, bonus_vibes: 50 });
    expect(out).toEqual(goodBreakdown);
    expect(out.bonus_vibes).toBeUndefined();
  });

  it('is all-or-nothing: a missing or unreadable component nulls the breakdown', () => {
    const { evidence_metrics, ...partial } = goodBreakdown;
    void evidence_metrics;
    expect(coerceBreakdown(partial)).toBeNull();
    expect(coerceBreakdown({ ...goodBreakdown, keyword_alignment: 'decent' })).toBeNull();
  });

  it('returns null for non-objects', () => {
    expect(coerceBreakdown(null)).toBeNull();
    expect(coerceBreakdown(undefined)).toBeNull();
    expect(coerceBreakdown(53)).toBeNull();
    expect(coerceBreakdown('53')).toBeNull();
    expect(coerceBreakdown([18, 16, 13, 6])).toBeNull();
  });
});

describe('sumBreakdown', () => {
  it('sums a valid breakdown', () => {
    expect(sumBreakdown(goodBreakdown)).toBe(53);
  });

  it('sums AFTER clamping to caps', () => {
    expect(
      sumBreakdown({
        required_skills: 90,
        relevant_experience: 90,
        keyword_alignment: 90,
        evidence_metrics: 90,
      })
    ).toBe(100);
  });

  it('returns null for an invalid breakdown', () => {
    expect(sumBreakdown(null)).toBeNull();
    expect(sumBreakdown({})).toBeNull();
    expect(sumBreakdown({ required_skills: 18 })).toBeNull();
  });
});

describe('reconcileScore', () => {
  it('prefers the breakdown sum over a disagreeing total (computed beats vibed)', () => {
    expect(reconcileScore(87, goodBreakdown)).toBe(53);
    expect(reconcileScore(10, goodBreakdown)).toBe(53);
  });

  it('agreeing total and sum stay put', () => {
    expect(reconcileScore(53, goodBreakdown)).toBe(53);
  });

  it('falls back to the coerced total without a valid breakdown', () => {
    expect(reconcileScore(53, null)).toBe(53);
    expect(reconcileScore('fifty-three', {})).toBe(53);
    expect(reconcileScore(140, null)).toBe(100);
  });

  it('returns null when neither is readable', () => {
    expect(reconcileScore(null, null)).toBeNull();
    expect(reconcileScore('great', { required_skills: 'yes' })).toBeNull();
  });
});
