import React, { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import Hero from './components/Hero.jsx';
import TailorForm from './components/TailorForm.jsx';
import ResultsPanel from './components/ResultsPanel.jsx';
import Footer from './components/Footer.jsx';
import { useTailor } from './hooks/useTailor.js';
import toast from 'react-hot-toast';

const App = () => {
  const { status, result, error, tokens, submit, reset } = useTailor();

  useEffect(() => {
    if (status === 'error' && error) toast.error(error);
    if (status === 'done') toast.success('Done. Edit any rewrite inline, then copy.');
  }, [status, error]);

  return (
    <div className="min-h-full">
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'rgba(15, 32, 39, 0.95)',
            color: '#e2e8f0',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(10px)',
          },
        }}
      />
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:py-14">
        <Hero />
        <TailorForm
          onSubmit={submit}
          onReset={reset}
          isStreaming={status === 'streaming'}
        />

        <AnimatePresence>
          {status === 'streaming' && tokens > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-4 flex items-center gap-2 text-xs text-slate-400"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              Generating · ~{tokens.toLocaleString()} tokens
            </motion.div>
          )}
        </AnimatePresence>

        <ResultsPanel result={result} status={status} />
      </main>
      <Footer />
    </div>
  );
};

export default App;
