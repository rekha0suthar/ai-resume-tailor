import React, { useState } from 'react';

const Field = ({ label, hint, value, onChange, placeholder, rows = 12 }) => (
  <label className="block">
    <div className="mb-2 flex items-baseline justify-between">
      <span className="text-sm font-semibold text-white">{label}</span>
      {hint && <span className="text-xs text-slate-400">{hint}</span>}
    </div>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full resize-y rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30"
    />
  </label>
);

const TailorForm = ({ onSubmit, status }) => {
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const isLoading = status === 'loading';

  const submit = (e) => {
    e.preventDefault();
    if (isLoading) return;
    onSubmit({ resumeText: resumeText.trim(), jobDescription: jobDescription.trim() });
  };

  const canSubmit =
    !isLoading && resumeText.trim().length >= 50 && jobDescription.trim().length >= 50;

  return (
    <form onSubmit={submit} className="grid gap-5 sm:gap-6">
      <Field
        label="Your resume"
        hint={`${resumeText.length} chars`}
        placeholder="Paste your resume in plain text — keep section headers (Summary, Experience, Projects, Education, Skills)."
        value={resumeText}
        onChange={setResumeText}
      />
      <Field
        label="Target job description"
        hint={`${jobDescription.length} chars`}
        placeholder="Paste the full JD from LinkedIn / company careers page — responsibilities, requirements, nice-to-haves."
        value={jobDescription}
        onChange={setJobDescription}
        rows={10}
      />

      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-400">
          Min 50 characters in each field. The model occasionally drifts on
          first try — re-submit if needed.
        </p>
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center justify-center rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition hover:bg-accent-bright disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Tailoring…' : 'Tailor my resume →'}
        </button>
      </div>
    </form>
  );
};

export default TailorForm;
