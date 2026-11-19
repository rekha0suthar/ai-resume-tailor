/**
 * usePdfPageCount — the TRUE page count of the downloadable PDF.
 *
 * The old PageBoundary indicator measured the HTML preview sheet, but the
 * downloaded PDF is rendered by @react-pdf with different fonts/metrics,
 * so its real page breaks differ — the line was honest-looking and wrong.
 * This hook replaces estimation with truth: once the resume content
 * settles (debounced), it renders the ACTUAL PDF in the background through
 * the same lazy module the Download button uses and counts its pages.
 *
 * Chunk policy: the ~1.2MB pdf chunk is never loaded eagerly on first
 * render. It loads through requestIdleCallback (setTimeout fallback) once
 * a tailored resume exists — which both powers the page count and
 * pre-warms the chunk so the user's eventual Download click is instant.
 *
 * Races: a token invalidates in-flight work whenever the inputs change
 * (template switched mid-render, refinement landed) or the component
 * unmounts, so a stale render can never overwrite a newer count. The
 * result is stored WITH the inputs it was computed from, and "checking"
 * is derived (stored inputs ≠ current inputs) rather than set in the
 * effect, so stale-looking state is impossible by construction.
 */

import { createElement, useEffect, useRef, useState } from 'react';
import { parseResume } from '../lib/resumeParser.js';
import { countPagesFromBytes } from '../lib/pdfPageCount.js';

/** Settle time after the last content/template change before rendering. */
export const PAGE_COUNT_DEBOUNCE_MS = 800;

let pdfModulePromise = null;
/**
 * Memoized dynamic import of the heavy PDF module — shared by the page
 * counter and the Download button, so the chunk loads exactly once.
 */
export function loadPdfModule() {
  pdfModulePromise ||= import('../pdf/ResumePdf.jsx');
  return pdfModulePromise;
}

/** Run `cb` when the browser is idle; returns a canceller. */
function onIdle(cb) {
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(cb, { timeout: 2000 });
    return () => window.cancelIdleCallback(id);
  }
  const id = setTimeout(cb, 200);
  return () => clearTimeout(id);
}

/** Pages in a rendered PDF blob: pdfjs (robust) with a byte-scan fallback. */
async function countPdfPages(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  try {
    // Same lazy pdfjs setup PdfUpload uses — kept out of the main chunk.
    const pdfjs = await import('pdfjs-dist/build/pdf.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.mjs',
      import.meta.url
    ).toString();
    // getDocument may transfer the buffer, so hand it a copy.
    const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise;
    const pages = doc.numPages;
    await doc.destroy();
    return pages;
  } catch {
    return countPagesFromBytes(bytes);
  }
}

/**
 * @param {string} markdown  current resume markdown (the version on the sheet)
 * @param {string} template  selected template id
 * @param {boolean} enabled  false while streaming/refining — counting waits
 * @returns {{ status: 'idle'|'checking'|'ready'|'error', pages: number|null }}
 */
export function usePdfPageCount(markdown, template, enabled) {
  // Last finished count, tagged with the inputs it was computed from.
  const [result, setResult] = useState(null);
  const tokenRef = useRef(0);
  const active = Boolean(markdown && enabled);

  // Pre-warm the chunk as soon as any resume exists, even mid-stream.
  const warmedRef = useRef(false);
  useEffect(() => {
    if (!markdown || warmedRef.current) return undefined;
    return onIdle(() => {
      warmedRef.current = true;
      loadPdfModule().catch(() => {});
    });
  }, [markdown]);

  useEffect(() => {
    if (!active) return undefined;
    const token = ++tokenRef.current;

    let cancelIdle = null;
    const timer = setTimeout(() => {
      cancelIdle = onIdle(async () => {
        try {
          const { default: ResumePdf, pdf } = await loadPdfModule();
          if (tokenRef.current !== token) return;
          const doc = parseResume(markdown);
          const blob = await pdf(createElement(ResumePdf, { doc, template })).toBlob();
          if (tokenRef.current !== token) return;
          const pages = await countPdfPages(blob);
          if (tokenRef.current !== token) return;
          setResult({ markdown, template, status: 'ready', pages });
        } catch (err) {
          if (tokenRef.current !== token) return;
          console.error('[pdf page count]', err);
          setResult({ markdown, template, status: 'error', pages: null });
        }
      });
    }, PAGE_COUNT_DEBOUNCE_MS);

    return () => {
      tokenRef.current += 1; // invalidate in-flight work (incl. on unmount)
      clearTimeout(timer);
      cancelIdle?.();
    };
  }, [active, markdown, template]);

  if (!active) return { status: 'idle', pages: null };
  if (result && result.markdown === markdown && result.template === template) {
    return { status: result.status, pages: result.pages };
  }
  // A count for the CURRENT inputs is pending; show the previous number
  // (if any) in the meantime so the badge doesn't flash empty.
  return { status: 'checking', pages: result ? result.pages : null };
}
