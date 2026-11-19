import React, { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Navbar from './components/Navbar.jsx';
import Hero from './components/Hero.jsx';
import TailorForm from './components/TailorForm.jsx';
import ResultsPanel from './components/ResultsPanel.jsx';
import HowItWorks from './components/HowItWorks.jsx';
import Footer from './components/Footer.jsx';
import { useTailor } from './hooks/useTailor.js';
import { useRefine } from './hooks/useRefine.js';

const App = () => {
  const { status, result, error, tokens, submit, reset } = useTailor();
  const refine = useRefine();
  const { start: startRefine, reset: resetRefine } = refine;

  useEffect(() => {
    if (status === 'error' && error) toast.error(error);
    if (status === 'done')
      toast.success('Done. Edit any rewrite inline, then copy.');
  }, [status, error]);

  // A finished tailor seeds a fresh chat-refinement session on its resume;
  // starting over (reset or a new tailor run) clears the session so the
  // live tailor stream shows through again.
  useEffect(() => {
    if (status === 'done' && result?.tailoredResume) {
      startRefine(result.tailoredResume);
    } else if (status === 'idle' || status === 'streaming') {
      resetRefine();
    }
  }, [status, result?.tailoredResume, startRefine, resetRefine]);

  return (
    <div className="min-h-full">
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'rgba(11,23,34,0.95)',
            color: '#e2e8f0',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(12px)',
            fontSize: '13px',
          },
        }}
      />

      <Navbar />

      <main className="mx-auto w-full max-w-3xl px-4 pt-8 pb-4 sm:px-6 sm:pt-12">
        <Hero />
        <TailorForm
          onSubmit={submit}
          onReset={reset}
          isStreaming={status === 'streaming'}
        />

        <AnimatePresence>
          {status === 'streaming' && tokens > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              Generating · ~{tokens.toLocaleString()} tokens streamed
            </motion.div>
          )}
        </AnimatePresence>

        <ResultsPanel result={result} status={status} refine={refine} />
      </main>

      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <HowItWorks />
      </div>

      <Footer />
    </div>
  );
};

export default App;
