import React, { useState } from 'react';
import { Wand2, FileUp } from 'lucide-react';
import toast from 'react-hot-toast';
import PdfUpload from './PdfUpload.jsx';
import { SAMPLE_RESUME, SAMPLE_JD } from '../lib/sample.js';

const Field = ({ label, hint, value, onChange, placeholder, rows = 12, extra }) => (
  <div>
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <span className="text-sm font-semibold text-white">{label}</span>
      <div className="flex items-center gap-3">
        {extra}
        {hint && <span className="text-xs text-slate-400">{hint}</span>}
      </div>
    </div>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full resize-y rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30"
    />
  </div>
);

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
    toast.success('Loaded sample resume + JD. Hit Tailor to see it run.');
  };

  const canSubmit =
    !isStreaming && resumeText.trim().length >= 50 && jobDescription.trim().length >= 50;

  return (
    <form onSubmit={submit} className="grid gap-5 sm:gap-6">
      <Field
        label="Your resume"
        hint={`${resumeText.length} chars`}
        placeholder="Paste your resume in plain text — keep section headers (Summary, Experience, Projects, Education, Skills)."
        value={resumeText}
        onChange={setResumeText}
        rows={10}
        extra={
          <PdfUpload onExtract={setResumeText} disabled={isStreaming} />
        }
      />
      <Field
        label="Target job description"
        hint={`${jobDescription.length} chars`}
        placeholder="Paste the full JD from LinkedIn / company careers page — responsibilities, requirements, nice-to-haves."
        value={jobDescription}
        onChange={setJobDescription}
        rows={8}
      />

      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={loadSample}
          disabled={isStreaming}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-accent/40 hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FileUp size={15} />
          Try with sample
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition hover:bg-accent-bright disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Wand2 size={15} />
          {isStreaming ? 'Tailoring…' : 'Tailor my resume'}
        </button>
      </div>
    </form>
  );
};

export default TailorForm;
