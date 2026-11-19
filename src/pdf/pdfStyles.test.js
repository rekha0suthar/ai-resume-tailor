import { describe, it, expect } from 'vitest';
import {
  PT_PER_MM,
  marginToPt,
  pdfFileName,
  toWinAnsi,
  resolvePdfTemplate,
  PDF_TEMPLATE_IDS,
} from './pdfStyles.js';
import { TEMPLATES, TEMPLATE_IDS, DEFAULT_TEMPLATE } from '../components/ResumePreview.jsx';

describe('marginToPt', () => {
  it('converts the two-value CSS shorthand (vertical horizontal)', () => {
    const m = marginToPt('20mm 22mm');
    expect(m.top).toBeCloseTo(20 * PT_PER_MM, 1);
    expect(m.bottom).toBeCloseTo(20 * PT_PER_MM, 1);
    expect(m.left).toBeCloseTo(22 * PT_PER_MM, 1);
    expect(m.right).toBeCloseTo(22 * PT_PER_MM, 1);
  });

  it('handles one-value shorthand', () => {
    const m = marginToPt('15mm');
    for (const side of ['top', 'right', 'bottom', 'left']) {
      expect(m[side]).toBeCloseTo(15 * PT_PER_MM, 1);
    }
  });

  it('handles four-value shorthand in CSS order', () => {
    const m = marginToPt('10mm 11mm 12mm 13mm');
    expect(m.top).toBeCloseTo(10 * PT_PER_MM, 1);
    expect(m.right).toBeCloseTo(11 * PT_PER_MM, 1);
    expect(m.bottom).toBeCloseTo(12 * PT_PER_MM, 1);
    expect(m.left).toBeCloseTo(13 * PT_PER_MM, 1);
  });

  it('never returns NaN on junk input', () => {
    for (const junk of ['', null, undefined, 'auto', '  ']) {
      const m = marginToPt(junk);
      for (const side of ['top', 'right', 'bottom', 'left']) {
        expect(Number.isFinite(m[side])).toBe(true);
      }
    }
  });
});

describe('pdfFileName', () => {
  it('builds "<Name> - Resume.pdf"', () => {
    expect(pdfFileName('Priya Raghunathan')).toBe('Priya Raghunathan - Resume.pdf');
  });

  it('strips filesystem-hostile characters', () => {
    expect(pdfFileName('A/B\\C:D*E?F"G<H>I|J')).toBe('A B C D E F G H I J - Resume.pdf');
  });

  it('collapses whitespace', () => {
    expect(pdfFileName('  Jane   Doe  ')).toBe('Jane Doe - Resume.pdf');
  });

  it('falls back when the resume has no name', () => {
    expect(pdfFileName(null)).toBe('Tailored Resume.pdf');
    expect(pdfFileName('')).toBe('Tailored Resume.pdf');
    expect(pdfFileName('///')).toBe('Tailored Resume.pdf');
  });
});

describe('toWinAnsi', () => {
  it('maps arrows and checkmarks the standard fonts cannot show', () => {
    expect(toWinAnsi('Kafka → Postgres')).toBe('Kafka -> Postgres');
    expect(toWinAnsi('b ← a')).toBe('b <- a');
    expect(toWinAnsi('✓ done')).toBe('+ done');
  });

  it('leaves WinAnsi punctuation untouched', () => {
    const s = 'Jan 2024 – Present — “quoted” • naïve résumé';
    expect(toWinAnsi(s)).toBe(s);
  });

  it('is safe on nullish input', () => {
    expect(toWinAnsi(null)).toBe('');
    expect(toWinAnsi(undefined)).toBe('');
  });
});

describe('resolvePdfTemplate', () => {
  it('covers exactly the web template ids', () => {
    expect(PDF_TEMPLATE_IDS.sort()).toEqual([...TEMPLATE_IDS].sort());
  });

  it('falls back to the default template on unknown ids, like the preview', () => {
    expect(resolvePdfTemplate('nope').id).toBe(DEFAULT_TEMPLATE);
    expect(resolvePdfTemplate(undefined).id).toBe(DEFAULT_TEMPLATE);
  });

  it('derives page margins from the SAME pageMargin the print path uses', () => {
    for (const id of TEMPLATE_IDS) {
      const [v, h] = TEMPLATES[id].pageMargin.split(/\s+/).map(parseFloat);
      const t = resolvePdfTemplate(id);
      expect(t.margin.top).toBeCloseTo(v * PT_PER_MM, 1);
      expect(t.margin.left).toBeCloseTo(h * PT_PER_MM, 1);
    }
  });

  it('classic is Times, centered; the rest are Helvetica', () => {
    const classic = resolvePdfTemplate('classic');
    expect(classic.fonts.regular).toBe('Times-Roman');
    expect(classic.fonts.bold).toBe('Times-Bold');
    expect(classic.headerAlign).toBe('center');
    for (const id of ['modern', 'compact', 'minimal']) {
      expect(resolvePdfTemplate(id).fonts.regular).toBe('Helvetica');
      expect(resolvePdfTemplate(id).headerAlign).toBe('left');
    }
  });

  it('modern carries the teal accent on headings and rules', () => {
    const t = resolvePdfTemplate('modern');
    expect(t.heading.color).toBe('#2a7f74');
    expect(t.heading.rule).toBeTruthy();
    expect(t.bullet.markerColor).toBe('#2a7f74');
  });

  it('compact is 9–9.5pt and the densest template', () => {
    const compact = resolvePdfTemplate('compact');
    expect(compact.body.fontSize).toBeGreaterThanOrEqual(9);
    expect(compact.body.fontSize).toBeLessThanOrEqual(9.5);
    for (const id of ['classic', 'modern', 'minimal']) {
      const other = resolvePdfTemplate(id);
      expect(compact.body.fontSize).toBeLessThan(other.body.fontSize);
      expect(compact.section.marginTop).toBeLessThan(other.section.marginTop);
      expect(compact.margin.top).toBeLessThan(other.margin.top);
    }
  });

  it('minimal and compact have no heading rules; classic and modern do', () => {
    expect(resolvePdfTemplate('minimal').heading.rule).toBeNull();
    expect(resolvePdfTemplate('compact').heading.rule).toBeNull();
    expect(resolvePdfTemplate('classic').heading.rule).toBeTruthy();
    expect(resolvePdfTemplate('modern').heading.rule).toBeTruthy();
  });

  it('minimal headings are gray and letterspaced, name is regular weight', () => {
    const t = resolvePdfTemplate('minimal');
    expect(t.heading.color).toBe('#a3a3a3');
    expect(t.heading.letterSpacing).toBeGreaterThan(resolvePdfTemplate('classic').heading.letterSpacing);
    expect(t.name.font).toBe('Helvetica');
  });

  it('every template carries the full spec the renderer reads', () => {
    for (const id of PDF_TEMPLATE_IDS) {
      const t = resolvePdfTemplate(id);
      expect(t.fonts.regular).toBeTruthy();
      expect(t.fonts.bold).toBeTruthy();
      expect(t.body.fontSize).toBeGreaterThan(0);
      expect(t.body.lineHeight).toBeGreaterThan(1);
      expect(t.name.fontSize).toBeGreaterThan(t.body.fontSize);
      expect(t.entry.datesFont).toBeTruthy();
      expect(t.bullet.indent).toBeGreaterThan(0);
      expect(t.link.color).toMatch(/^#/);
    }
  });
});
