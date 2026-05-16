import React, { useState } from 'react';
import { Wand2, FileUp, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import PdfUpload from './PdfUpload.jsx';
import { SAMPLE_RESUME, SAMPLE_JD } from '../lib/sample.js';

const MIN_CHARS = 50;

const Field = ({ label, hint, value, onChange, placeholder, rows = 10, extra }) => {
  const tooShort = value.trim().length > 0 && value.trim().length < MIN_CHARS;
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <label className="text-sm font-semibold text-white">{label}</label>
        <div className="flex items-center gap-3 text-xs">
          {extra}
          <span className={tooShort ? 'text-amber-300' : 'text-slate-500'}>
            {value.length.toLocaleString()} chars
            {tooShort ? ' · need ≥50' : ''}
          </span>
        </div>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-y rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-relaxed text-slate-100 placeholder:text-slate-500 transition focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20"
      />
    </div>
  );
};

const TailorForm = ({ onSubmit, onReset, isStreaming }) => {
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (isStreaming) return;
    onSubmit({
      resumeText: resumeText.trim(),
      jobDescription: jobDescription.trim(),
    });
  };

  const loadSample = () => {
    setResumeText(SAMPLE_RESUME);
    setJobDescription(SAMPLE_JD);
    onReset?.();
    toast.success('Sample loaded — hit Tailor to see it run');
  };

  const clearAll = () => {
    setResumeText('');
    setJobDescription('');
    onReset?.();
  };

  const canSubmit =
    !isStreaming &&
    resumeText.trim().length >= MIN_CHARS &&
    jobDescription.trim().length >= MIN_CHARS;

  return (
    <form onSubmit={submit} className="glass rounded-2xl p-5 sm:p-7">
      <Field
        label="Your resume"
        placeholder="Paste resume text — or drop a PDF using the upload button."
        value={resumeText}
        onChange={setResumeText}
        rows={9}
        extra={<PdfUpload onExtract={setResumeText} disabled={isStreaming} />}
      />
      <div className="h-5" />
      <Field
        label="Target job description"
        placeholder="Paste the full JD — responsibilities, requirements, nice-to-haves."
        value={jobDescription}
        onChange={setJobDescription}
        rows={7}
      />

      <div className="mt-6 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadSample}
            disabled={isStreaming}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm font-medium text-slate-200 transition hover:border-accent/40 hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileUp size={14} />
            Try sample
          </button>
          {(resumeText || jobDescription) && (
            <button
              type="button"
              onClick={clearAll}
              disabled={isStreaming}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-transparent px-2.5 py-2.5 text-sm font-medium text-slate-400 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw size={14} />
              Clear
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition hover:bg-accent-bright disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Wand2 size={15} />
          {isStreaming ? 'Tailoring…' : 'Tailor my resume'}
        </button>
      </div>
    </form>
  );
};

export default TailorForm;
