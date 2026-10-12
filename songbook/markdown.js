// OSO Web3 Songbook — safe Markdown rendering (spec §24, §28.19).
//
// XSS-safe BY CONSTRUCTION: the source is HTML-escaped FIRST, then a small
// whitelist of Markdown transforms builds markup from the escaped text.
// No user-controlled string is ever interpreted as HTML; links allow only
// http(s) and are rel="noopener noreferrer". No sanitizer library to trust —
// there is simply no path for raw HTML to survive.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ESC[ch]);
}

function inline(md) {
  let s = md;
  // inline code first — its contents stay literal (already escaped)
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  // bold, then italic
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  // [label](http(s)://url) — escaped source means no quotes can break out
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  return s;
}

/// Render Markdown (lyrics/chords-oriented subset) to safe HTML.
/// Supported: #/##/### headings, **bold**, *italic*, `code`, fenced code
/// blocks (``` — chord charts render monospace, spacing preserved), > quotes,
/// - lists, http(s) links, blank-line paragraphs, single-newline line breaks
/// (essential for lyrics).
export function renderMarkdown(md) {
  const src = escapeHtml(String(md || '').replace(/\r\n/g, '\n'));
  const lines = src.split('\n');
  const out = [];
  let para = [], list = null, fence = null, quote = null;

  const flushPara = () => { if (para.length) { out.push('<p>' + para.map(inline).join('<br>') + '</p>'); para = []; } };
  const flushList = () => { if (list) { out.push('<ul>' + list.map((li) => '<li>' + inline(li) + '</li>').join('') + '</ul>'); list = null; } };
  const flushQuote = () => { if (quote) { out.push('<blockquote>' + quote.map(inline).join('<br>') + '</blockquote>'); quote = null; } };

  for (const line of lines) {
    if (fence !== null) {
      if (/^```/.test(line)) { out.push('<pre class="sb-pre">' + fence.join('\n') + '</pre>'); fence = null; }
      else fence.push(line);
      continue;
    }
    if (/^```/.test(line)) { flushPara(); flushList(); flushQuote(); fence = []; continue; }

    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) { flushPara(); flushList(); flushQuote(); out.push(`<h${h[1].length + 2} class="sb-h">` + inline(h[2]) + `</h${h[1].length + 2}>`); continue; }

    const li = line.match(/^\s*[-*]\s+(.*)$/);
    if (li) { flushPara(); flushQuote(); (list ||= []).push(li[1]); continue; }
    flushList();

    const q = line.match(/^&gt;\s?(.*)$/); // '>' was escaped above
    if (q) { flushPara(); (quote ||= []).push(q[1]); continue; }
    flushQuote();

    if (line.trim() === '') { flushPara(); continue; }
    para.push(line);
  }
  flushPara(); flushList(); flushQuote();
  if (fence !== null) out.push('<pre class="sb-pre">' + fence.join('\n') + '</pre>');
  return out.join('\n');
}
