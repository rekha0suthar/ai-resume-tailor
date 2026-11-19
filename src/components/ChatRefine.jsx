import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessagesSquare, SendHorizontal, Undo2 } from 'lucide-react';
import { INSTRUCTION_MAX } from '../lib/prompts.js';

const QUICK_ACTIONS = [
  'Make it one page',
  'Shorten the summary',
  'Expand project bullets',
  'More formal tone',
];

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.25 },
};

const Bubble = ({ role, children, streaming }) => {
  const isUser = role === 'user';
  return (
    <motion.div
      layout
      {...fadeIn}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
          isUser
            ? 'rounded-br-sm bg-accent/20 text-white'
            : 'rounded-bl-sm border border-white/10 bg-white/[0.06] text-slate-200'
        }`}
      >
        {children}
        {streaming && (
          <span className="ml-1 inline-block h-3 w-1 animate-pulse rounded-sm bg-accent align-middle" />
        )}
      </div>
    </motion.div>
  );
};

/**
 * ChatRefine — conversational refinement of the tailored resume.
 *
 * Renders under the TailoredResumeCard once a tailored resume exists. Each
 * turn streams the assistant's one-sentence note into a chat bubble while
 * the updated resume streams into the resume card above (the `refine` hook
 * owns all of that state — this component is purely presentational).
 */
const ChatRefine = ({ refine }) => {
  const { status, error, messages, pendingNote, canRevert, send, revert } = refine;
  const streaming = status === 'streaming';
  const [draft, setDraft] = useState('');
  const scrollRef = useRef(null);

  // Keep the newest bubble in view as turns and streamed notes arrive.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, pendingNote]);

  const submit = (text) => {
    const value = (text ?? draft).trim();
    if (!value || streaming) return;
    setDraft('');
    send(value);
  };

  return (
    <motion.section
      {...fadeIn}
      layout
      className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <span className="mb-1 inline-block text-xs font-semibold uppercase tracking-widest text-accent">
            Iterate
          </span>
          <h2 className="flex items-center gap-2 text-xl font-bold text-white sm:text-2xl">
            <MessagesSquare size={20} className="text-accent" />
            Refine with chat
          </h2>
        </div>
        {canRevert && (
          <button
            type="button"
            onClick={revert}
            disabled={streaming}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-accent/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Undo2 size={13} /> Revert
          </button>
        )}
      </div>

      {(messages.length > 0 || streaming) && (
        <div
          ref={scrollRef}
          className="mb-4 grid max-h-72 gap-2.5 overflow-y-auto pr-1"
        >
          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <Bubble key={`${i}-${m.role}`} role={m.role}>
                {m.content}
              </Bubble>
            ))}
            {streaming && (
              <Bubble key="pending" role="assistant" streaming>
                {pendingNote || 'Rewriting…'}
              </Bubble>
            )}
          </AnimatePresence>
        </div>
      )}

      <div className="mb-3 flex flex-wrap gap-2">
        {QUICK_ACTIONS.map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => submit(label)}
            disabled={streaming}
            className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-xs font-semibold text-slate-300 transition hover:border-accent/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {label}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-center gap-2"
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={INSTRUCTION_MAX}
          placeholder='e.g. "Lead with the Python experience"'
          disabled={streaming}
          className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={streaming || !draft.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-accent-bright disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Send instruction"
        >
          <SendHorizontal size={15} />
        </button>
      </form>

      {status === 'error' && error && (
        <p className="mt-2 text-xs text-rose-300">{error}</p>
      )}
    </motion.section>
  );
};

export default ChatRefine;
