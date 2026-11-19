/**
 * useTailor() — manages the streaming /api/tailor call.
 *
 * Returns:
 *   status:  'idle' | 'streaming' | 'done' | 'error'
 *   result:  the live partial result (TailorResponseSchema-shaped)
 *   error:   string | null
 *   tokens:  approximate token count received so far
 *   submit({ resumeText, jobDescription }): kick off a new tailor
 *   reset():                                  clear state
 *
 * Behaviour: as each SSE chunk arrives the hook appends to an accumulator,
 * tries to parse it with the partial-json library, and updates `result`. The
 * UI re-renders progressively — bullets appear the moment each one is
 * complete in the model's output, instead of waiting for the whole response.
 */
import { useCallback, useRef, useState } from 'react';
import { parse, ALL } from 'partial-json';
import { partialValidate } from '../lib/schema.js';
import { parseSSE } from '../lib/sse.js';
import { stripJsonFences } from '../lib/fences.js';

const empty = {
  overall_match_score: 0,
  tailored_bullets: [],
  missing_keywords: [],
  interview_questions: [],
  tailoredResume: '',
};

export function useTailor() {
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(empty);
  const [error, setError] = useState(null);
  const [tokens, setTokens] = useState(0);
  const abortRef = useRef(null);

  const reset = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = null;
    setStatus('idle');
    setResult(empty);
    setError(null);
    setTokens(0);
  }, []);

  const submit = useCallback(async ({ resumeText, jobDescription }) => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setStatus('streaming');
    setResult(empty);
    setError(null);
    setTokens(0);

    let res;
    try {
      res = await fetch('/api/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, jobDescription }),
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
      const raw = await res.text();
      let msg = `Request failed (HTTP ${res.status}).`;
      try {
        const j = JSON.parse(raw);
        msg = j?.error || msg;
      } catch {
        if (raw.trimStart().startsWith('<')) {
          msg = 'Server returned HTML — run with `npm run dev` (which routes /api) or check the deploy.';
        }
      }
      setStatus('error');
      setError(msg);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let accumulator = '';

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
          setTokens((n) => n + Math.max(1, Math.round(parsed.text.length / 4)));
          try {
            // Without json_object mode the model may wrap the JSON in a
            // ```json fence — strip it before the partial parse.
            const partial = parse(stripJsonFences(accumulator), ALL);
            const validated = partialValidate(partial);
            if (validated) setResult(validated);
          } catch {
            /* not parseable yet — wait for more */
          }
        } else if (event === 'done') {
          try {
            const final = JSON.parse(stripJsonFences(accumulator));
            const validated = partialValidate(final);
            if (validated) setResult(validated);
          } catch {
            /* keep last partial */
          }
          setStatus('done');
        } else if (event === 'error') {
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
      // Final flush
      buffer += decoder.decode();
      processEvents();
      // Functional update: `status` from the outer scope would be stale here
      // (this callback has [] deps), so decide off the latest value instead.
      setStatus((s) => (s === 'streaming' ? 'done' : s));
    } catch (err) {
      if (err?.name === 'AbortError') return;
      setStatus('error');
      setError(err?.message || 'Stream interrupted.');
    }
  }, []);

  return { status, result, error, tokens, submit, reset };
}
