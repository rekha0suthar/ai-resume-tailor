import React from 'react';
import { ExternalLink, Github } from 'lucide-react';

const Footer = () => (
  <footer className="mx-auto mt-16 w-full max-w-5xl border-t border-white/5 px-4 py-8 text-xs text-slate-500 sm:px-6 sm:py-10">
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p>
        Built by{' '}
        <a
          href="https://rekha-suthar-portfolio.netlify.app/"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-slate-300 hover:text-accent-bright"
        >
          Rekha Suthar
        </a>
        {' · '}
        <a
          href="https://github.com/rekha0suthar/ai-resume-tailor"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 hover:text-accent-bright"
        >
          <Github size={11} /> Source
        </a>
      </p>
      <p className="flex flex-wrap items-center justify-center gap-3">
        <a
          href="https://dev.to/rekha0suthar/building-ai-resume-tailor-v0-build-notes-58f9"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 hover:text-accent-bright"
        >
          <ExternalLink size={11} /> Build notes
        </a>
        <span className="text-slate-700">·</span>
        <span>gpt-oss-120b via Groq · MIT</span>
      </p>
    </div>
  </footer>
);

export default Footer;
