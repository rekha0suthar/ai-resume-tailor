import React from 'react';

const Hero = () => (
  <header className="mb-8 sm:mb-10">
    <span className="inline-block rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent-bright">
      AI Resume Tailor · v0
    </span>
    <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
      Paste your resume + a job description.<br className="hidden sm:block" /> Get
      back tailored bullets, keyword gaps, and likely interview questions.
    </h1>
    <p className="mt-4 max-w-2xl text-base text-slate-300 sm:text-lg">
      Built on{' '}
      <a
        href="https://groq.com"
        target="_blank"
        rel="noreferrer"
        className="text-accent hover:text-accent-bright"
      >
        Groq
      </a>{' '}
      (Llama 3.3 70B). Honest output — no invented experience. Your resume and
      JD never leave the request: nothing is stored.
    </p>
  </header>
);

export default Hero;
