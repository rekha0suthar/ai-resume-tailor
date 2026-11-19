import React, { useCallback, useRef, useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { INPUT_MIN } from '../lib/prompts.js';

const MAX_PDF_BYTES = 5 * 1024 * 1024; // 5 MB — plenty for a text resume

async function extractTextFromPdf(file) {
  // Lazy-load pdfjs — keeps the initial bundle under ~150KB.
  const pdfjs = await import('pdfjs-dist/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
  ).toString();

  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  let text = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    text +=
      content.items
        .map((it) => (typeof it.str === 'string' ? it.str : ''))
        .join(' ')
        .replace(/\s+\n/g, '\n')
        .replace(/[ \t]+/g, ' ') + '\n';
  }
  return text.trim();
}

const PdfUpload = ({ onExtract, disabled }) => {
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState(null);
  const inputRef = useRef(null);

  const handleFile = useCallback(
    async (file) => {
      if (!file) return;
      if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
        toast.error('Please upload a PDF file.');
        return;
      }
      if (file.size > MAX_PDF_BYTES) {
        toast.error('PDF is larger than 5 MB — paste the text instead.');
        return;
      }
      setLoading(true);
      try {
        const text = await extractTextFromPdf(file);
        // Below the submit threshold → extraction effectively failed.
        if (text.length < INPUT_MIN) {
          toast.error('Could not read text from that PDF (it may be a scanned image).');
        } else {
          onExtract(text);
          setFileName(file.name);
          toast.success(`Extracted ${text.length.toLocaleString()} characters.`);
        }
      } catch (err) {
        console.error('[pdf upload]', err);
        toast.error('Failed to read PDF. Try pasting the text instead.');
      } finally {
        setLoading(false);
      }
    },
    [onExtract]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      if (disabled || loading) return;
      const file = e.dataTransfer.files?.[0];
      handleFile(file);
    },
    [disabled, loading, handleFile]
  );

  const handleChoose = (e) => handleFile(e.target.files?.[0]);
  const clear = () => {
    setFileName(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  if (fileName) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-success/40 bg-success/10 px-4 py-2.5 text-sm">
        <span className="flex items-center gap-2 text-success">
          <FileText size={16} />
          <span className="truncate">{fileName}</span>
        </span>
        <button
          onClick={clear}
          className="text-success/80 hover:text-white"
          aria-label="Remove file"
          type="button"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <label
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className={`flex items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 bg-surface-1 px-4 py-2.5 text-sm transition cursor-pointer ${
        disabled || loading
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:border-accent/60 hover:bg-accent/5'
      }`}
    >
      <Upload size={16} className="text-slate-400" />
      <span className="text-slate-300">
        {loading ? 'Reading PDF…' : 'Drop a PDF here or click to upload'}
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={handleChoose}
        className="hidden"
        disabled={disabled || loading}
      />
    </label>
  );
};

export default PdfUpload;
