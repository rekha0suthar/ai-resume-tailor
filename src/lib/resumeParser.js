/**
 * Pure markdown → structure parser for the tailored resume.
 *
 * Extracted from the inline renderer that used to live in ResultsPanel so
 * the preview (and its print path) can render the SAME structure through
 * different templates, and so the parsing is unit-testable.
 *
 * Handles exactly the markdown dialect the prompts enforce — plus the
 * shapes models emit around it in practice:
 *   - "# Name" (or a short leading paragraph) as the candidate name
 *   - a contact line (email | phone | links) directly under the name
 *   - "## " section headings
 *   - "### " sub-headings for roles, with a trailing date range in
 *     parentheses or after " | " / " — "
 *   - "- " / "* " / "• " bullets
 *   - **bold** inline spans
 *   - plain paragraphs everywhere else
 *
 * Output shape:
 * {
 *   name:    string|null,
 *   contact: string|null,
 *   sections: [{ heading: string|null, blocks: Block[] }]
 * }
 * Block = { type: 'p', text }
 *       | { type: 'ul', items: string[] }
 *       | { type: 'entry', title, dates: string|null, blocks: Block[] }
 *
 * A leading section with heading === null holds any pre-section content
 * (e.g. a summary paragraph before the first "## ").
 */

/** Looks like it contains a date range (year or an open-ended end). */
const DATEISH_RE = /(?:19|20)\d{2}|present|current|now/i;

/** Looks like a contact line rather than prose. */
const CONTACTISH_RE =
  /@|\||·|•|linkedin|github|portfolio|https?:\/\/|www\.|\+?\d[\d\s().-]{7,}\d/i;

/**
 * Split inline markdown into segments: [{ text, bold }].
 * **bold** is the only inline markup the resume dialect uses.
 */
export function splitBold(text) {
  if (!text) return [];
  return String(text)
    .split(/(\*\*[^*]+\*\*)/g)
    .filter((part) => part !== '')
    .map((part) =>
      part.startsWith('**') && part.endsWith('**') && part.length > 4
        ? { text: part.slice(2, -2), bold: true }
        : { text: part, bold: false }
    );
}

/** Strip **bold** markers, leaving plain text (used for name / title fallbacks). */
export function stripBold(text) {
  return splitBold(text)
    .map((seg) => seg.text)
    .join('');
}

/**
 * Split a "### " role heading into { title, dates }.
 *   "Frontend Engineer, Brightcart (Jan 2024 – present)"
 *   "Frontend Engineer | Jan 2024 – Present"
 *   "Frontend Engineer — 2022–2024"
 * A trailing chunk only counts as dates if it actually looks date-ish.
 */
export function parseRoleHeading(text) {
  const raw = String(text || '').trim();

  const paren = raw.match(/^(.*\S)\s*\(([^()]*)\)$/);
  if (paren && DATEISH_RE.test(paren[2])) {
    return { title: paren[1].trim(), dates: paren[2].trim() };
  }

  for (const sep of [' | ', ' — ']) {
    const idx = raw.lastIndexOf(sep);
    if (idx > 0) {
      const tail = raw.slice(idx + sep.length).trim();
      if (tail && DATEISH_RE.test(tail)) {
        return { title: raw.slice(0, idx).trim(), dates: tail };
      }
    }
  }

  return { title: raw, dates: null };
}

const isBullet = (line) => /^(?:[-*•])\s+/.test(line);
const bulletText = (line) => line.replace(/^(?:[-*•])\s+/, '');

/** A short, period-free leading paragraph is treated as the candidate name. */
const looksLikeName = (line) =>
  line.length <= 60 && !/[.:;]$/.test(line) && !CONTACTISH_RE.test(line);

/**
 * Parse tailored-resume markdown into the document structure above.
 * Pure function; never throws on malformed input.
 */
export function parseResume(markdown) {
  const doc = { name: null, contact: null, sections: [] };
  if (!markdown || typeof markdown !== 'string') return doc;

  let section = null; // current { heading, blocks }
  let entry = null; //   current { type: 'entry', ... } inside section
  let bullets = null; // current accumulating string[]

  const target = () => {
    if (entry) return entry.blocks;
    if (!section) {
      section = { heading: null, blocks: [] };
      doc.sections.push(section);
    }
    return section.blocks;
  };

  const flushBullets = () => {
    if (bullets) {
      target().push({ type: 'ul', items: bullets });
      bullets = null;
    }
  };

  let sawContent = false; // any block-level content committed yet?

  for (const rawLine of markdown.split('\n')) {
    const line = rawLine.trim();
    if (!line) {
      flushBullets();
      continue;
    }

    if (isBullet(line)) {
      (bullets ||= []).push(bulletText(line));
      continue;
    }
    flushBullets();

    if (line.startsWith('### ')) {
      const { title, dates } = parseRoleHeading(line.slice(4));
      entry = { type: 'entry', title, dates, blocks: [] };
      if (!section) {
        section = { heading: null, blocks: [] };
        doc.sections.push(section);
      }
      section.blocks.push(entry);
      sawContent = true;
      continue;
    }

    if (line.startsWith('## ')) {
      entry = null;
      section = { heading: stripBold(line.slice(3)).trim(), blocks: [] };
      doc.sections.push(section);
      sawContent = true;
      continue;
    }

    if (line.startsWith('# ')) {
      const text = stripBold(line.slice(2)).trim();
      if (!doc.name && !sawContent) {
        doc.name = text;
      } else {
        // A stray late "# " heading — treat it as a section heading.
        entry = null;
        section = { heading: text, blocks: [] };
        doc.sections.push(section);
        sawContent = true;
      }
      continue;
    }

    // Plain paragraph.
    if (!doc.name && !sawContent && looksLikeName(line)) {
      // Un-markdowned name on the very first line.
      doc.name = stripBold(line).trim();
      continue;
    }
    if (doc.name && !sawContent && !doc.contact && CONTACTISH_RE.test(line)) {
      // Contact line directly under the name, before any section.
      doc.contact = stripBold(line).trim();
      continue;
    }
    target().push({ type: 'p', text: line });
    sawContent = true;
  }

  flushBullets();
  return doc;
}
