import { describe, it, expect } from 'vitest';
import {
  isQuotaError,
  groqErrorMessage,
  QUOTA_ERROR_MESSAGE,
  GENERIC_ERROR_MESSAGE,
} from './groqError.js';

describe('isQuotaError', () => {
  it('detects HTTP 429 on a status-code object (groq-sdk APIError shape)', () => {
    expect(isQuotaError({ status: 429, message: 'Request failed' })).toBe(true);
  });

  it('ignores other status codes', () => {
    expect(isQuotaError({ status: 500, message: 'Internal error' })).toBe(false);
    expect(isQuotaError({ status: 401, message: 'Invalid API key' })).toBe(false);
  });

  it('detects "rate limit" in an Error message, case-insensitively', () => {
    expect(isQuotaError(new Error('Rate limit reached for model'))).toBe(true);
    expect(isQuotaError(new Error('RATE LIMIT exceeded'))).toBe(true);
  });

  it('detects "quota" in an Error message', () => {
    expect(isQuotaError(new Error('You exceeded your current quota'))).toBe(true);
  });

  it('detects a quota error nested in the cause chain', () => {
    const inner = new Error('429 rate limit exceeded');
    const outer = new Error('Connection error', { cause: inner });
    expect(isQuotaError(outer)).toBe(true);
  });

  it('detects a 429 status nested in the cause chain', () => {
    const outer = new Error('upstream failed', { cause: { status: 429 } });
    expect(isQuotaError(outer)).toBe(true);
  });

  it('handles plain-string errors', () => {
    expect(isQuotaError('quota exceeded')).toBe(true);
    expect(isQuotaError('socket hang up')).toBe(false);
  });

  it('returns false for unknown / malformed errors without throwing', () => {
    expect(isQuotaError(new Error('ECONNRESET'))).toBe(false);
    expect(isQuotaError(null)).toBe(false);
    expect(isQuotaError(undefined)).toBe(false);
    expect(isQuotaError(42)).toBe(false);
    expect(isQuotaError({})).toBe(false);
    expect(isQuotaError({ message: 12345 })).toBe(false);
  });

  it('survives a cyclic cause chain', () => {
    const a = new Error('a');
    const b = new Error('b');
    a.cause = b;
    b.cause = a;
    expect(isQuotaError(a)).toBe(false);
  });
});

describe('groqErrorMessage', () => {
  it('maps quota errors to the quota message', () => {
    expect(groqErrorMessage({ status: 429 })).toBe(QUOTA_ERROR_MESSAGE);
    expect(groqErrorMessage(new Error('rate limit hit'))).toBe(QUOTA_ERROR_MESSAGE);
  });

  it('maps everything else to the generic message', () => {
    expect(groqErrorMessage(new Error('ETIMEDOUT'))).toBe(GENERIC_ERROR_MESSAGE);
    expect(groqErrorMessage(undefined)).toBe(GENERIC_ERROR_MESSAGE);
  });
});
