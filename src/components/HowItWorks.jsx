import React from 'react';
import { Upload, Sparkles, Edit3 } from 'lucide-react';

const STEPS = [
  {
    icon: Upload,
    title: '1 · Drop your resume + JD',
    body: 'Upload a PDF or paste the text. Paste the job description below. Nothing is stored — your data lives only inside the request.',
  },
  {
    icon: Sparkles,
    title: '2 · Watch it tailor',
    body: 'Llama 3.3 70B via Groq streams its output back. Bullet rewrites, missing keywords, and likely interview questions appear as they generate.',
  },
  {
    icon: Edit3,
    title: '3 · Edit and copy',
    body: 'Every rewrite is inline-editable before you copy it. Take what fits, ignore the rest. Your judgement, AI as a fast first draft.',
  },
];

const HowItWorks = () => (
  <section className="mt-16 sm:mt-20">
    <div className="mb-8 text-center">
      <span className="inline-block text-xs font-semibold uppercase tracking-widest text-accent-bright">
        How it works
      </span>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
        Three steps. No account. Free to use.
      </h2>
    </div>
    <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
      {STEPS.map((s, i) => (
        <div key={i} className="glass glass-hover rounded-2xl p-5 sm:p-6">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/15 ring-1 ring-accent/30">
            <s.icon size={16} className="text-accent-bright" />
          </span>
          <h3 className="mt-4 text-base font-semibold text-white sm:text-lg">{s.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">{s.body}</p>
        </div>
      ))}
    </div>
  </section>
);

export default HowItWorks;
