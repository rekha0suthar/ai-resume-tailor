import { describe, it, expect } from 'vitest';
import { coerceScore, wordToNumber } from './scores.js';

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
