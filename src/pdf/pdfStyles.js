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
 * The standard PDF fonts only cover WinAnsi; characters outside it (arrows
 * and the like) would silently drop from the PDF. Map the few plausible
 * ones to ASCII and leave everything else (en/em dashes, bullets, curly
 * quotes, accented Latin are all IN WinAnsi and pass through untouched).
 */
const NON_WINANSI_MAP = [
  [/→|➜|➡/g, '->'], // → ➜ ➡
  [/←/g, '<-'], // ←
  [/✓|✔/g, '+'], // ✓ ✔
  [/●|▪/g, '•'], // normalize bullet variants to the WinAnsi bullet
];

export function toWinAnsi(text) {
  let out = String(text ?? '');
  for (const [re, repl] of NON_WINANSI_MAP) out = out.replace(re, repl);
  return out;
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
