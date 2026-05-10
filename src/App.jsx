import React, { useState } from 'react';
import Hero from './components/Hero.jsx';
import TailorForm from './components/TailorForm.jsx';
import ResultsPanel from './components/ResultsPanel.jsx';
import Footer from './components/Footer.jsx';

const App = () => {
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState(null);

  const handleSubmit = async ({ resumeText, jobDescription }) => {
    setStatus('loading');
    setErrorMessage('');
    setResult(null);

    let res;
    try {
      res = await fetch('/api/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, jobDescription }),
      });
    } catch (err) {
      setStatus('error');
      setErrorMessage(
        `Network error: ${err?.message || 'unknown'}. The API endpoint may not be reachable. ` +
          `If running locally, start the server with \`vercel dev\` (not \`npm run dev\`) so /api/tailor works.`
      );
      return;
    }

    // Read the body as text first so we can detect empty / HTML responses cleanly.
    const raw = await res.text();

    // Empty body — usually means the function crashed before responding,
    // or the route doesn't exist (Vite-only dev server returning nothing).
    if (!raw) {
      setStatus('error');
      setErrorMessage(
        `Server returned an empty response (HTTP ${res.status}). ` +
          `Most common causes: (a) running \`npm run dev\` instead of \`vercel dev\` — ` +
          `Vite alone doesn't serve /api routes; (b) \`npm install\` was skipped so ` +
          `\`groq-sdk\` is missing; (c) the GROQ_API_KEY env var is unset. ` +
          `Check your terminal for stack traces.`
      );
      return;
    }

    // HTML response — Vite served index.html because it doesn't know /api/tailor.
    if (raw.trimStart().startsWith('<')) {
      setStatus('error');
      setErrorMessage(
        `Got an HTML response back from /api/tailor instead of JSON. ` +
          `This usually means you're running \`npm run dev\` (Vite-only). ` +
          `Stop it, run \`vercel dev\` instead.`
      );
      return;
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      setStatus('error');
      setErrorMessage(
        `Could not parse server response as JSON (HTTP ${res.status}). Raw: ${raw.slice(0, 240)}`
      );
      return;
    }

    if (!res.ok) {
      setStatus('error');
      setErrorMessage(data?.error || `Request failed (HTTP ${res.status}).`);
      return;
    }

    setResult(data);
    setStatus('success');
  };

  return (
    <div className="min-h-full">
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:py-14">
        <Hero />
        <TailorForm onSubmit={handleSubmit} status={status} />
        {status === 'error' && (
          <div className="fade-in-up mt-6 rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm leading-relaxed text-red-200">
            {errorMessage}
          </div>
        )}
        {status === 'success' && result && (
          <ResultsPanel result={result} />
        )}
      </main>
      <Footer />
    </div>
  );
};

export default App;
