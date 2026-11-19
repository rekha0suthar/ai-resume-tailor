import React, { useEffect, useRef, useState } from 'react';
import { TEMPLATES, DEFAULT_TEMPLATE } from './ResumePreview.jsx';

const A4 = { w: 210, h: 297 }; // mm

/** "20mm 22mm" → { v: 20, h: 22 } (one value → both). */
const parseMargin = (pageMargin) => {
  const nums = (String(pageMargin).match(/[\d.]+/g) || ['20']).map(Number);
  return { v: nums[0], h: nums.length > 1 ? nums[1] : nums[0] };
};

/**
 * PageBoundary — wraps the preview sheet and, when the content runs past
 * one printed A4 page, draws a thin dashed "Page 1 ends here" line where
 * the first page break will land for the CURRENT template.
 *
 * Approximation: the printable page height is derived from the A4 aspect
 * ratio minus the template's print margins, scaled to the on-screen
 * sheet's content width (the sheet's own padding stands in for the page
 * margins). Print rounding, break-avoid rules, and font metrics shift the
 * real break slightly — hence the "approx." label. Measurement is a
 * ResizeObserver on the sheet, so it tracks streaming content, template
 * switches, and window resizes.
 *
 * `onOverflowChange(bool)` lets the parent show a nudge when the resume
 * runs past one page. The indicator is preview-only (the print portal
 * renders ResumePreview directly, and the overlay is print:hidden anyway).
 */
const PageBoundary = ({ template, onOverflowChange, children }) => {
  const wrapRef = useRef(null);
  const [boundary, setBoundary] = useState(null);
  const notifyRef = useRef(onOverflowChange);
  notifyRef.current = onOverflowChange;

  useEffect(() => {
    const sheet = wrapRef.current?.querySelector('.resume-sheet');
    if (!sheet || typeof ResizeObserver === 'undefined') return undefined;
    const t = TEMPLATES[template] || TEMPLATES[DEFAULT_TEMPLATE];
    const { v, h } = parseMargin(t.pageMargin);

    const measure = () => {
      const cs = getComputedStyle(sheet);
      const padL = parseFloat(cs.paddingLeft) || 0;
      const padR = parseFloat(cs.paddingRight) || 0;
      const padT = parseFloat(cs.paddingTop) || 0;
      const contentW = sheet.clientWidth - padL - padR;
      if (contentW <= 0) return;
      // Printable page height, scaled to the on-screen content width.
      const pageH = (contentW * (A4.h - 2 * v)) / (A4.w - 2 * h);
      const y = padT + pageH;
      // Tolerance: spilling by less than ~a line doesn't count as overflow.
      const overflows = sheet.scrollHeight > y + 18;
      setBoundary(overflows ? y : null);
      notifyRef.current?.(overflows);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(sheet);
    return () => ro.disconnect();
  }, [template]);

  return (
    <div ref={wrapRef} className="relative">
      {children}
      {boundary != null && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 w-full max-w-[720px] -translate-x-1/2 print:hidden"
          style={{ top: boundary }}
        >
          <div className="border-t border-dashed border-error/70" />
          <span className="absolute -top-2.5 right-1 rounded bg-ink-900/80 px-1.5 py-0.5 text-[10px] font-medium text-error/90 backdrop-blur-sm">
            Page 1 ends here (approx.)
          </span>
        </div>
      )}
    </div>
  );
};

export default PageBoundary;
