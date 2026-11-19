/**
 * useRefine() — manages the chat-refinement session for a tailored resume.
 *
 * Owns the whole session, not just the stream (unlike useTailor, which is a
 * single-shot call): chat messages, the current resume version, an undo
 * stack of previous versions, and the live streaming state of the in-flight
 * refine call.
 *
 * Returns:
 *   status:        'idle' | 'streaming' | 'done' | 'error'
 *   error:         string | null
 *   active:        true once start() has seeded a base resume
 *   messages:      [{ role: 'user'|'assistant', content }] committed turns
 *   pendingNote:   the assistant note streaming in right now ('' otherwise)
 *   currentResume: the committed current version (markdown)
 *   liveResume:    the partial updatedResume while streaming ('' otherwise)
 *                  — render `liveResume || currentResume` for a live preview
 *   canRevert:     whether the undo stack has a previous version
 *   scoreTrail:    committed updatedScores, oldest→newest (for "78 → 81")
 *   currentScore:  latest committed updatedScore, or null before any
 *   start(base, jobDescription): seed a fresh session from a newly tailored
 *                  resume; the JD rides along on every turn so the server
 *                  can re-score against the SAME job description
 *   send(instruction): run one refinement turn
 *   revert():      restore the previous version (undo stack, cap 10) —
 *                  score trail is restored alongside the resume
 *   reset():       clear the whole session
 *
 * Streaming behaviour mirrors useTailor: accumulate SSE chunks, strip any
 * ```json fence, parse with partial-json, validate tolerantly. The model
 * emits { note, updatedResume } with note FIRST, so the note streams into
 * the chat bubble while the resume body is still generating; updatedResume
 * replaces the preview live once it passes the min-length gate.
 */
import { useCallback, useRef, useState } from 'react';
import { parse, ALL } from 'partial-json';
import { partialValidateRefine } from '../lib/schema.js';
import { parseSSE, httpErrorMessage } from '../lib/sse.js';
import { stripJsonFences } from '../lib/fences.js';
import { clampHistory } from '../lib/history.js';

const VERSION_CAP = 10;

export function useRefine() {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [pendingNote, setPendingNote] = useState('');
  const [currentResume, setCurrentResume] = useState('');
  const [liveResume, setLiveResume] = useState('');
  // Undo stack entries are { resume, trail } — the score trail is versioned
  // WITH the resume so revert rolls the score strip back in lockstep.
  const [versions, setVersions] = useState([]);
  const [scoreTrail, setScoreTrail] = useState([]);
  const abortRef = useRef(null);
  const jdRef = useRef('');

  const start = useCallback((baseResume, jobDescription = '') => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = null;
    jdRef.current = jobDescription || '';
    setStatus('idle');
    setError(null);
    setMessages([]);
    setPendingNote('');
    setCurrentResume(baseResume || '');
    setLiveResume('');
    setVersions([]);
    setScoreTrail([]);
  }, []);

  const reset = useCallback(() => start(''), [start]);

  const revert = useCallback(() => {
    if (!versions.length || status === 'streaming') return;
    const previous = versions[versions.length - 1];
    setVersions(versions.slice(0, -1));
    setCurrentResume(previous.resume);
    setScoreTrail(previous.trail);
    setLiveResume('');
  }, [versions, status]);

  const send = useCallback(
    async (instruction) => {
      const text = (instruction || '').trim();
      if (!text || !currentResume || status === 'streaming') return;

      // Snapshot BEFORE mutating state: the API gets the pre-turn history
      // and the pre-turn resume; the new user turn goes in `instruction`.
      const history = clampHistory(messages);
      const prevResume = currentResume;
      const prevTrail = scoreTrail;

      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      setMessages((m) => [...m, { role: 'user', content: text }]);
      setPendingNote('');
      setLiveResume('');
      setError(null);
      setStatus('streaming');

      let res;
      try {
        res = await fetch('/api/refine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resumeMarkdown: prevResume,
            instruction: text,
            jobDescription: jdRef.current,
            history,
          }),
          signal: ctrl.signal,
        });
      } catch (err) {
        if (err?.name === 'AbortError') return;
        setStatus('error');
        setError(`Network error: ${err?.message || 'unknown'}.`);
        return;
      }

      const ct = res.headers.get('content-type') || '';
      if (!res.ok || !ct.includes('text/event-stream')) {
        // Server returned a regular JSON error or HTML — surface it.
        setStatus('error');
        setError(await httpErrorMessage(res));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulator = '';
      let latestNote = '';
      let finished = false;

      const finish = () => {
        if (finished) return;
        finished = true;
        let final = null;
        try {
          final = partialValidateRefine(JSON.parse(stripJsonFences(accumulator)));
        } catch {
          // Stream ended mid-JSON — fall back to the last tolerant partial.
          try {
            final = partialValidateRefine(parse(stripJsonFences(accumulator), ALL));
          } catch {
            final = null;
          }
        }
        if (final?.updatedResume) {
          // Commit: previous version (resume + score trail) onto the undo
          // stack (cap 10), new version becomes current.
          setVersions((v) => [
            ...v.slice(-(VERSION_CAP - 1)),
            { resume: prevResume, trail: prevTrail },
          ]);
          setCurrentResume(final.updatedResume);
          if (typeof final.updatedScore === 'number') {
            setScoreTrail([...prevTrail, final.updatedScore]);
          }
        }
        const note =
          final?.note || latestNote || (final?.updatedResume ? 'Updated the resume.' : '');
        setMessages((m) => [
          ...m,
          {
            role: 'assistant',
            content:
              note ||
              'I could not produce an updated resume for that — the current version is unchanged.',
          },
        ]);
        setPendingNote('');
        setLiveResume('');
        setStatus('done');
      };

      const processEvents = () => {
        const { events, rest } = parseSSE(buffer);
        buffer = rest;
        for (const { event, data } of events) {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch {
            continue;
          }
          if (event === 'chunk' && typeof parsed.text === 'string') {
            accumulator += parsed.text;
            try {
              const partial = parse(stripJsonFences(accumulator), ALL);
              const validated = partialValidateRefine(partial);
              if (validated) {
                if (validated.note) {
                  latestNote = validated.note;
                  setPendingNote(validated.note);
                }
                if (validated.updatedResume) setLiveResume(validated.updatedResume);
              }
            } catch {
              /* not parseable yet — wait for more */
            }
          } else if (event === 'done') {
            finish();
          } else if (event === 'error') {
            finished = true;
            setPendingNote('');
            setLiveResume('');
            setStatus('error');
            setError(parsed.error || 'Upstream error.');
          }
        }
      };

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          processEvents();
        }
        buffer += decoder.decode();
        processEvents();
        // Stream closed without a done/error event — still commit what we got.
        finish();
      } catch (err) {
        if (err?.name === 'AbortError') return;
        setStatus('error');
        setError(err?.message || 'Stream interrupted.');
      }
    },
    [messages, currentResume, scoreTrail, status]
  );

  return {
    status,
    error,
    active: Boolean(currentResume),
    messages,
    pendingNote,
    currentResume,
    liveResume,
    canRevert: versions.length > 0,
    scoreTrail,
    currentScore: scoreTrail.length ? scoreTrail[scoreTrail.length - 1] : null,
    start,
    send,
    revert,
    reset,
  };
}
