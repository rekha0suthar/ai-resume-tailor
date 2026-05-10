import React, { useState } from 'react';
import Hero from './components/Hero.jsx';
import TailorForm from './components/TailorForm.jsx';
import ResultsPanel from './components/ResultsPanel.jsx';
import Footer from './components/Footer.jsx';

const App = () => {
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'error' | 'success'
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState(null);

  const handleSubmit = async ({ resumeText, jobDescription }) => {
    setStatus('loading');
    setErrorMessage('');
    setResult(null);

    try {
      const res = await fetch('/api/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, jobDescription }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus('error');
        setErrorMessage(data?.error || `Request failed (${res.status}).`);
        return;
      }

      setResult(data);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMessage(
        err?.message ||
          'Network error. Check that the API endpoint is deployed and the GROQ_API_KEY is set.'
      );
    }
  };

  return (
    <div className="min-h-full">
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:py-14">
        <Hero />
        <TailorForm onSubmit={handleSubmit} status={status} />
        {status === 'error' && (
          <div className="fade-in-up mt-6 rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-200">
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
