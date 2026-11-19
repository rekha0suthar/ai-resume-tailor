import React, { useEffect, useRef, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Hourglass, PencilLine, RotateCcw, TriangleAlert } from 'lucide-react';
import Navbar from './components/Navbar.jsx';
import Hero from './components/Hero.jsx';
import TailorForm from './components/TailorForm.jsx';
import ResultsPanel from './components/ResultsPanel.jsx';
import HowItWorks from './components/HowItWorks.jsx';
import Footer from './components/Footer.jsx';
import { useTailor } from './hooks/useTailor.js';
import { useRefine } from './hooks/useRefine.js';

/** Friendly full-width error card with an honest 429 variant. */
const ErrorCard = ({ error, errorCode, onRetry, onEditInputs }) => {
  const rateLimited = errorCode === 429;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-8 rounded-2xl border border-rose-400/25 bg-rose-500/[0.07] p-6 text-center sm:p-8"
      role="alert"
    >
      <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-rose-500/15 ring-1 ring-rose-400/30">
        {rateLimited ? (
          <Hourglass size={17} className="text-rose-200" aria-hidden="true" />
        ) : (
          <TriangleAlert size={17} className="text-rose-200" aria-hidden="true" />
        )}
      </span>
      <h2 className="mt-3 text-base font-semibold text-white">
        {rateLimited ? "You've hit the demo rate limit" : 'That run failed'}
      </h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-slate-300">
        {rateLimited
          ? 'This free demo allows 10 runs every 10 minutes. Nothing is wrong with your resume — try again in a few minutes.'
          : error || 'Something went wrong on our side.'}
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
        {!rateLimited && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-accent-bright"
          >
            Try again
          </button>
        )}
        <button
          type="button"
          onClick={onEditInputs}
          className="rounded-xl border border-white/15 bg-white/[0.05] px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-white/30 hover:text-white"
        >
          Back to inputs
        </button>
      </div>
    </motion.div>
  );
};

const App = () => {
  const { status, result, error, errorCode, tokens, submit, reset } = useTailor();
  const refine = useRefine();
  const { start: startRefine, reset: resetRefine } = refine;

  // Inputs live here (not in the form) so flipping between the input stage
  // and the results stage never loses either side.
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [view, setView] = useState('input'); // 'input' | 'results'
  // The JD actually submitted — refinement re-scores against THIS text even
  // if the user edits the field afterwards without re-running.
  const submittedRef = useRef({ resumeText: '', jobDescription: '' });

  const hasResults = status === 'done' || status === 'streaming' || status === 'error';

  const runTailor = (inputs) => {
    submittedRef.current = inputs;
    submit(inputs);
    setView('results');
    window.scrollTo({ top: 0 });
  };

  const retry = () => runTailor(submittedRef.current);

  const startOver = () => {
    reset();
    resetRefine();
    setResumeText('');
    setJobDescription('');
    setView('input');
  };

  useEffect(() => {
    if (status === 'done')
      toast.success('Done — your tailored resume is ready below.');
  }, [status]);

  // A finished tailor seeds a fresh chat-refinement session on its resume
  // (with the submitted JD so refinements are re-scored against the same
  // job); starting over or a new run clears the session so the live tailor
  // stream shows through again.
  useEffect(() => {
    if (status === 'done' && result?.tailoredResume) {
      startRefine(result.tailoredResume, submittedRef.current.jobDescription);
    } else if (status === 'idle' || status === 'streaming') {
      resetRefine();
    }
  }, [status, result?.tailoredResume, startRefine, resetRefine]);

  return (
    <MotionConfig reducedMotion="user">
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

        {view === 'input' ? (
          <main className="mx-auto w-full max-w-3xl px-4 pt-8 pb-4 sm:px-6 sm:pt-12">
            <Hero />
            <TailorForm
              resumeText={resumeText}
              jobDescription={jobDescription}
              onResumeChange={setResumeText}
              onJdChange={setJobDescription}
              onSubmit={runTailor}
              isStreaming={status === 'streaming'}
            />
            {hasResults && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => setView('results')}
                  className="text-sm font-medium text-accent-bright underline-offset-4 transition hover:underline"
                >
                  Back to your results without re-running
                </button>
              </div>
            )}
          </main>
        ) : (
          <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-4 sm:px-6 sm:pt-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-lg font-bold tracking-tight text-white sm:text-xl">
                  Your tailored resume
                </h1>
                <p className="mt-0.5 truncate text-xs text-slate-400">
                  {status === 'streaming'
                    ? 'Generating — results fill in as the model works.'
                    : 'Save it as a PDF, or keep refining it below.'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setView('input')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-accent/50 hover:text-white"
                >
                  <PencilLine size={13} aria-hidden="true" /> Edit inputs
                </button>
                <button
                  type="button"
                  onClick={startOver}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
                >
                  <RotateCcw size={13} aria-hidden="true" /> Start over
                </button>
              </div>
            </div>

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

            {status === 'error' ? (
              <ErrorCard
                error={error}
                errorCode={errorCode}
                onRetry={retry}
                onEditInputs={() => setView('input')}
              />
            ) : (
              <ResultsPanel result={result} status={status} refine={refine} />
            )}
          </main>
        )}

        {view === 'input' && (
          <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
            <HowItWorks />
          </div>
        )}

        <Footer />
      </div>
    </MotionConfig>
  );
};

export default App;
