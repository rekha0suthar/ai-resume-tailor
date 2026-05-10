import React, { useState } from 'react';

const Section = ({ title, eyebrow, children }) => (
  <section className="fade-in-up rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
    {eyebrow && (
      <span className="mb-2 inline-block text-xs font-semibold uppercase tracking-widest text-accent">
        {eyebrow}
      </span>
    )}
    <h2 className="mb-4 text-xl font-bold text-white sm:text-2xl">{title}</h2>
    {children}
  </section>
);

const importanceColors = {
  'must-have': 'bg-red-500/15 text-red-200 border-red-400/40',
  'nice-to-have': 'bg-yellow-500/15 text-yellow-200 border-yellow-400/40',
};

const Score = ({ score }) => {
  const s = Number(score) || 0;
  const color =
    s >= 75 ? 'text-emerald-300' : s >= 50 ? 'text-amber-300' : 'text-rose-300';
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
        Match score
      </span>
      <span className={`text-2xl font-bold ${color}`}>{s}/100</span>
      <span className="text-xs text-slate-400">(before tailoring)</span>
    </div>
  );
};

const CopyButton = ({ text }) => {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      /* ignore */
    }
  };
  return (
    <button
      onClick={copy}
      className="text-[11px] font-semibold uppercase tracking-wider text-accent hover:text-accent-bright"
      type="button"
    >
      {done ? 'Copied ✓' : 'Copy'}
    </button>
  );
};

const ResultsPanel = ({ result }) => {
  const bullets = result?.tailored_bullets || [];
  const keywords = result?.missing_keywords || [];
  const questions = result?.interview_questions || [];

  return (
    <div className="mt-8 grid gap-5 sm:gap-6">
      {typeof result?.overall_match_score !== 'undefined' && (
        <Score score={result.overall_match_score} />
      )}

      {bullets.length > 0 && (
        <Section title="Tailored bullets" eyebrow="Rewrite suggestions">
          <ul className="grid gap-4">
            {bullets.map((b, i) => (
              <li
                key={i}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Original
                  </span>
                </div>
                <p className="text-sm text-slate-400 line-through decoration-slate-500/50">
                  {b.original}
                </p>

                <div className="mt-3 mb-1 flex items-baseline justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
                    Rewrite
                  </span>
                  <CopyButton text={b.rewrite} />
                </div>
                <p className="text-sm text-white">{b.rewrite}</p>

                {b.why && (
                  <p className="mt-2 text-xs italic text-slate-400">
                    Why: {b.why}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {keywords.length > 0 && (
        <Section title="Missing keywords" eyebrow="Gap analysis">
          <ul className="grid gap-3">
            {keywords.map((k, i) => (
              <li
                key={i}
                className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-start sm:gap-4"
              >
                <span
                  className={`shrink-0 self-start rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    importanceColors[k.importance] ||
                    'border-white/20 bg-white/5 text-slate-300'
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
              </li>
            ))}
          </ul>
        </Section>
      )}

      {questions.length > 0 && (
        <Section title="Likely interview questions" eyebrow="Prep ahead">
          <ol className="grid gap-4">
            {questions.map((q, i) => (
              <li
                key={i}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
              >
                <p className="text-sm font-semibold text-white">
                  {i + 1}. {q.question}
                </p>
                {q.what_they_want && (
                  <p className="mt-2 text-xs text-slate-400">
                    <span className="font-semibold text-slate-300">
                      What they're probing:
                    </span>{' '}
                    {q.what_they_want}
                  </p>
                )}
                {q.prep_tip && (
                  <p className="mt-1 text-xs text-slate-400">
                    <span className="font-semibold text-slate-300">Prep tip:</span>{' '}
                    {q.prep_tip}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </Section>
      )}
    </div>
  );
};

export default ResultsPanel;
