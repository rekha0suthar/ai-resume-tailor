import React from 'react';
import { Sparkles, Github } from 'lucide-react';

const Navbar = () => (
  <nav className="sticky top-0 z-30 w-full border-b border-white/5 bg-ink-900/70 backdrop-blur-xl">
    <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
      <a href="/" className="flex items-center gap-2 text-sm font-bold tracking-tight text-white">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent/20 ring-1 ring-accent/40">
          <Sparkles size={14} className="text-accent-bright" />
        </span>
        <span className="hidden xs:inline">AI Resume Tailor</span>
        <span className="xs:hidden">Tailor</span>
      </a>
      <a
        href="https://github.com/rekha0suthar/ai-resume-tailor"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-surface-1 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-accent/40 hover:bg-accent/10"
        aria-label="Source on GitHub"
      >
        <Github size={14} />
        <span className="hidden sm:inline">Source</span>
      </a>
    </div>
  </nav>
);

export default Navbar;
