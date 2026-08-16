// OSO Web3 Songbook — ChordPro interoperability (spec §8, §24).
//
// The Open Source Orchestrator (github.com/ShakaLei/open-source-orchestrator)
// keeps its community catalog in ChordPro (.pro) files — including
// catalog/shaka-lei-kaumaka/. These helpers convert between that format and
// the Markdown songbook documents used here, so the two tools share songs
// instead of duplicating parsers. Conversion is intentionally conservative:
// what it doesn't understand it passes through as plain lines.

/// ChordPro -> Markdown songbook document.
///   {title:/artist:/key:/tempo:} -> heading + metadata lines
///   {comment: X} / {c: X}        -> *italic* note
///   lines with [C]hords          -> fenced block, chords lifted ABOVE the words
///   | C | F | G |  bar lines     -> fenced block, kept verbatim
export function chordProToMarkdown(pro) {
  const lines = String(pro || '').replace(/\r\n/g, '\n').split('\n');
  const meta = {};
  const out = [];
  let fence = []; // pending chord/lyric block

  const flushFence = () => {
    if (fence.length) { out.push('```', ...fence, '```'); fence = []; }
  };

  for (const raw of lines) {
    const d = raw.match(/^\{\s*([a-zA-Z_]+)\s*:\s*(.*?)\s*\}\s*$/);
    if (d) {
      const key = d[1].toLowerCase(), val = d[2];
      if (key === 'title' || key === 'artist' || key === 'key' || key === 'tempo') { meta[key] = val; continue; }
      if (key === 'comment' || key === 'c') { flushFence(); out.push('', '*' + val + '*', ''); continue; }
      continue; // unknown directive — metadata only, skip
    }
    if (/\[[^\]\s]+\]/.test(raw)) { fence.push(...liftChords(raw)); continue; }
    if (/^\s*\|/.test(raw)) { fence.push(raw); continue; }
    flushFence();
    out.push(raw);
  }
  flushFence();

  const head = [];
  if (meta.title) head.push('# ' + meta.title);
  const sub = [meta.artist, meta.key && 'key ' + meta.key, meta.tempo && '~' + meta.tempo + ' bpm'].filter(Boolean).join(' · ');
  if (sub) head.push(sub);
  if (head.length) head.push('');
  return (head.join('\n') + out.join('\n')).replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

/// One ChordPro lyric line -> [chordLine, lyricLine] with chords aligned above.
function liftChords(line) {
  let chords = '', lyrics = '';
  let i = 0;
  while (i < line.length) {
    if (line[i] === '[') {
      const end = line.indexOf(']', i);
      if (end === -1) { lyrics += line.slice(i); break; }
      const chord = line.slice(i + 1, end);
      while (chords.length < lyrics.length) chords += ' ';
      chords += chord + ' ';
      i = end + 1;
    } else {
      lyrics += line[i];
      i++;
    }
  }
  return chords.trim() ? [chords.replace(/\s+$/, ''), lyrics] : [lyrics];
}

/// Markdown songbook document -> minimal ChordPro (best-effort round trip).
/// Fenced chord blocks: chord-over-lyric pairs are re-folded into [C]lyric
/// lines; bar lines pass through. Headings become {title}/{comment}.
export function markdownToChordPro(md) {
  const lines = String(md || '').replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let inFence = false, pendingChords = null, first = true;

  const isChordToken = (t) => /^[A-G][#b]?(m|maj|min|dim|aug|sus|add)?[0-9]*(\/[A-G][#b]?)?$/.test(t);
  const isChordLine = (l) => {
    const toks = l.trim().split(/\s+/).filter(Boolean);
    return toks.length > 0 && toks.every(isChordToken);
  };

  for (const raw of lines) {
    if (/^```/.test(raw)) { if (inFence && pendingChords) { out.push(foldChords(pendingChords, '')); pendingChords = null; } inFence = !inFence; continue; }
    if (!inFence) {
      const h1 = raw.match(/^#\s+(.*)$/);
      if (h1 && first) { out.push('{title: ' + h1[1] + '}'); first = false; continue; }
      const h = raw.match(/^#{1,3}\s+(.*)$/);
      if (h) { out.push('{comment: ' + h[1] + '}'); continue; }
      const it = raw.match(/^\*([^*]+)\*\s*$/);
      if (it) { out.push('{comment: ' + it[1] + '}'); continue; }
      out.push(raw);
      continue;
    }
    // inside fence
    if (/^\s*\|/.test(raw)) { out.push(raw); continue; }
    if (isChordLine(raw)) {
      if (pendingChords) out.push(foldChords(pendingChords, ''));
      pendingChords = raw;
      continue;
    }
    if (pendingChords) { out.push(foldChords(pendingChords, raw)); pendingChords = null; }
    else out.push(raw);
  }
  if (pendingChords) out.push(foldChords(pendingChords, ''));
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

/// Fold an aligned chord line back into the lyric line as [C]hord markers.
function foldChords(chordLine, lyricLine) {
  const inserts = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(chordLine)) !== null) inserts.push({ pos: m.index, chord: m[0] });
  let result = '', last = 0;
  const lyr = lyricLine || '';
  for (const { pos, chord } of inserts) {
    const p = Math.min(pos, lyr.length);
    result += lyr.slice(last, p) + '[' + chord + ']';
    last = p;
  }
  result += lyr.slice(last);
  return result;
}
