import { describe, it, expect } from 'vitest';
import { countPagesFromBytes } from './pdfPageCount.js';

/** Minimal PDF-shaped byte soup in the classic uncompressed layout. */
const pdfWithPages = (n) => {
  let body = '%PDF-1.3\n1 0 obj\n<< /Type /Pages /Count ' + n + ' /Kids [] >>\nendobj\n';
  for (let i = 0; i < n; i++) {
    body += `${i + 2} 0 obj\n<< /Type /Page /Parent 1 0 R /MediaBox [0 0 595 842] >>\nendobj\n`;
  }
  return body + 'trailer\n<< /Root 9 0 R >>\n%%EOF\n';
};

const enc = (s) => new TextEncoder().encode(s);

describe('countPagesFromBytes', () => {
  it('counts /Type /Page objects', () => {
    expect(countPagesFromBytes(enc(pdfWithPages(1)))).toBe(1);
    expect(countPagesFromBytes(enc(pdfWithPages(2)))).toBe(2);
    expect(countPagesFromBytes(enc(pdfWithPages(7)))).toBe(7);
  });

  it('does NOT count the /Pages page-tree node', () => {
    expect(countPagesFromBytes('<< /Type /Pages /Count 3 >>')).toBe(0);
  });

  it('handles the no-space "/Type/Page" form', () => {
    expect(countPagesFromBytes('<</Type/Page/Parent 1 0 R>> <</Type/Pages>>')).toBe(1);
  });

  it('accepts Uint8Array, ArrayBuffer, and string inputs', () => {
    const s = pdfWithPages(2);
    const u8 = enc(s);
    expect(countPagesFromBytes(s)).toBe(2);
    expect(countPagesFromBytes(u8)).toBe(2);
    expect(countPagesFromBytes(u8.buffer)).toBe(2);
  });

  it('returns 0 on junk / empty input', () => {
    expect(countPagesFromBytes('')).toBe(0);
    expect(countPagesFromBytes(new Uint8Array())).toBe(0);
    expect(countPagesFromBytes('not a pdf at all')).toBe(0);
  });

  it('ignores other /Page-prefixed names (e.g. /PageLabels, /PageMode)', () => {
    expect(countPagesFromBytes('<< /Type /PageLabels >> << /PageMode /UseNone >>')).toBe(0);
  });
});
