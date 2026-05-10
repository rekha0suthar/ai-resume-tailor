import React from 'react';

const Footer = () => (
  <footer className="mx-auto w-full max-w-4xl px-4 pb-10 text-center text-xs text-slate-500">
    <p>
      Built by{' '}
      <a
        href="https://rekha-suthar-portfolio.netlify.app/"
        target="_blank"
        rel="noreferrer"
        className="text-accent hover:text-accent-bright"
      >
        Rekha Suthar
      </a>
      {' · '}
      <a
        href="https://github.com/rekha0suthar/ai-resume-tailor"
        target="_blank"
        rel="noreferrer"
        className="text-accent hover:text-accent-bright"
      >
        Source on GitHub
      </a>
    </p>
    <p className="mt-1">
      Powered by Groq · Llama 3.3 70B · No data is stored.
    </p>
  </footer>
);

export default Footer;
