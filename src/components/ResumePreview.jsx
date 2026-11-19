import React, { useMemo } from 'react';
import { Pencil } from 'lucide-react';
import { parseResume, splitBold } from '../lib/resumeParser.js';

/**
 * ResumePreview — renders the tailored-resume markdown as a paper document
 * on a light "sheet", through one of four templates.
 *
 * A template is a design system (typography + spacing + accent treatment)
 * expressed as a config object consumed by ONE render path — not four
 * copies of the component. The sheet is always dark-text-on-light
 * regardless of the app's dark theme: a resume is a paper document.
 */

const TEAL = '#2a7f74'; // Modern's single muted accent

export const TEMPLATES = {
  classic: {
    label: 'Classic',
    // Serif, centered name, small-caps headings over hairline rules,
    // conservative spacing. The safe corporate look.
    fontFamily: "Georgia, 'Times New Roman', Times, serif",
    pageMargin: '20mm 22mm',
    sheetPad: 'p-8 sm:p-12',
    body: 'text-[13px] leading-[1.45]',
    header: 'text-center',
    name: 'text-[26px] font-normal tracking-wide text-neutral-900',
    nameStyle: {},
    contact: 'mt-1 text-[12px] text-neutral-600',
    sectionGap: 'mt-5',
    heading:
      'resume-section-heading border-b border-neutral-400 pb-1 mb-2.5 text-[13px] font-semibold tracking-[0.08em] text-neutral-900',
    headingStyle: { fontVariant: 'small-caps' },
    blockGap: 'grid gap-1.5',
    entryGap: 'mt-2.5 first:mt-0',
    entryTitle: 'text-[13px] font-bold text-neutral-900',
    dates: 'shrink-0 text-[12px] italic text-neutral-600',
    paragraph: 'text-neutral-800',
    list: 'grid list-disc gap-1 pl-5 marker:text-neutral-500',
    swatchStyle: { fontFamily: "Georgia, serif", color: '#1f2937' },
  },

  modern: {
    label: 'Modern',
    // Sans, left-aligned name, one muted-teal accent on headings and
    // rules, more whitespace between sections.
    fontFamily:
      "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    pageMargin: '18mm 18mm',
    sheetPad: 'p-8 sm:p-12',
    body: 'text-[13px] leading-relaxed',
    header: 'text-left',
    name: 'text-[27px] font-bold tracking-tight text-neutral-900',
    nameStyle: {},
    contact: 'mt-1.5 text-[12px] text-neutral-500',
    sectionGap: 'mt-7',
    heading:
      'resume-section-heading border-b-2 pb-1.5 mb-3 text-[11px] font-bold uppercase tracking-[0.14em]',
    headingStyle: { color: TEAL, borderColor: `${TEAL}55` },
    blockGap: 'grid gap-2',
    entryGap: 'mt-3.5 first:mt-0',
    entryTitle: 'text-[13.5px] font-semibold text-neutral-900',
    dates: 'shrink-0 text-[12px] text-neutral-500',
    paragraph: 'text-neutral-700',
    list: 'grid list-disc gap-1.5 pl-5 marker:text-[#2a7f74]',
    swatchStyle: { color: TEAL, fontWeight: 700 },
  },

  compact: {
    label: 'Compact',
    // Sans, tight line-height and margins, smaller type — built to fit
    // one page. Bold-caps headings, minimal spacing, no rules.
    fontFamily:
      "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    pageMargin: '10mm 13mm',
    sheetPad: 'p-6 sm:p-8',
    body: 'text-[11.5px] leading-tight',
    header: 'text-left',
    name: 'text-[19px] font-bold tracking-tight text-neutral-900',
    nameStyle: {},
    contact: 'mt-0.5 text-[10.5px] text-neutral-600',
    sectionGap: 'mt-3',
    heading:
      'resume-section-heading mb-1 text-[10.5px] font-bold uppercase tracking-wide text-neutral-900',
    headingStyle: {},
    blockGap: 'grid gap-0.5',
    entryGap: 'mt-1.5 first:mt-0',
    entryTitle: 'text-[11.5px] font-bold text-neutral-900',
    dates: 'shrink-0 text-[10.5px] text-neutral-600',
    paragraph: 'text-neutral-800',
    list: 'grid list-disc gap-0.5 pl-4 marker:text-neutral-500',
    swatchStyle: { fontWeight: 700, letterSpacing: '-0.05em' },
  },

  minimal: {
    label: 'Minimal',
    // Sans, no rules or accents anywhere, generous whitespace,
    // light-weight name; role lines are the only bold element.
    fontFamily:
      "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    pageMargin: '22mm 24mm',
    sheetPad: 'p-10 sm:p-14',
    body: 'text-[13px] leading-relaxed',
    header: 'text-left',
    name: 'text-[30px] font-light tracking-tight text-neutral-900',
    nameStyle: {},
    contact: 'mt-2 text-[12px] text-neutral-500',
    sectionGap: 'mt-8',
    heading:
      'resume-section-heading mb-3 text-[11px] font-normal uppercase tracking-[0.2em] text-neutral-400',
    headingStyle: {},
    blockGap: 'grid gap-2',
    entryGap: 'mt-4 first:mt-0',
    entryTitle: 'text-[13px] font-bold text-neutral-900',
    dates: 'shrink-0 text-[12px] text-neutral-400',
    paragraph: 'text-neutral-700',
    list: 'grid list-disc gap-1.5 pl-5 marker:text-neutral-300',
    swatchStyle: { fontWeight: 300 },
  },
};

export const TEMPLATE_IDS = Object.keys(TEMPLATES);
export const DEFAULT_TEMPLATE = 'classic';

/** Inline **bold** spans. */
const Inline = ({ text }) =>
  splitBold(text).map((seg, i) =>
    seg.bold ? (
      <strong key={i} className="font-bold">
        {seg.text}
      </strong>
    ) : (
      <React.Fragment key={i}>{seg.text}</React.Fragment>
    )
  );

const Blocks = ({ blocks, t }) => (
  <div className={t.blockGap}>
    {blocks.map((b, i) => {
      if (b.type === 'ul')
        return (
          <ul key={i} className={t.list}>
            {b.items.map((item, j) => (
              <li key={j}>
                <Inline text={item} />
              </li>
            ))}
          </ul>
        );
      if (b.type === 'entry')
        return (
          <div key={i} className={`resume-entry ${t.entryGap}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <h3 className={t.entryTitle}>
                <Inline text={b.title} />
              </h3>
              {b.dates && <span className={t.dates}>{b.dates}</span>}
            </div>
            {b.blocks.length > 0 && (
              <div className="mt-1">
                <Blocks blocks={b.blocks} t={t} />
              </div>
            )}
          </div>
        );
      return (
        <p key={i} className={t.paragraph}>
          <Inline text={b.text} />
        </p>
      );
    })}
  </div>
);

/**
 * ResumePreview — pass `onSectionEdit(heading)` to make each section heading
 * editable-looking: a small pencil affordance (hover-revealed on desktop,
 * always visible on touch) that asks the chat to change JUST that section.
 * The print sheet renders without it, so nothing leaks into the PDF.
 */
const ResumePreview = ({ markdown, template = DEFAULT_TEMPLATE, onSectionEdit }) => {
  const t = TEMPLATES[template] || TEMPLATES[DEFAULT_TEMPLATE];
  const doc = useMemo(() => parseResume(markdown), [markdown]);

  return (
    <div
      className={`resume-sheet mx-auto w-full max-w-[720px] rounded-sm bg-white text-neutral-900 shadow-[0_8px_30px_rgba(0,0,0,0.35)] ring-1 ring-black/10 ${t.sheetPad} ${t.body}`}
      style={{
        fontFamily: t.fontFamily,
        colorScheme: 'light',
        printColorAdjust: 'exact',
        WebkitPrintColorAdjust: 'exact',
      }}
    >
      {(doc.name || doc.contact) && (
        <header className={`resume-entry ${t.header}`}>
          {doc.name && (
            <h1 className={t.name} style={t.nameStyle}>
              {doc.name}
            </h1>
          )}
          {doc.contact && <p className={t.contact}>{doc.contact}</p>}
        </header>
      )}

      {doc.sections.map((section, i) => (
        <section key={i} className={i === 0 && !doc.name ? '' : t.sectionGap}>
          {section.heading &&
            (onSectionEdit ? (
              <div className="group/heading relative">
                <h2 className={t.heading} style={t.headingStyle}>
                  {section.heading}
                </h2>
                <button
                  type="button"
                  onClick={() => onSectionEdit(section.heading)}
                  aria-label={`Request a change to the ${section.heading} section`}
                  title={`Ask for changes to "${section.heading}"`}
                  className="absolute right-0 top-1/2 inline-flex h-6 w-6 -translate-y-[60%] items-center justify-center rounded-md border border-neutral-300 bg-white text-neutral-500 shadow-sm transition hover:border-neutral-400 hover:text-neutral-800 focus-visible:opacity-100 sm:opacity-0 sm:group-hover/heading:opacity-100 print:hidden"
                >
                  <Pencil size={11} aria-hidden="true" />
                </button>
              </div>
            ) : (
              <h2 className={t.heading} style={t.headingStyle}>
                {section.heading}
              </h2>
            ))}
          <Blocks blocks={section.blocks} t={t} />
        </section>
      ))}
    </div>
  );
};

export default ResumePreview;
