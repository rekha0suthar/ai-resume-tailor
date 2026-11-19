import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessagesSquare, Pencil, SendHorizontal, Undo2 } from 'lucide-react';
import { INSTRUCTION_MAX } from '../lib/prompts.js';

const QUICK_ACTIONS = ['Fit to one page', 'More formal tone', 'Stronger action verbs'];

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
 * ChatRefine — conversational refinement of the tailored resume, docked
 * next to the preview sheet on desktop.
 *
 * Per-section requests: `sections` (parsed from the CURRENT resume) renders
 * one chip per section; picking a chip — or the pencil on a section heading
 * in the preview, which arrives via `prefill` — drops "In the <SECTION>
 * section: " into the input and focuses it, so the instruction the model
 * receives is explicitly scoped to that section.
 *
 * The `refine` hook owns all session state; this component is presentational.
 */
const ChatRefine = ({ refine, sections = [], prefill }) => {
  const { status, error, messages, pendingNote, canRevert, send, revert } = refine;
  const streaming = status === 'streaming';
  const [draft, setDraft] = useState('');
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Keep the newest bubble in view as turns and streamed notes arrive.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, pendingNote]);

  // A prefill (pencil on a preview section heading) fills + focuses the
  // input. nonce distinguishes repeat clicks on the same section.
  useEffect(() => {
    if (!prefill?.text) return;
    setDraft(prefill.text);
    const input = inputRef.current;
    if (input) {
      input.focus();
      // On mobile the chat is stacked below the sheet — bring it into view.
      input.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [prefill?.nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  const prefillSection = (heading) => {
    setDraft(`In the ${heading} section: `);
    inputRef.current?.focus();
  };

  const submit = (text) => {
    const value = (text ?? draft).trim();
    if (!value || streaming) return;
    setDraft('');
    send(value);
  };

  return (
    <motion.section
      {...fadeIn}
      className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-5"
      aria-label="Refine the tailored resume"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
          <MessagesSquare size={15} className="text-accent" aria-hidden="true" />
          Refine this resume
        </h3>
        {canRevert && (
          <button
            type="button"
            onClick={revert}
            disabled={streaming}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-slate-300 transition hover:border-accent/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Undo2 size={12} aria-hidden="true" /> Undo last change
          </button>
        )}
      </div>

      <p className="mb-3 text-xs leading-relaxed text-slate-400">
        Ask for any change — whole-resume or one section. The preview and the
        match score update with every request.
      </p>

      {(messages.length > 0 || streaming) && (
        <div
          ref={scrollRef}
          className="mb-3 grid max-h-64 gap-2.5 overflow-y-auto pr-1 lg:max-h-80"
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

      {sections.length > 0 && (
        <div className="mb-2">
          <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Change a section
          </span>
          <div className="flex flex-wrap gap-1.5">
            {sections.map((heading) => (
              <button
                key={heading}
                type="button"
                onClick={() => prefillSection(heading)}
                disabled={streaming}
                className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-slate-300 transition hover:border-accent/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Pencil size={10} aria-hidden="true" />
                {heading}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mb-3 flex flex-wrap gap-1.5">
        {QUICK_ACTIONS.map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => submit(label)}
            disabled={streaming}
            className="rounded-full border border-dashed border-white/15 bg-transparent px-2.5 py-1 text-[11px] font-medium text-slate-400 transition hover:border-accent/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
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
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={INSTRUCTION_MAX}
          placeholder='e.g. "Lead with the Python experience"'
          disabled={streaming}
          aria-label="Refinement instruction"
          className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={streaming || !draft.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-accent-bright disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Send instruction"
        >
          <SendHorizontal size={15} aria-hidden="true" />
        </button>
      </form>

      {status === 'error' && error && (
        <p className="mt-2 text-xs text-rose-300" role="alert">
          {error}
        </p>
      )}
    </motion.section>
  );
};

export default ChatRefine;
