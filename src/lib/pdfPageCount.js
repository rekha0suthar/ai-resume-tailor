/**
 * Count the pages of a PDF from its raw bytes — the fallback path when
 * pdfjs isn't available (the page-count hook tries pdfjs first).
 *
 * Scans for "/Type /Page" object markers, excluding "/Pages" (the page-TREE
 * nodes, which exist in every PDF but aren't pages). @react-pdf writes
 * classic uncompressed object dictionaries, so the markers are always
 * visible in the byte stream. Pure function — unit-tested in plain node.
 */

const PAGE_MARKER_RE = /\/Type\s*\/Page(?![a-zA-Z])/g;

/**
 * @param {Uint8Array|ArrayBuffer|string} bytes  raw PDF bytes
 * @returns {number} page count (0 when no page objects are found)
 */
export function countPagesFromBytes(bytes) {
  let text;
  if (typeof bytes === 'string') {
    text = bytes;
  } else {
    const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    // PDF structure tokens are ASCII; latin1 maps every byte 1:1.
    text = new TextDecoder('latin1').decode(view);
  }
  const matches = text.match(PAGE_MARKER_RE);
  return matches ? matches.length : 0;
}
