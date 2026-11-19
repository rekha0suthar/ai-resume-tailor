import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ScoreStrip — the before → after match score, pinned to the top of the
 * results. Both numbers come from the SAME rubric and the SAME JD, so the
 * delta is a real claim: "tailoring moved you from 45 to 78". Refinement
 * turns that return an updatedScore keep moving the "after" side, and the
 * small trail underneath ("45 → 78 → 81") keeps the history honest.
 */

const scoreColor = (s) =>
  s == null
    ? 'text-slate-500'
    : s >= 75
      ? 'text-emerald-300'
      : s >= 50
        ? 'text-amber-300'
        : 'text-rose-300';

const ScoreNumber = ({ label, value, dim, pending }) => (
  <div className={`text-center ${dim ? 'opacity-70' : ''}`}>
    <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
      {label}
    </span>
    <span className="mt-0.5 block tabular-nums">
      {value == null && pending ? (
        <span className="inline-block h-8 w-10 animate-pulse rounded-md bg-white/10 align-middle" />
      ) : value == null ? (
        <span className="inline-block text-3xl font-bold text-slate-600">–</span>
      ) : (
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className={`inline-block text-3xl font-bold ${scoreColor(value)}`}
          >
            {value}
          </motion.span>
        </AnimatePresence>
      )}
      <span className="ml-1 text-xs font-medium text-slate-500">/100</span>
    </span>
  </div>
);

const DeltaBadge = ({ delta }) => {
  if (delta == null) return null;
  const up = delta > 0;
  const down = delta < 0;
  const cls = up
    ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
    : down
      ? 'border-rose-400/40 bg-rose-500/15 text-rose-200'
      : 'border-white/15 bg-white/[0.06] text-slate-300';
  const glyph = up ? '▲' : down ? '▼' : '—';
  const text = up ? `+${delta}` : down ? `${delta}` : '0';
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={delta}
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 400, damping: 24 }}
        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold tabular-nums ${cls}`}
        aria-label={`Score change: ${text}`}
      >
        <span aria-hidden="true" className="text-[9px]">
          {glyph}
        </span>
        {text}
      </motion.span>
    </AnimatePresence>
  );
};

/**
 * @param original  original_match_score (resume as submitted), or null
 * @param tailored  tailored_match_score (first tailor pass), or null
 * @param trail     committed refine updatedScores, oldest→newest
 * @param streaming true while the tailor stream is still running
 */
const ScoreStrip = ({ original, tailored, trail = [], streaming }) => {
  const current = trail.length ? trail[trail.length - 1] : tailored;
  const delta = original != null && current != null ? current - original : null;
  const chain = [tailored, ...trail].filter((s) => s != null);
  const showTrail = chain.length > 1 && original != null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border border-white/10 bg-white/[0.045] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm sm:px-6"
      aria-label="Match score before and after tailoring"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-white">Match score</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Scored against this job description, on a fixed rubric — before and
            after tailoring.
          </p>
          {showTrail && (
            <p className="mt-1.5 text-[11px] tabular-nums text-slate-500">
              <span className="text-slate-400">{original}</span>
              {chain.map((s, i) => (
                <React.Fragment key={`${i}-${s}`}>
                  <span aria-hidden="true" className="mx-1 text-slate-600">
                    {'→'}
                  </span>
                  <span className={i === chain.length - 1 ? 'text-slate-300' : ''}>{s}</span>
                </React.Fragment>
              ))}
              <span className="ml-2 text-slate-600">refinement history</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-4 sm:gap-5">
          <ScoreNumber label="Original" value={original} pending={streaming} dim />
          <span aria-hidden="true" className="text-lg text-slate-600">
            {'→'}
          </span>
          <ScoreNumber
            label={trail.length ? 'Refined' : 'Tailored'}
            value={current}
            pending={streaming}
          />
          <DeltaBadge delta={delta} />
        </div>
      </div>
      <p className="mt-2.5 text-[11px] leading-relaxed text-slate-500">
        Honest tailoring without inventing experience typically gains 5–15
        points. A low ceiling usually means a skills gap — check Keyword gaps
        below.
      </p>
    </motion.section>
  );
};

export default ScoreStrip;
