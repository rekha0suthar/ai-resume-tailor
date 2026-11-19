import React from 'react';
import { Wand2, PlayCircle, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import PdfUpload from './PdfUpload.jsx';
import { SAMPLE_RESUME, SAMPLE_JD } from '../lib/sample.js';
import { RESUME_CAP, JD_CAP } from '../lib/prompts.js';

const MIN_CHARS = 50;

/**
 * One labeled input: label + helper line, textarea, and a char count that
 * stays quiet until it matters — too short to submit, or close enough to
 * the server-side cap that text would be truncated.
 */
const Field = ({ label, helper, value, onChange, placeholder, rows = 10, cap, extra, id }) => {
  const len = value.trim().length;
  const tooShort = len > 0 && len < MIN_CHARS;
  const nearCap = cap && value.length >= cap * 0.9;
  const overCap = cap && value.length > cap;
  return (
    <div>
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-semibold text-white">
          {label}
        </label>
        <span
          className={`text-xs tabular-nums ${
            tooShort || overCap ? 'text-amber-300' : nearCap ? 'text-amber-200/80' : 'text-slate-500'
          }`}
        >
          {tooShort
            ? `${len} chars · need at least ${MIN_CHARS}`
            : nearCap
              ? `${value.length.toLocaleString()} / ${cap.toLocaleString()} chars${overCap ? ' · extra text is trimmed' : ''}`
              : len > 0
                ? `${value.length.toLocaleString()} chars`
                : ''}
        </span>
      </div>
      <p className="mb-2 text-xs text-slate-400">{helper}</p>
      {extra && <div className="mb-2">{extra}</div>}
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-y rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-relaxed text-slate-100 placeholder:text-slate-500 transition focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20"
      />
    </div>
  );
};

const TailorForm = ({
  resumeText,
  jobDescription,
  onResumeChange,
  onJdChange,
  onSubmit,
  isStreaming,
}) => {
  const submit = (e) => {
    e.preventDefault();
    if (isStreaming) return;
    onSubmit({
      resumeText: resumeText.trim(),
      jobDescription: jobDescription.trim(),
    });
  };

  const loadDemo = () => {
    onResumeChange(SAMPLE_RESUME);
    onJdChange(SAMPLE_JD);
    toast.success('Demo data loaded — press "Tailor my resume" to run it.');
  };

  const clearAll = () => {
    onResumeChange('');
    onJdChange('');
  };

  const canSubmit =
    !isStreaming &&
    resumeText.trim().length >= MIN_CHARS &&
    jobDescription.trim().length >= MIN_CHARS;

  return (
    <form onSubmit={submit} className="glass rounded-2xl p-5 sm:p-7">
      <Field
        id="resume-input"
        label="Your resume"
        helper="Paste your current resume — or upload a PDF."
        placeholder="Summary, skills, experience, education…"
        value={resumeText}
        onChange={onResumeChange}
        rows={9}
        cap={RESUME_CAP}
        extra={<PdfUpload onExtract={onResumeChange} disabled={isStreaming} />}
      />
      <div className="h-6" />
      <Field
        id="jd-input"
        label="Job description"
        helper="Paste the job description you're applying to — responsibilities, requirements, nice-to-haves."
        placeholder="About the role, what you'll do, requirements…"
        value={jobDescription}
        onChange={onJdChange}
        rows={7}
        cap={JD_CAP}
      />

      <div className="mt-7 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadDemo}
              disabled={isStreaming}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm font-medium text-slate-200 transition hover:border-accent/40 hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PlayCircle size={14} aria-hidden="true" />
              See a demo
            </button>
            {(resumeText || jobDescription) && (
              <button
                type="button"
                onClick={clearAll}
                disabled={isStreaming}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-transparent px-2.5 py-2.5 text-sm font-medium text-slate-400 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCcw size={14} aria-hidden="true" />
                Clear
              </button>
            )}
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-slate-500">
            Loads a sample resume + job description so you can see how it works.
          </p>
        </div>
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center justify-center gap-2 self-stretch rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-accent/25 transition hover:bg-accent-bright disabled:cursor-not-allowed disabled:opacity-40 sm:self-auto"
        >
          <Wand2 size={15} aria-hidden="true" />
          {isStreaming ? 'Tailoring…' : 'Tailor my resume'}
        </button>
      </div>
    </form>
  );
};

export default TailorForm;
