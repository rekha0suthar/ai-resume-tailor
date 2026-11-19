import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { BREAKDOWN_COMPONENTS } from '../lib/scores.js';

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
      ? 'text-success'
      : s >= 50
        ? 'text-warn'
        : 'text-error';

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
    ? 'border-success/40 bg-success/15 text-success'
    : down
      ? 'border-error/40 bg-error/15 text-error'
      : 'border-white/15 bg-surface-3 text-slate-300';
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

/* ------------------------------------------------------------------ */
/* Component breakdown panel — where the computed total comes from     */
/* ------------------------------------------------------------------ */

/** Bar fill color mirrors scoreColor, but on the fraction of the cap. */
const barTone = (value, cap) =>
  value / cap >= 0.75 ? 'bg-success' : value / cap >= 0.5 ? 'bg-warn' : 'bg-error';

const BreakdownBar = ({ value, cap, dim }) => (
  <div className="flex min-w-0 flex-1 items-center gap-2">
    <span
      className={`w-11 shrink-0 text-right text-[11px] font-medium tabular-nums ${
        value == null ? 'text-slate-600' : dim ? 'text-slate-400' : 'text-slate-200'
      }`}
    >
      {value == null ? '–' : `${value}/${cap}`}
    </span>
    <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
      {value != null && (
        <div
          className={`h-full rounded-full ${dim ? 'bg-slate-500/70' : barTone(value, cap)}`}
          style={{ width: `${Math.round((value / cap) * 100)}%` }}
        />
      )}
    </div>
  </div>
);

/**
 * Four rows — one per rubric component — original vs current side by side.
 * The totals above are the SUMS of these rows (computed, not eyeballed), so
 * this panel is the receipt behind every score the strip shows.
 */
const BreakdownPanel = ({ originalBreakdown, currentBreakdown, currentLabel }) => (
  <div className="mt-3 border-t border-white/10 pt-3">
    <div className="mb-1.5 grid grid-cols-[minmax(0,10rem)_1fr_1fr] items-center gap-x-3 max-sm:grid-cols-2">
      <span aria-hidden="true" className="max-sm:hidden" />
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Original
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        {currentLabel}
      </span>
    </div>
    <ul className="grid gap-2">
      {BREAKDOWN_COMPONENTS.map(({ key, label, cap }) => (
        <li
          key={key}
          className="grid grid-cols-[minmax(0,10rem)_1fr_1fr] items-center gap-x-3 gap-y-1 max-sm:grid-cols-2"
        >
          <span className="truncate text-xs text-slate-300 max-sm:col-span-2">{label}</span>
          <BreakdownBar value={originalBreakdown?.[key] ?? null} cap={cap} dim />
          <BreakdownBar value={currentBreakdown?.[key] ?? null} cap={cap} />
        </li>
      ))}
    </ul>
    <p className="mt-2 text-[11px] text-slate-500">
      Each total is the sum of these four components, scored on the same
      fixed rubric.
    </p>
  </div>
);

/**
 * @param original          original_match_score (resume as submitted), or null
 * @param tailored          tailored_match_score (first tailor pass), or null
 * @param trail             committed refine updatedScores, oldest→newest
 * @param streaming         true while the tailor stream is still running
 * @param originalBreakdown component breakdown behind `original`, or null
 * @param breakdown         component breakdown behind the CURRENT score
 *                          (tailored, or latest refinement), or null
 */
const ScoreStrip = ({
  original,
  tailored,
  trail = [],
  streaming,
  originalBreakdown = null,
  breakdown = null,
}) => {
  const current = trail.length ? trail[trail.length - 1] : tailored;
  const delta = original != null && current != null ? current - original : null;
  const chain = [tailored, ...trail].filter((s) => s != null);
  const showTrail = chain.length > 1 && original != null;
  const currentLabel = trail.length ? 'Refined' : 'Tailored';
  const hasBreakdown = Boolean(originalBreakdown || breakdown);
  const [expanded, setExpanded] = useState(false);
  const open = expanded && hasBreakdown;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border border-white/10 bg-surface-2 px-5 py-4 shadow-panel backdrop-blur-sm sm:px-6"
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

        {hasBreakdown ? (
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setExpanded((e) => !e)}
            title={open ? 'Hide score breakdown' : 'Show score breakdown'}
            className="-m-1.5 flex items-center gap-4 rounded-xl p-1.5 text-left transition hover:bg-white/5 sm:gap-5"
          >
            <ScoreNumber label="Original" value={original} pending={streaming} dim />
            <span aria-hidden="true" className="text-lg text-slate-600">
              {'→'}
            </span>
            <ScoreNumber label={currentLabel} value={current} pending={streaming} />
            <DeltaBadge delta={delta} />
            <ChevronDown
              size={14}
              aria-hidden="true"
              className={`shrink-0 text-slate-500 transition-transform duration-200 ${
                open ? 'rotate-180' : ''
              }`}
            />
          </button>
        ) : (
          <div className="flex items-center gap-4 sm:gap-5">
            <ScoreNumber label="Original" value={original} pending={streaming} dim />
            <span aria-hidden="true" className="text-lg text-slate-600">
              {'→'}
            </span>
            <ScoreNumber label={currentLabel} value={current} pending={streaming} />
            <DeltaBadge delta={delta} />
          </div>
        )}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="breakdown"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <BreakdownPanel
              originalBreakdown={originalBreakdown}
              currentBreakdown={breakdown}
              currentLabel={currentLabel}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mt-2.5 text-[11px] leading-relaxed text-slate-500">
        Honest tailoring without inventing experience typically gains 5–15
        points. A low ceiling usually means a skills gap — check Keyword gaps
        below.
      </p>
    </motion.section>
  );
};

export default ScoreStrip;
