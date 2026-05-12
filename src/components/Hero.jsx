import React from 'react';
import { Sparkles, Zap, Lock } from 'lucide-react';

const Pill = ({ icon: Icon, children }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-slate-300">
    <Icon size={12} className="text-accent" />
    {children}
  </span>
);

const Hero = () => (
  <header className="mb-8 sm:mb-10">
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="inline-block rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent-bright">
        AI Resume Tailor · v1
      </span>
      <Pill icon={Zap}>Streaming</Pill>
      <Pill icon={Sparkles}>Groq · Llama 3.3</Pill>
      <Pill icon={Lock}>No data stored</Pill>
    </div>
    <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
      Tailor your resume to any job in seconds.
    </h1>
    <p className="mt-4 max-w-2xl text-base text-slate-300 sm:text-lg">
      Upload your resume (PDF or paste) plus a job description. Get back
      bullet rewrites, ATS keyword gaps, and likely interview questions —
      streamed live as the model thinks.
    </p>
  </header>
);

export default Hero;
