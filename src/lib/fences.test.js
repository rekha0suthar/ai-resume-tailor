import { describe, it, expect } from 'vitest';
import { stripJsonFences } from './fences.js';

const json = '{"note": "Shortened the summary.", "updatedResume": "## Summary"}';

describe('stripJsonFences', () => {
  it('returns clean JSON untouched', () => {
    expect(stripJsonFences(json)).toBe(json);
  });

  it('returns a clean partial JSON prefix untouched', () => {
    expect(stripJsonFences('{"note": "Shor')).toBe('{"note": "Shor');
  });

  it('strips a complete ```json fence', () => {
    expect(stripJsonFences('```json\n' + json + '\n```')).toBe(json);
  });

  it('strips a bare ``` fence', () => {
    expect(stripJsonFences('```\n' + json + '\n```')).toBe(json);
  });

  it('strips a fence with leading whitespace', () => {
    expect(stripJsonFences('\n  ```json\n' + json + '\n```\n')).toBe(json);
  });

  it('strips a leading fence while streaming (no closing fence yet)', () => {
    expect(stripJsonFences('```json\n{"note": "Shor')).toBe('{"note": "Shor');
  });

  it('strips a PARTIAL trailing fence mid-stream', () => {
    expect(stripJsonFences('```json\n' + json + '\n`')).toBe(json);
    expect(stripJsonFences('```json\n' + json + '\n``')).toBe(json);
  });

  it('handles an incomplete opening fence gracefully', () => {
    // Not yet three backticks — nothing to strip, parse just fails until
    // more chunks arrive.
    expect(stripJsonFences('``')).toBe('``');
    expect(stripJsonFences('```jso')).toBe('');
  });

  it('does not touch backticks inside string values when unfenced', () => {
    const withTicks = '{"updatedResume": "- Uses `docker` daily"}';
    expect(stripJsonFences(withTicks)).toBe(withTicks);
  });

  it('handles empty and non-string input', () => {
    expect(stripJsonFences('')).toBe('');
    expect(stripJsonFences(null)).toBe('');
    expect(stripJsonFences(undefined)).toBe('');
  });
});
