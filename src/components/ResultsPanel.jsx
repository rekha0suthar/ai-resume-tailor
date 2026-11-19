import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, Pencil, Target, KeyRound, MessageSquare, FileText, Download } from 'lucide-react';
import toast from 'react-hot-toast';

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.25 },
};

const Section = ({ icon: Icon, title, eyebrow, count, children }) => (
  <motion.section
    {...fadeIn}
    layout
    className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6"
  >
    <div className="mb-4 flex items-center justify-between gap-3">
      <div>
        {eyebrow && (
          <span className="mb-1 inline-block text-xs font-semibold uppercase tracking-widest text-accent">
            {eyebrow}
          </span>
        )}
        <h2 className="flex items-center gap-2 text-xl font-bold text-white sm:text-2xl">
          <Icon size={20} className="text-accent" />
          {title}
        </h2>
      </div>
      {typeof count === 'number' && count > 0 && (
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-semibold text-slate-300">
          {count}
        </span>
      )}
    </div>
    {children}
  </motion.section>
);

const Score = ({ score, streaming }) => {
  const s = Number(score) || 0;
  const color = s >= 75 ? 'text-emerald-300' : s >= 50 ? 'text-amber-300' : 'text-rose-300';
  return (
    <motion.div {...fadeIn} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4">
      <div>
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Match score (before tailoring)
        </span>
        <div className="mt-1 flex items-baseline gap-2">
          <span className={`text-3xl font-bold ${color}`}>{s}</span>
          <span className="text-sm text-slate-500">/ 100</span>
        </div>
      </div>
      {streaming && (
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          Streaming
        </div>
      )}
    </motion.div>
  );
};

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
      className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
    >
      {bullet.original && (
        <>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Original
          </span>
          <p className="mt-1 text-sm text-slate-400 line-through decoration-slate-500/40">
            {bullet.original}
          </p>
        </>
      )}

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
          Rewrite
        </span>
        <div className="flex items-center gap-2">
          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-300 hover:text-white"
            >
              <Pencil size={11} /> Edit
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
            {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {editing ? (
        <textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          rows={3}
          className="mt-1 w-full resize-y rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 text-sm text-white focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30"
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

/** Inline **bold** spans — the only inline markdown the resume uses. */
const renderInline = (text) =>
  text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i} className="font-semibold text-white">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    )
  );

/**
 * Minimal markdown renderer for the tailored resume — handles exactly what
 * the prompt asks the model to emit (## / ### headings, - bullets, bold,
 * plain paragraphs) without pulling in a markdown library.
 */
const ResumeMarkdown = ({ markdown }) => {
  const blocks = [];
  let bullets = null;
  const flushBullets = () => {
    if (bullets) {
      blocks.push({ type: 'ul', items: bullets });
      bullets = null;
    }
  };
  for (const raw of markdown.split('\n')) {
    const line = raw.trim();
    if (!line) {
      flushBullets();
      continue;
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      (bullets ||= []).push(line.slice(2));
      continue;
    }
    flushBullets();
    if (line.startsWith('### ')) blocks.push({ type: 'h3', text: line.slice(4) });
    else if (line.startsWith('## ')) blocks.push({ type: 'h2', text: line.slice(3) });
    else if (line.startsWith('# ')) blocks.push({ type: 'h1', text: line.slice(2) });
    else blocks.push({ type: 'p', text: line });
  }
  flushBullets();

  return (
    <div className="grid gap-2">
      {blocks.map((b, i) => {
        if (b.type === 'ul')
          return (
            <ul key={i} className="grid list-disc gap-1.5 pl-5 text-sm text-slate-300 marker:text-accent">
              {b.items.map((item, j) => (
                <li key={j}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        if (b.type === 'h1')
          return (
            <h3 key={i} className="text-lg font-bold text-white">
              {renderInline(b.text)}
            </h3>
          );
        if (b.type === 'h2')
          return (
            <h4 key={i} className="mt-3 border-b border-white/10 pb-1 text-sm font-bold uppercase tracking-wider text-accent first:mt-0">
              {renderInline(b.text)}
            </h4>
          );
        if (b.type === 'h3')
          return (
            <h5 key={i} className="mt-2 text-sm font-semibold text-white">
              {renderInline(b.text)}
            </h5>
          );
        return (
          <p key={i} className="text-sm text-slate-300">
            {renderInline(b.text)}
          </p>
        );
      })}
    </div>
  );
};

const TailoredResumeCard = ({ markdown }) => {
  const [copied, setCopied] = useState(false);

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

  const download = () => {
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
    <Section icon={FileText} title="Tailored resume" eyebrow="Full rewrite">
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-accent/60 hover:text-white"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy markdown'}
        </button>
        <button
          type="button"
          onClick={download}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-accent/60 hover:text-white"
        >
          <Download size={13} /> Download .md
        </button>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
        <ResumeMarkdown markdown={markdown} />
      </div>
    </Section>
  );
};

const importanceClasses = {
  'must-have': 'bg-red-500/15 text-red-200 border-red-400/40',
  'nice-to-have': 'bg-yellow-500/15 text-yellow-200 border-yellow-400/40',
};

const ResultsPanel = ({ result, status }) => {
  const streaming = status === 'streaming';
  const bullets = result?.tailored_bullets || [];
  const keywords = result?.missing_keywords || [];
  const questions = result?.interview_questions || [];
  const tailoredResume = result?.tailoredResume || '';
  const hasAny =
    bullets.length || keywords.length || questions.length || tailoredResume || result?.overall_match_score;
  if (!hasAny && !streaming) return null;

  return (
    <div className="mt-8 grid gap-5 sm:gap-6">
      <AnimatePresence mode="popLayout">
        {(typeof result?.overall_match_score === 'number' && result.overall_match_score > 0) && (
          <Score key="score" score={result.overall_match_score} streaming={streaming} />
        )}

        {bullets.length > 0 && (
          <Section key="bullets" icon={Target} title="Tailored bullets" eyebrow="Rewrite suggestions" count={bullets.length}>
            <ul className="grid gap-4">
              <AnimatePresence>
                {bullets.map((b, i) => (
                  <BulletCard key={`${i}-${b.original?.slice(0, 24)}`} bullet={b} index={i} />
                ))}
              </AnimatePresence>
            </ul>
          </Section>
        )}

        {keywords.length > 0 && (
          <Section key="keywords" icon={KeyRound} title="Missing keywords" eyebrow="Gap analysis" count={keywords.length}>
            <ul className="grid gap-3">
              <AnimatePresence>
                {keywords.map((k, i) => (
                  <motion.li
                    key={`${i}-${k.keyword}`}
                    layout
                    {...fadeIn}
                    transition={{ duration: 0.25, delay: i * 0.04 }}
                    className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-start sm:gap-4"
                  >
                    <span
                      className={`shrink-0 self-start rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        importanceClasses[k.importance] || 'border-white/20 bg-white/5 text-slate-300'
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
          </Section>
        )}

        {questions.length > 0 && (
          <Section key="questions" icon={MessageSquare} title="Likely interview questions" eyebrow="Prep ahead" count={questions.length}>
            <ol className="grid gap-4">
              <AnimatePresence>
                {questions.map((q, i) => (
                  <motion.li
                    key={`${i}-${q.question?.slice(0, 24)}`}
                    layout
                    {...fadeIn}
                    transition={{ duration: 0.25, delay: i * 0.04 }}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <p className="text-sm font-semibold text-white">
                      {i + 1}. {q.question}
                    </p>
                    {q.what_they_want && (
                      <p className="mt-2 text-xs text-slate-400">
                        <span className="font-semibold text-slate-300">What they're probing:</span> {q.what_they_want}
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
          </Section>
        )}

        {tailoredResume && (
          <TailoredResumeCard key="tailored-resume" markdown={tailoredResume} />
        )}

        {streaming && !hasAny && (
          <motion.div
            key="skeleton"
            {...fadeIn}
            className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-6"
          >
            <div className="h-3 w-1/2 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-white/10" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ResultsPanel;
