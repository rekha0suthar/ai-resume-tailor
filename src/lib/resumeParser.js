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

/** Common resume section names — a heading matching these is never the candidate name. */
const SECTION_WORDS_RE =
  /^(?:professional\s+|work\s+|technical\s+|core\s+|key\s+)?(?:summary|skills?|experience|employment|education|projects?|certifications?|contact|objective|achievements?|awards?|publications?|interests?|languages?|profile|about)\b/i;

/** Flatten [text](url) links — on a paper resume the text is what matters. */
const flattenLinks = (text) =>
  String(text).replace(/\[([^\]]+)\]\(([^)]*)\)/g, '$1');

/**
 * Split inline markdown into segments: [{ text, bold }].
 * **bold** is the only inline markup the resume dialect uses;
 * [text](url) links are flattened to their text.
 */
export function splitBold(text) {
  if (!text) return [];
  return flattenLinks(text)
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

/** A leading "## "/"### " heading that reads like a person, not a section. */
const looksLikeNameHeading = (text) =>
  text.length <= 80 &&
  /\s/.test(text) &&
  !/[.:;]$/.test(text) &&
  !SECTION_WORDS_RE.test(text) &&
  !CONTACTISH_RE.test(text);

const headingLevel = (line) =>
  line.startsWith('### ') ? 3 : line.startsWith('## ') ? 2 : line.startsWith('# ') ? 1 : 0;

/**
 * Parse tailored-resume markdown into the document structure above.
 * Pure function; never throws on malformed input.
 */
export function parseResume(markdown) {
  const doc = { name: null, contact: null, sections: [] };
  if (!markdown || typeof markdown !== 'string') return doc;

  const lines = markdown.split('\n').map((l) => l.trim());

  // --- Pre-scan: which line (if any) is the name, and which heading level
  // marks sections. Models mostly follow the prompt ("## " sections, "### "
  // roles), but some emit the NAME as "## "/"### " and sections one level
  // down — so the levels are decided from the document, not assumed.
  let nameLineIdx = -1;
  const firstIdx = lines.findIndex((l) => l !== '');
  if (firstIdx !== -1) {
    const first = lines[firstIdx];
    const lvl = headingLevel(first);
    const text = stripBold(first.slice(lvl + 1)).trim();
    if (lvl === 1 || (lvl > 1 && looksLikeNameHeading(text))) nameLineIdx = firstIdx;
  }
  let h2Count = 0;
  let h3Count = 0;
  for (let i = 0; i < lines.length; i++) {
    if (i === nameLineIdx) continue;
    const lvl = headingLevel(lines[i]);
    if (lvl === 2) h2Count++;
    else if (lvl === 3) h3Count++;
  }
  // Normally sections are "## " and entries "### "; when a document has no
  // "## " body headings at all, its "### " headings are promoted to sections.
  const sectionLevel = h2Count > 0 || h3Count === 0 ? 2 : 3;
  const entryLevel = sectionLevel === 2 ? 3 : 99;

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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (i === nameLineIdx) {
      const lvl = headingLevel(line);
      doc.name = stripBold(line.slice(lvl + 1)).trim();
      continue;
    }

    if (!line) {
      flushBullets();
      continue;
    }

    if (isBullet(line)) {
      (bullets ||= []).push(bulletText(line));
      continue;
    }
    flushBullets();

    const lvl = headingLevel(line);

    if (lvl === entryLevel) {
      const { title, dates } = parseRoleHeading(line.slice(lvl + 1));
      entry = { type: 'entry', title, dates, blocks: [] };
      if (!section) {
        section = { heading: null, blocks: [] };
        doc.sections.push(section);
      }
      section.blocks.push(entry);
      sawContent = true;
      continue;
    }

    if (lvl > 0) {
      // Section heading — at the document's section level, or a stray
      // heading at another level (e.g. a late "# ").
      entry = null;
      section = { heading: stripBold(line.slice(lvl + 1)).trim(), blocks: [] };
      doc.sections.push(section);
      sawContent = true;
      continue;
    }

    // Plain paragraph.
    if (!doc.name && !sawContent && looksLikeName(line)) {
      // Un-markdowned name on the very first line.
      doc.name = stripBold(line).trim();
      continue;
    }
    if (doc.name && !sawContent && !doc.contact && CONTACTISH_RE.test(line)) {
      // Contact line directly under the name, before any section —
      // some models label it ("**Contact:** …"); drop the label.
      doc.contact = stripBold(line).replace(/^contact:?\s*/i, '').trim();
      continue;
    }
    target().push({ type: 'p', text: line });
    sawContent = true;
  }

  flushBullets();
  return doc;
}

/**
 * Named section headings of a resume, in document order, deduped.
 * Pure helper for the per-section refinement chips ("In the Summary
 * section: …") — the UI derives its chips from the ACTUAL parsed resume,
 * so the chips always match what's on the sheet.
 */
export function sectionHeadings(markdown) {
  const seen = new Set();
  const out = [];
  for (const s of parseResume(markdown).sections) {
    const heading = (s.heading || '').trim();
    const key = heading.toLowerCase();
    if (heading && !seen.has(key)) {
      seen.add(key);
      out.push(heading);
    }
  }
  return out;
}
