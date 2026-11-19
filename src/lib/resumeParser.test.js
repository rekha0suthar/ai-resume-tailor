import { describe, it, expect } from 'vitest';
import { parseResume, parseRoleHeading, splitInline, stripBold, sectionHeadings } from './resumeParser.js';

const FULL = `# Riya Sharma
riya.sharma@email.com | +91 98765 43210 | github.com/riya | linkedin.com/in/riya

## Summary
Front-end leaning **full-stack engineer** with 2 years of React experience.

## Experience

### Frontend Engineer, Brightcart (Jan 2024 – present)
- Built a product-listing page for **50k SKUs** in React.
- Migrated the checkout flow to hooks; bundle size down 18%.

### Intern, Acme (2023)
- Did intern things.

## Skills
- JavaScript, TypeScript, React
- Node.js, Express

## Education
B.E. Computer Science, BMS College of Engineering (2018–2022).`;

describe('parseResume', () => {
  it('extracts name from the # heading', () => {
    expect(parseResume(FULL).name).toBe('Riya Sharma');
  });

  it('extracts the contact line directly under the name', () => {
    expect(parseResume(FULL).contact).toBe(
      'riya.sharma@email.com | +91 98765 43210 | github.com/riya | linkedin.com/in/riya'
    );
  });

  it('splits ## headings into sections in order', () => {
    const doc = parseResume(FULL);
    expect(doc.sections.map((s) => s.heading)).toEqual([
      'Summary',
      'Experience',
      'Skills',
      'Education',
    ]);
  });

  it('parses ### role headings into entries with title + dates', () => {
    const exp = parseResume(FULL).sections[1];
    expect(exp.blocks).toHaveLength(2);
    const [role, intern] = exp.blocks;
    expect(role.type).toBe('entry');
    expect(role.title).toBe('Frontend Engineer, Brightcart');
    expect(role.dates).toBe('Jan 2024 – present');
    expect(intern.title).toBe('Intern, Acme');
    expect(intern.dates).toBe('2023');
  });

  it('nests bullets under their role entry', () => {
    const role = parseResume(FULL).sections[1].blocks[0];
    expect(role.blocks).toEqual([
      {
        type: 'ul',
        items: [
          'Built a product-listing page for **50k SKUs** in React.',
          'Migrated the checkout flow to hooks; bundle size down 18%.',
        ],
      },
    ]);
  });

  it('keeps section-level bullets and paragraphs', () => {
    const doc = parseResume(FULL);
    expect(doc.sections[2].blocks).toEqual([
      { type: 'ul', items: ['JavaScript, TypeScript, React', 'Node.js, Express'] },
    ]);
    expect(doc.sections[3].blocks).toEqual([
      { type: 'p', text: 'B.E. Computer Science, BMS College of Engineering (2018–2022).' },
    ]);
  });

  it('handles a plain-text name (no # heading) with a contact line', () => {
    const doc = parseResume('Riya Sharma\nriya@email.com | github.com/riya\n\n## Skills\n- React');
    expect(doc.name).toBe('Riya Sharma');
    expect(doc.contact).toBe('riya@email.com | github.com/riya');
    expect(doc.sections[0].heading).toBe('Skills');
  });

  it('puts pre-section prose into a heading-less leading section', () => {
    const doc = parseResume('# Riya Sharma\n\nSeasoned engineer who writes long summary sentences here.\n\n## Skills\n- React');
    expect(doc.name).toBe('Riya Sharma');
    expect(doc.contact).toBeNull();
    expect(doc.sections[0]).toEqual({
      heading: null,
      blocks: [{ type: 'p', text: 'Seasoned engineer who writes long summary sentences here.' }],
    });
  });

  it('supports * and • bullets', () => {
    const doc = parseResume('## Skills\n* React\n• Node.js');
    expect(doc.sections[0].blocks).toEqual([{ type: 'ul', items: ['React', 'Node.js'] }]);
  });

  it('handles markdown with no sections at all', () => {
    const doc = parseResume('Just one paragraph of text that is way too long to be a name, truly.');
    expect(doc.name).toBeNull();
    expect(doc.sections).toEqual([
      {
        heading: null,
        blocks: [
          { type: 'p', text: 'Just one paragraph of text that is way too long to be a name, truly.' },
        ],
      },
    ]);
  });

  it('handles empty and non-string input', () => {
    for (const input of ['', null, undefined, 42]) {
      expect(parseResume(input)).toEqual({ name: null, contact: null, sections: [] });
    }
  });

  it('treats a stray late # heading as a section, not a second name', () => {
    const doc = parseResume('# Riya Sharma\n\n## Skills\n- React\n\n# Projects\n- Finance app');
    expect(doc.name).toBe('Riya Sharma');
    expect(doc.sections.map((s) => s.heading)).toEqual(['Skills', 'Projects']);
  });

  // Shapes observed in real model output (name as "## ", sections as "### ",
  // a labelled contact line, markdown links).
  it('takes a leading "## Name — Title" heading as the name and promotes "###" to sections', () => {
    const doc = parseResume(
      '## Riya Sharma — Full-Stack Developer\n\n**Contact:** riya@email.com | [github.com/riya](https://github.com/riya)\n\n### Summary\nEngineer.\n\n### Skills\n- React'
    );
    expect(doc.name).toBe('Riya Sharma — Full-Stack Developer');
    // The "Contact:" label is dropped; the LINK itself is preserved so the
    // sheet can render it as a real <a href>.
    expect(doc.contact).toBe('riya@email.com | [github.com/riya](https://github.com/riya)');
    expect(doc.sections.map((s) => s.heading)).toEqual(['Summary', 'Skills']);
  });

  it('does NOT mistake a leading "## Summary" section for a name', () => {
    const doc = parseResume('## Summary\nEngineer with experience.\n\n## Skills\n- React');
    expect(doc.name).toBeNull();
    expect(doc.sections.map((s) => s.heading)).toEqual(['Summary', 'Skills']);
  });

  it('keeps "### " as role entries when "## " sections exist', () => {
    const doc = parseResume('## Experience\n### Engineer (2020 – 2022)\n- Did work');
    expect(doc.sections[0].blocks[0].type).toBe('entry');
  });

  it('strips bold markers from names and section headings', () => {
    const doc = parseResume('# **Riya Sharma**\n\n## **Skills**\n- React');
    expect(doc.name).toBe('Riya Sharma');
    expect(doc.sections[0].heading).toBe('Skills');
  });
});

describe('parseRoleHeading', () => {
  it('splits a parenthesised date range', () => {
    expect(parseRoleHeading('Frontend Engineer, Brightcart (Jan 2024 – present)')).toEqual({
      title: 'Frontend Engineer, Brightcart',
      dates: 'Jan 2024 – present',
    });
  });

  it('splits " | " and " — " separated date ranges', () => {
    expect(parseRoleHeading('Frontend Engineer | Jan 2024 – Present')).toEqual({
      title: 'Frontend Engineer',
      dates: 'Jan 2024 – Present',
    });
    expect(parseRoleHeading('Frontend Engineer — 2022–2024')).toEqual({
      title: 'Frontend Engineer',
      dates: '2022–2024',
    });
  });

  it('keeps non-date parentheses in the title', () => {
    expect(parseRoleHeading('Engineer (Platform Team)')).toEqual({
      title: 'Engineer (Platform Team)',
      dates: null,
    });
  });

  it('returns null dates when there is no date range', () => {
    expect(parseRoleHeading('Personal-finance dashboard')).toEqual({
      title: 'Personal-finance dashboard',
      dates: null,
    });
  });
});

describe('splitInline / stripBold', () => {
  it('splits **bold** spans', () => {
    expect(splitInline('shipped **two** apps')).toEqual([
      { text: 'shipped ', bold: false },
      { text: 'two', bold: true },
      { text: ' apps', bold: false },
    ]);
  });

  it('leaves plain text as one segment and handles empties', () => {
    expect(splitInline('plain')).toEqual([{ text: 'plain', bold: false }]);
    expect(splitInline('')).toEqual([]);
    expect(splitInline(null)).toEqual([]);
  });

  it('preserves [text](url) links as structured segments', () => {
    expect(splitInline('See [my portfolio](https://riya.dev) for more')).toEqual([
      { text: 'See ', bold: false },
      { text: 'my portfolio', bold: false, url: 'https://riya.dev' },
      { text: ' for more', bold: false },
    ]);
  });

  it('preserves links in a contact line (multiple links)', () => {
    const segs = splitInline(
      'riya@email.com | [github.com/riya](https://github.com/riya) | [LinkedIn](https://linkedin.com/in/riya)'
    );
    const links = segs.filter((s) => s.url);
    expect(links).toEqual([
      { text: 'github.com/riya', bold: false, url: 'https://github.com/riya' },
      { text: 'LinkedIn', bold: false, url: 'https://linkedin.com/in/riya' },
    ]);
  });

  it('preserves links inside bullets alongside bold', () => {
    expect(
      splitInline('Built **Finance app** — [source](https://github.com/r/finance) in React')
    ).toEqual([
      { text: 'Built ', bold: false },
      { text: 'Finance app', bold: true },
      { text: ' — ', bold: false },
      { text: 'source', bold: false, url: 'https://github.com/r/finance' },
      { text: ' in React', bold: false },
    ]);
  });

  it('turns bare URLs into links and trims trailing punctuation', () => {
    expect(splitInline('Deployed at https://finance.riya.dev.')).toEqual([
      { text: 'Deployed at ', bold: false },
      { text: 'https://finance.riya.dev', bold: false, url: 'https://finance.riya.dev' },
      { text: '.', bold: false },
    ]);
  });

  it('gives www. bare URLs an https:// href', () => {
    expect(splitInline('www.riya.dev')).toEqual([
      { text: 'www.riya.dev', bold: false, url: 'https://www.riya.dev' },
    ]);
  });

  it('handles bold+link mixes in both nestings', () => {
    expect(splitInline('[**GitHub**](https://github.com/riya)')).toEqual([
      { text: 'GitHub', bold: true, url: 'https://github.com/riya' },
    ]);
    expect(splitInline('**[GitHub](https://github.com/riya)**')).toEqual([
      { text: 'GitHub', bold: true, url: 'https://github.com/riya' },
    ]);
  });

  it('drops the link markup when the URL is empty', () => {
    expect(splitInline('[just text]()')).toEqual([{ text: 'just text', bold: false }]);
  });

  it('stripBold flattens bold and links to plain text', () => {
    expect(stripBold('**Riya** Sharma')).toBe('Riya Sharma');
    expect(stripBold('[Riya](https://riya.dev) Sharma')).toBe('Riya Sharma');
  });
});

describe('parseResume — links', () => {
  it('keeps link markdown in the contact line (label stripped)', () => {
    const doc = parseResume(
      '# Riya Sharma\n**Contact:** riya@email.com | [Portfolio](https://riya.dev)\n\n## Skills\n- React'
    );
    expect(doc.contact).toBe('riya@email.com | [Portfolio](https://riya.dev)');
    expect(splitInline(doc.contact).filter((s) => s.url)).toHaveLength(1);
  });

  it('keeps link markdown inside bullets', () => {
    const doc = parseResume('## Projects\n- Finance app — [source](https://github.com/r/f).');
    expect(doc.sections[0].blocks[0].items[0]).toBe(
      'Finance app — [source](https://github.com/r/f).'
    );
  });
});

describe('sectionHeadings', () => {
  it('returns named section headings in document order', () => {
    expect(sectionHeadings(FULL)).toEqual(['Summary', 'Experience', 'Skills', 'Education']);
  });

  it('skips the unnamed leading section and dedupes case-insensitively', () => {
    const md = [
      'A loose intro paragraph before any heading.',
      '',
      '## Skills',
      '- React',
      '',
      '## skills',
      '- Node',
      '',
      '## Projects',
      '- Thing',
    ].join('\n');
    expect(sectionHeadings(md)).toEqual(['Skills', 'Projects']);
  });

  it('handles promoted ### sections (no ## in the document)', () => {
    const md = ['### Summary', 'Text.', '', '### Experience', '- Bullet'].join('\n');
    expect(sectionHeadings(md)).toEqual(['Summary', 'Experience']);
  });

  it('is safe on garbage input', () => {
    expect(sectionHeadings('')).toEqual([]);
    expect(sectionHeadings(null)).toEqual([]);
    expect(sectionHeadings(undefined)).toEqual([]);
  });
});
