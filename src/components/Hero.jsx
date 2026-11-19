import React from 'react';
import { Zap, Lock, Bot } from 'lucide-react';

const Pill = ({ icon: Icon, children }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-slate-300">
    <Icon size={12} className="text-accent-bright" />
    {children}
  </span>
);

const Hero = () => (
  <header className="mb-10 text-center sm:mb-14">
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      <Pill icon={Zap}>Streaming output</Pill>
      <Pill icon={Bot}>gpt-oss-120b · Groq</Pill>
      <Pill icon={Lock}>Nothing stored</Pill>
    </div>
    <h1 className="mt-5 text-3xl font-bold leading-[1.1] tracking-tight text-white sm:text-4xl md:text-5xl">
      Tailor your resume to any job
      <br className="hidden sm:block" />{' '}
      in <span className="text-gradient">seconds, not afternoons</span>.
    </h1>
    <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
      Paste your resume and the job description. Get a rewritten,
      ready-to-send resume in a professional template — with a before and
      after match score, keyword gap analysis, and chat-driven refinement.
    </p>
  </header>
);

export default Hero;
