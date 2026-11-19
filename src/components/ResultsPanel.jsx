import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  FileDown,
  KeyRound,
  Loader2,
  MessagesSquare,
  MessageSquare,
  Pencil,
  Printer,
  Target,
} from 'lucide-react';
import toast from 'react-hot-toast';
import ChatRefine from './ChatRefine.jsx';
import ScoreStrip from './ScoreStrip.jsx';
import PageBoundary from './PageBoundary.jsx';
import ResumePreview, { TEMPLATES, TEMPLATE_IDS, DEFAULT_TEMPLATE } from './ResumePreview.jsx';
import { parseResume, sectionHeadings } from '../lib/resumeParser.js';
import { pdfFileName } from '../pdf/pdfStyles.js';

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.25 },
};

/* ------------------------------------------------------------------ */
/* Secondary panels: collapsible, count-badged                         */
/* ------------------------------------------------------------------ */

const Collapse = ({ icon: Icon, title, subtitle, count, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <motion.section
      {...fadeIn}
      className="overflow-hidden rounded-2xl border border-white/10 bg-surface-2 shadow-panel"
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-surface-1 sm:px-6"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent/10 ring-1 ring-accent/25">
            <Icon size={14} className="text-accent-bright" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-white">
              {title}
            </span>
            {subtitle && (
              <span className="block truncate text-xs text-slate-400">{subtitle}</span>
            )}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2.5">
          {typeof count === 'number' && count > 0 && (
            <span className="rounded-full border border-white/10 bg-surface-2 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-slate-300">
              {count}
            </span>
          )}
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <div className="px-5 pb-5 sm:px-6 sm:pb-6">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
};

const SkeletonRows = ({ rows = 3 }) => (
  <div className="grid gap-3" aria-hidden="true">
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="grid gap-2 rounded-xl border border-white/10 bg-surface-1 p-4">
        <div className="h-3 w-1/3 animate-pulse rounded bg-white/10" />
        <div className="h-3 w-3/4 animate-pulse rounded bg-white/10" />
      </div>
    ))}
  </div>
);

/* ------------------------------------------------------------------ */
/* "What changed & why" cards (the bullet rationale)                   */
/* ------------------------------------------------------------------ */

const BulletCard = ({ bullet, index }) => {
  const [editValue, setEditValue] = useState(bullet.rewrite || '');
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Keep editValue in sync if the bullet streams in further updates
  useEffect(() => {
    if (!editing) setEditValue(bullet.rewrite || '');
  }, [bullet.rewrite, editing]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(editValue);
      setCopied(true);
      toast.success('Rewrite copied');
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error('Could not copy.');
    }
  };

  return (
    <motion.li
      layout
      {...fadeIn}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className="rounded-xl border border-white/10 bg-surface-1 p-4"
    >
      {bullet.original && (
        <>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Before
          </span>
          <p className="mt-1 text-sm text-slate-400 line-through decoration-slate-500/40">
            {bullet.original}
          </p>
        </>
      )}

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
          After
        </span>
        <div className="flex items-center gap-2">
          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-300 hover:text-white"
            >
              <Pencil size={11} aria-hidden="true" /> Edit
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-[11px] font-semibold uppercase tracking-wider text-accent hover:text-accent-bright"
            >
              Done
            </button>
          )}
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-accent hover:text-accent-bright"
          >
            {copied ? <Check size={11} aria-hidden="true" /> : <Copy size={11} aria-hidden="true" />}{' '}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {editing ? (
        <textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          rows={3}
          className="mt-1 w-full resize-y rounded-lg border border-white/15 bg-surface-3 px-3 py-2 text-sm text-white focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      ) : (
        <p className="mt-1 text-sm text-white">{editValue}</p>
      )}

      {bullet.why && (
        <p className="mt-2 text-xs italic text-slate-400">Why: {bullet.why}</p>
      )}
    </motion.li>
  );
};

/* ------------------------------------------------------------------ */
/* Resume hero: template tabs, actions, sheet, print portal            */
/* ------------------------------------------------------------------ */

const TEMPLATE_STORAGE_KEY = 'ai-resume-tailor:template';

const loadStoredTemplate = () => {
  try {
    const stored = window.localStorage.getItem(TEMPLATE_STORAGE_KEY);
    return TEMPLATES[stored] ? stored : DEFAULT_TEMPLATE;
  } catch {
    return DEFAULT_TEMPLATE;
  }
};

/** Template tabs above the sheet. */
const TemplateTabs = ({ value, onChange }) => (
  <div
    role="radiogroup"
    aria-label="Resume template"
    className="flex flex-wrap items-center gap-1.5"
  >
    {TEMPLATE_IDS.map((id) => {
      const t = TEMPLATES[id];
      const active = id === value;
      return (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={active}
          onClick={() => onChange(id)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
            active
              ? 'border-accent/70 bg-accent/15 text-white'
              : 'border-white/10 bg-surface-1 text-slate-300 hover:border-white/25 hover:text-white'
          }`}
        >
          {/* Tiny visual hint: the initial letter, set in the template's own type. */}
          <span
            aria-hidden="true"
            className="flex h-4 w-4 items-center justify-center rounded-[3px] bg-white text-[11px] leading-none text-neutral-800"
            style={{ fontFamily: t.fontFamily, ...t.swatchStyle }}
          >
            {t.label[0]}
          </span>
          {t.label}
        </button>
      );
    })}
  </div>
);

/**
 * Hidden copy of the resume rendered straight under <body> for printing.
 * The print stylesheet hides everything else and shows only this, and the
 * inline <style> gives @page the selected template's print margins.
 */
const ResumePrintSheet = ({ markdown, template }) => {
  const t = TEMPLATES[template] || TEMPLATES[DEFAULT_TEMPLATE];
  return createPortal(
    <div id="resume-print-root" aria-hidden="true">
      <style>{`@media print { @page { size: A4; margin: ${t.pageMargin}; } }`}</style>
      <ResumePreview markdown={markdown} template={template} />
    </div>,
    document.body
  );
};

/** Paper-sheet skeleton while the tailored resume is still streaming in. */
const SheetSkeleton = () => (
  <div
    className="sheet-loading mx-auto w-full max-w-[720px] rounded-sm bg-white p-8 shadow-[0_8px_30px_rgba(0,0,0,0.35)] ring-1 ring-black/10 sm:p-12"
    aria-hidden="true"
  >
    <div className="h-6 w-48 rounded bg-neutral-200" />
    <div className="mt-2 h-3 w-64 rounded bg-neutral-100" />
    {[0, 1, 2].map((s) => (
      <div key={s} className="mt-8">
        <div className="h-3.5 w-28 rounded bg-neutral-200" />
        <div className="mt-3 grid gap-2">
          <div className="h-3 w-full rounded bg-neutral-100" />
          <div className="h-3 w-5/6 rounded bg-neutral-100" />
          <div className="h-3 w-4/6 rounded bg-neutral-100" />
        </div>
      </div>
    ))}
  </div>
);

const ResumeHero = ({ markdown, busy, onSectionEdit }) => {
  const [copied, setCopied] = useState(false);
  const [template, setTemplate] = useState(loadStoredTemplate);
  const [overflows, setOverflows] = useState(false);
  const [generating, setGenerating] = useState(false);

  const changeTemplate = (id) => {
    setTemplate(id);
    try {
      window.localStorage.setItem(TEMPLATE_STORAGE_KEY, id);
    } catch {
      /* private mode etc. — selection just won't persist */
    }
  };

  // Direct PDF download (what testers actually asked for — twice): render
  // the parsed resume through @react-pdf and save "<Name> - Resume.pdf".
  // The PDF engine is heavy, so it loads through a dynamic import on first
  // click and stays out of the main chunk; ResumePdf re-exports `pdf` so
  // one import covers both.
  const downloadPdf = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const { default: ResumePdf, pdf } = await import('../pdf/ResumePdf.jsx');
      const doc = parseResume(markdown);
      const blob = await pdf(<ResumePdf doc={doc} template={template} />).toBlob();
      const fileName = pdfFileName(doc.name);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`${fileName} downloaded`);
    } catch (err) {
      console.error('[pdf download]', err);
      toast.error('PDF generation failed. Try Print… as a fallback.');
    } finally {
      setGenerating(false);
    }
  };

  // Print path (kept as a quiet alternative): swap the document title so a
  // "Save as PDF" destination suggests a sensible filename, print, then
  // restore (finally + afterprint both fire; restoring twice is harmless).
  const printSheet = () => {
    const prevTitle = document.title;
    const restore = () => {
      document.title = prevTitle;
    };
    const name = (parseResume(markdown).name || '').replace(/[\\/:*?"<>|]+/g, ' ').trim();
    document.title = name ? `${name} - Resume` : 'Tailored Resume';
    window.addEventListener('afterprint', restore, { once: true });
    window.setTimeout(() => {
      try {
        window.print();
      } finally {
        restore();
      }
    }, 50);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      toast.success('Markdown copied');
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error('Could not copy.');
    }
  };

  const downloadMd = () => {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tailored-resume.md';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success('tailored-resume.md downloaded');
  };

  return (
    <motion.div {...fadeIn} className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
        <TemplateTabs value={template} onChange={changeTemplate} />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-400 transition hover:bg-surface-3 hover:text-white"
          >
            {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
            {copied ? 'Copied' : 'Copy markdown'}
          </button>
          <button
            type="button"
            onClick={downloadMd}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-400 transition hover:bg-surface-3 hover:text-white"
          >
            <Download size={13} aria-hidden="true" /> .md
          </button>
          <button
            type="button"
            onClick={printSheet}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-400 transition hover:bg-surface-3 hover:text-white"
          >
            <Printer size={13} aria-hidden="true" /> Print…
          </button>
          <button
            type="button"
            onClick={downloadPdf}
            disabled={generating}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-accent/25 transition hover:bg-accent-bright disabled:cursor-wait disabled:opacity-70"
          >
            {generating ? (
              <>
                <Loader2 size={15} aria-hidden="true" className="animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <FileDown size={15} aria-hidden="true" /> Download PDF
              </>
            )}
          </button>
        </div>
      </div>

      {overflows && !busy && (
        <p className="mb-2 text-center text-[11px] text-warn/90">
          Runs past one page — try &ldquo;Fit to one page&rdquo; or the Compact
          template.
        </p>
      )}
      <PageBoundary template={template} onOverflowChange={setOverflows}>
        <div className={busy ? 'sheet-loading rounded-sm' : undefined}>
          <ResumePreview markdown={markdown} template={template} onSectionEdit={onSectionEdit} />
        </div>
      </PageBoundary>
      <p className="mt-2.5 text-center text-[11px] text-slate-500">
        Hover a section heading on the sheet to request changes to just that
        section.
      </p>
      <ResumePrintSheet markdown={markdown} template={template} />
    </motion.div>
  );
};

/** Chat-column placeholder while the first tailor pass is still streaming. */
const RefinePlaceholder = () => (
  <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 bg-surface-1 p-6 text-center">
    <MessagesSquare size={18} className="text-slate-500" aria-hidden="true" />
    <p className="text-sm font-medium text-slate-400">Refinement chat</p>
    <p className="max-w-[26ch] text-xs text-slate-500">
      Unlocks when the tailored resume finishes generating.
    </p>
  </div>
);

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

const importanceClasses = {
  'must-have': 'bg-error/15 text-error border-error/40',
  'nice-to-have': 'bg-warn/15 text-warn border-warn/40',
};

const ResultsPanel = ({ result, status, refine }) => {
  const streaming = status === 'streaming';
  const bullets = result?.tailored_bullets || [];
  const keywords = result?.missing_keywords || [];
  const questions = result?.interview_questions || [];
  const originalScore = result?.original_match_score ?? null;
  const tailoredScore = result?.tailored_match_score ?? null;
  const scoreTrail = refine?.scoreTrail || [];

  // Once a refinement session is active, the sheet shows the refined version
  // (live-streaming partial while a turn is in flight); copy/download act on
  // whatever is displayed, i.e. always the CURRENT version.
  const refinedResume = refine ? refine.liveResume || refine.currentResume : '';
  const tailoredResume = refinedResume || result?.tailoredResume || '';
  const refining = refine?.status === 'streaming';

  // Per-section prefill: pencil on a preview heading → chat input.
  const [prefill, setPrefill] = useState(null);
  const requestSectionEdit = (heading) =>
    setPrefill({ text: `In the ${heading} section: `, nonce: Date.now() });

  // Section chips derive from the CURRENT resume, so they track refinements.
  const sections = useMemo(
    () => (refine?.currentResume ? sectionHeadings(refine.currentResume) : []),
    [refine?.currentResume]
  );

  const hasAny =
    bullets.length ||
    keywords.length ||
    questions.length ||
    tailoredResume ||
    originalScore != null;
  if (!hasAny && !streaming) return null;

  return (
    <div className="mt-8 grid gap-5 sm:gap-6">
      {/* 1 — Score strip: before → after, live-updated by refinements. */}
      <ScoreStrip
        original={originalScore}
        tailored={tailoredScore}
        trail={scoreTrail}
        streaming={streaming}
      />

      {/* 2 — Hero: the resume sheet + docked refinement chat. */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        {tailoredResume ? (
          <ResumeHero
            markdown={tailoredResume}
            busy={streaming || refining}
            onSectionEdit={refine?.active ? requestSectionEdit : undefined}
          />
        ) : (
          <SheetSkeleton />
        )}

        <div className="lg:sticky lg:top-20">
          {refine?.active ? (
            <ChatRefine refine={refine} sections={sections} prefill={prefill} />
          ) : (
            <RefinePlaceholder />
          )}
        </div>
      </div>

      {/* 3 — Secondary insight panels, least-urgent last. */}
      <Collapse
        icon={KeyRound}
        title="Keyword gaps"
        subtitle="JD skills your original resume doesn't show yet"
        count={keywords.length}
        defaultOpen
      >
        {keywords.length === 0 && streaming ? (
          <SkeletonRows rows={3} />
        ) : keywords.length === 0 ? (
          <p className="text-sm text-slate-400">No significant gaps found.</p>
        ) : (
          <ul className="grid gap-3">
            <AnimatePresence>
              {keywords.map((k, i) => (
                <motion.li
                  key={`${i}-${k.keyword}`}
                  layout
                  {...fadeIn}
                  transition={{ duration: 0.25, delay: i * 0.04 }}
                  className="flex flex-col gap-1 rounded-xl border border-white/10 bg-surface-1 p-4 sm:flex-row sm:items-start sm:gap-4"
                >
                  <span
                    className={`shrink-0 self-start rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      importanceClasses[k.importance] || 'border-white/20 bg-surface-2 text-slate-300'
                    }`}
                  >
                    {k.importance || 'optional'}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{k.keyword}</p>
                    {k.suggestion && (
                      <p className="mt-1 text-xs text-slate-400">{k.suggestion}</p>
                    )}
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </Collapse>

      <Collapse
        icon={Target}
        title="What changed & why"
        subtitle="The key rewrites behind the tailored version"
        count={bullets.length}
      >
        {bullets.length === 0 && streaming ? (
          <SkeletonRows rows={3} />
        ) : (
          <ul className="grid gap-4">
            <AnimatePresence>
              {bullets.map((b, i) => (
                <BulletCard key={`${i}-${b.original?.slice(0, 24)}`} bullet={b} index={i} />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </Collapse>

      <Collapse
        icon={MessageSquare}
        title="Interview prep"
        subtitle="Likely questions for this resume + JD pairing"
        count={questions.length}
      >
        {questions.length === 0 && streaming ? (
          <SkeletonRows rows={3} />
        ) : (
          <ol className="grid gap-4">
            <AnimatePresence>
              {questions.map((q, i) => (
                <motion.li
                  key={`${i}-${q.question?.slice(0, 24)}`}
                  layout
                  {...fadeIn}
                  transition={{ duration: 0.25, delay: i * 0.04 }}
                  className="rounded-xl border border-white/10 bg-surface-1 p-4"
                >
                  <p className="text-sm font-semibold text-white">
                    {i + 1}. {q.question}
                  </p>
                  {q.what_they_want && (
                    <p className="mt-2 text-xs text-slate-400">
                      <span className="font-semibold text-slate-300">What they're probing:</span>{' '}
                      {q.what_they_want}
                    </p>
                  )}
                  {q.prep_tip && (
                    <p className="mt-1 text-xs text-slate-400">
                      <span className="font-semibold text-slate-300">Prep tip:</span> {q.prep_tip}
                    </p>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
        )}
      </Collapse>
    </div>
  );
};

export default ResultsPanel;
