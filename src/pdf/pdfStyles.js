/**
 * Pure template → @react-pdf style resolution. No @react-pdf import here,
 * so ResultsPanel can use `pdfFileName` without pulling the PDF engine
 * into the main chunk, and vitest can unit-test the mapping in plain node.
 *
 * Each web template (see TEMPLATES in ResumePreview.jsx) maps to a PDF
 * spec built on the 14 standard PDF fonts — zero font files shipped:
 *   Classic → Times family     Modern/Compact/Minimal → Helvetica family
 * Page margins come from the SAME `pageMargin` strings the print
 * stylesheet uses, converted mm → pt, so print and download agree.
 */

import { TEMPLATES, DEFAULT_TEMPLATE } from '../components/ResumePreview.jsx';

export const PT_PER_MM = 72 / 25.4;

/** '20mm 22mm' (CSS shorthand, mm) → { top, right, bottom, left } in pt. */
export function marginToPt(pageMargin) {
  const nums = String(pageMargin || '')
    .trim()
    .split(/\s+/)
    .map((part) => parseFloat(part))
    .filter((n) => Number.isFinite(n));
  const [a = 0, b = a, c = a, d = b] = nums;
  const pt = (mm) => Math.round(mm * PT_PER_MM * 100) / 100;
  return { top: pt(a), right: pt(b), bottom: pt(c), left: pt(d) };
}

/** "<Name> - Resume.pdf", filesystem-safe; sensible fallback without a name. */
export function pdfFileName(name) {
  const safe = String(name || '')
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return safe ? `${safe} - Resume.pdf` : 'Tailored Resume.pdf';
}

/**
 * The standard PDF fonts only cover WinAnsi; a character outside it does
 * NOT silently drop — pdfkit encodes it as `charCode & 0xFF`, so e.g. a
 * narrow no-break space (U+202F, common around date-range dashes in text
 * copied out of Word/PDFs) draws as "/" ON TOP of the neighbouring text,
 * and dash lookalikes (minus sign U+2212, non-breaking hyphen U+2011)
 * draw as invisible control glyphs with wrong widths. So: map plausible
 * characters to WinAnsi equivalents, fold anything decomposable (ā → a),
 * and drop the rest. En/em dashes, bullets, curly quotes, and Latin-1
 * accents are all IN WinAnsi and pass through untouched.
 */
const NON_WINANSI_MAP = [
  [/→|➜|➡/g, '->'], // → ➜ ➡
  [/←/g, '<-'], // ←
  [/✓|✔/g, '+'], // ✓ ✔
  [/●|▪|◦|‣/g, '•'], // normalize bullet variants to the WinAnsi bullet
  // Dash lookalikes outside WinAnsi → hyphen (en/em dash themselves are
  // IN WinAnsi, kept as-is — they render correctly in Times AND Helvetica).
  // U+2010 hyphen, U+2011 non-breaking hyphen, U+2012 figure dash,
  // U+2212 minus sign, U+FE63/U+FF0D small/fullwidth hyphen-minus.
  [/[\u2010\u2011\u2012\u2212\uFE63\uFF0D]/g, '-'],
  [/\u2015/g, '\u2014'], // horizontal bar -> em dash (WinAnsi)
  // Unicode spaces → plain space: U+2000–200A (en/em/thin…), U+202F narrow
  // no-break space (the date-range offender), U+205F, U+3000.
  [/[\u2000-\u200A\u202F\u205F\u3000]/g, ' '],
  // Zero-width characters, directional marks, and BOM → gone.
  [/[\u200B-\u200F\u2060\uFEFF]/g, ''],
];

/** Everything WinAnsi (CP1252) can encode: ASCII, Latin-1, CP1252 extras. */
const WINANSI_CHARS =
  '\\u0009\\u000A\\u000D\\u0020-\\u007E\\u00A0-\\u00FF' +
  '\\u0152\\u0153\\u0160\\u0161\\u0178\\u017D\\u017E\\u0192\\u02C6\\u02DC' +
  '\\u2013\\u2014\\u2018\\u2019\\u201A\\u201C\\u201D\\u201E\\u2020\\u2021' +
  '\\u2022\\u2026\\u2030\\u2039\\u203A\\u20AC\\u2122';
const NON_WINANSI_RE = new RegExp(`[^${WINANSI_CHARS}]`, 'gu');
const WINANSI_ONLY_RE = new RegExp(`^[${WINANSI_CHARS}]*$`, 'u');

/** Last resort for a non-WinAnsi char: NFKD-fold it (ā → a); else drop it. */
const foldChar = (ch) => {
  const folded = ch.normalize('NFKD').replace(/[̀-ͯ]/g, '');
  return folded !== ch && WINANSI_ONLY_RE.test(folded) ? folded : '';
};

export function toWinAnsi(text) {
  let out = String(text ?? '');
  for (const [re, repl] of NON_WINANSI_MAP) out = out.replace(re, repl);
  return out.replace(NON_WINANSI_RE, foldChar);
}

const TEAL = '#2a7f74'; // Modern's accent — same value as the preview
const TEAL_RULE = '#b9d5d1'; // TEAL at ~33% over white (react-pdf-safe hex)

const TIMES = {
  regular: 'Times-Roman',
  bold: 'Times-Bold',
  italic: 'Times-Italic',
};
const HELVETICA = {
  regular: 'Helvetica',
  bold: 'Helvetica-Bold',
  italic: 'Helvetica-Oblique',
};

/**
 * The four PDF design specs. Sizes are in pt, scaled from the preview's px
 * values (720px sheet → 595pt A4 page, ≈0.83×), lineHeight is a multiplier.
 */
const PDF_TEMPLATES = {
  classic: {
    fonts: TIMES,
    body: { fontSize: 10.5, lineHeight: 1.45 },
    headerAlign: 'center',
    name: { fontSize: 21, font: TIMES.regular, letterSpacing: 0.6, color: '#171717' },
    contact: { fontSize: 9.5, color: '#525252', marginTop: 3 },
    section: { marginTop: 14 },
    heading: {
      fontSize: 10,
      font: TIMES.bold,
      color: '#171717',
      letterSpacing: 1,
      rule: { color: '#9ca3af', width: 0.75 },
      paddingBottom: 3,
      marginBottom: 7,
    },
    blockGap: 4,
    entry: {
      marginTop: 7,
      titleSize: 10.5,
      datesSize: 9.5,
      datesFont: TIMES.italic,
      datesColor: '#525252',
    },
    bullet: { indent: 12, gap: 3, markerColor: '#737373' },
    paragraphColor: '#262626',
    link: { color: '#262626', decorationColor: '#a3a3a3' },
  },

  modern: {
    fonts: HELVETICA,
    body: { fontSize: 10.5, lineHeight: 1.5 },
    headerAlign: 'left',
    name: { fontSize: 22, font: HELVETICA.bold, letterSpacing: -0.2, color: '#171717' },
    contact: { fontSize: 9.5, color: '#737373', marginTop: 4 },
    section: { marginTop: 18 },
    heading: {
      fontSize: 9,
      font: HELVETICA.bold,
      color: TEAL,
      letterSpacing: 1.5,
      rule: { color: TEAL_RULE, width: 1.2 },
      paddingBottom: 4,
      marginBottom: 8,
    },
    blockGap: 5,
    entry: {
      marginTop: 9,
      titleSize: 10.5,
      datesSize: 9.5,
      datesFont: HELVETICA.regular,
      datesColor: '#737373',
    },
    bullet: { indent: 12, gap: 4, markerColor: TEAL },
    paragraphColor: '#404040',
    link: { color: '#262626', decorationColor: TEAL },
  },

  compact: {
    fonts: HELVETICA,
    body: { fontSize: 9, lineHeight: 1.3 },
    headerAlign: 'left',
    name: { fontSize: 15, font: HELVETICA.bold, letterSpacing: -0.2, color: '#171717' },
    contact: { fontSize: 8, color: '#525252', marginTop: 2 },
    section: { marginTop: 8 },
    heading: {
      fontSize: 8.5,
      font: HELVETICA.bold,
      color: '#171717',
      letterSpacing: 0.6,
      rule: null,
      paddingBottom: 0,
      marginBottom: 3,
    },
    blockGap: 2,
    entry: {
      marginTop: 4,
      titleSize: 9,
      datesSize: 8,
      datesFont: HELVETICA.regular,
      datesColor: '#525252',
    },
    bullet: { indent: 10, gap: 1.5, markerColor: '#737373' },
    paragraphColor: '#262626',
    link: { color: '#262626', decorationColor: '#a3a3a3' },
  },

  minimal: {
    fonts: HELVETICA,
    body: { fontSize: 10.5, lineHeight: 1.5 },
    headerAlign: 'left',
    // No Helvetica-Light in the standard 14 — regular weight at a larger
    // size reads "light" next to the bold entry titles.
    name: { fontSize: 24, font: HELVETICA.regular, letterSpacing: -0.2, color: '#171717' },
    contact: { fontSize: 9.5, color: '#737373', marginTop: 5 },
    section: { marginTop: 20 },
    heading: {
      fontSize: 9,
      font: HELVETICA.regular,
      color: '#a3a3a3',
      letterSpacing: 2.4,
      rule: null,
      paddingBottom: 0,
      marginBottom: 8,
    },
    blockGap: 5,
    entry: {
      marginTop: 11,
      titleSize: 10.5,
      datesSize: 9.5,
      datesFont: HELVETICA.regular,
      datesColor: '#a3a3a3',
    },
    bullet: { indent: 12, gap: 4, markerColor: '#d4d4d4' },
    paragraphColor: '#404040',
    link: { color: '#404040', decorationColor: '#d4d4d4' },
  },
};

/**
 * Resolve a template id to its full PDF spec: the design above + page
 * margins derived from the web template's `pageMargin`. Unknown ids fall
 * back to the default template, same as the preview.
 */
export function resolvePdfTemplate(id) {
  const key = PDF_TEMPLATES[id] && TEMPLATES[id] ? id : DEFAULT_TEMPLATE;
  return {
    id: key,
    margin: marginToPt(TEMPLATES[key].pageMargin),
    ...PDF_TEMPLATES[key],
  };
}

export const PDF_TEMPLATE_IDS = Object.keys(PDF_TEMPLATES);
