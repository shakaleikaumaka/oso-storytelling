/* Open Source Orchestra · /learn/ · learn.js · GPL-3.0 · by the AI ʻohana with KALA 🪕
   Progressive: the page is complete without this file. Adds transpose (±semitones, shapes follow),
   auto-scroll in a bottom bar that never covers text (the page scrolls above it; ✕ closes it), copy-link. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var SH = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  var FL = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  var FLATKEYS = { F: 1, Bb: 1, Eb: 1, Ab: 1, Db: 1, Gb: 1, Dm: 1, Gm: 1, Cm: 1, Fm: 1, Bbm: 1, Ebm: 1 };
  var page = $('#page'), bar = $('#bar'), toolbar = $('#toolbar');
  if (!page) return;
  var shapes = {};
  try { shapes = JSON.parse($('#shapes').textContent); } catch (e) { shapes = { uke: {}, guitar: {} }; }

  function idx(root) { var i = SH.indexOf(root); return i < 0 ? FL.indexOf(root) : i; }
  function tr(ch, n, flat) {
    var m = /^([A-G][#b]?)(.*)$/.exec(ch); if (!m) return ch;
    var i = idx(m[1]); if (i < 0) return ch;
    return (flat ? FL : SH)[(i + n + 1200) % 12] + m[2];
  }
  function sign(n) { return n > 0 ? '+' + n : n < 0 ? '−' + (-n) : '0'; }

  /* ---- chord diagram (same geometry as build.py) ---- */
  function diagram(chord, shape, inst) {
    var frets = shape.split('').map(function (c) { return c === 'x' ? null : +c; });
    var played = frets.filter(function (f) { return f; });
    var base = 1, span = 4, n = frets.length, sx = 22, sy = 24, top = 30, left = 16;
    if (played.length && Math.max.apply(null, played) > 4) base = Math.min.apply(null, played);
    var w = left * 2 + sx * (n - 1), h = top + sy * span + 18, o = [];
    o.push('<svg class="dg" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + chord + ' on ' + (inst === 'uke' ? 'ukulele' : 'guitar') + ': ' + shape + '">');
    if (base === 1) o.push('<rect x="' + (left - 2) + '" y="' + (top - 4) + '" width="' + (sx * (n - 1) + 4) + '" height="5" rx="1" class="nut"/>');
    else o.push('<text x="' + (left - 8) + '" y="' + (top + sy * 0.7) + '" class="fr" text-anchor="end">' + base + 'fr</text>');
    for (var i = 0; i <= span; i++) { var y = top + i * sy; o.push('<line x1="' + left + '" y1="' + y + '" x2="' + (left + sx * (n - 1)) + '" y2="' + y + '" class="ln"/>'); }
    for (var s = 0; s < n; s++) {
      var x = left + s * sx, f = frets[s];
      o.push('<line x1="' + x + '" y1="' + top + '" x2="' + x + '" y2="' + (top + sy * span) + '" class="ln"/>');
      if (f === null) o.push('<text x="' + x + '" y="' + (top - 11) + '" class="mk" text-anchor="middle">×</text>');
      else if (f === 0) o.push('<circle cx="' + x + '" cy="' + (top - 15) + '" r="4.5" class="op"/>');
      else o.push('<circle cx="' + x + '" cy="' + (top + (f - base + 0.5) * sy) + '" r="8" class="dot"/>');
    }
    o.push('<text x="' + (w / 2) + '" y="' + (h - 3) + '" class="sh" text-anchor="middle">' + shape + '</text></svg>');
    return o.join('');
  }

  /* ---- transpose ---- */
  var strip = $('#strip'), stripNote = $('#strip-note');
  var stripOrig = strip ? strip.innerHTML : '', stripNoteOrig = stripNote ? stripNote.textContent : '';
  var semis = 0;
  function render() {
    $$('.song').forEach(function (song) {
      var key = song.getAttribute('data-key') || 'C';
      var flat = !!FLATKEYS[tr(key, semis, true)];
      $$('.ch[data-c]', song).forEach(function (el) { el.textContent = tr(el.getAttribute('data-c'), semis, flat); });
    });
    if (strip) {
      if (semis === 0) { strip.innerHTML = stripOrig; if (stripNote) stripNote.textContent = stripNoteOrig; }
      else {
        var lk = ($('.song') && $('.song').getAttribute('data-key')) || 'G';
        var flat = !!FLATKEYS[tr(lk, semis, true)];
        $$('.chordcard', strip).forEach(function (card) {
          var name = tr(card.getAttribute('data-chord'), semis, flat);
          var alt = tr(card.getAttribute('data-chord'), semis, !flat);
          var u = shapes.uke[name] || shapes.uke[alt], g = shapes.guitar[name] || shapes.guitar[alt];
          $('.cname .ch', card).textContent = name;
          var figs = $$('figure', card);
          figs[0].innerHTML = '<figcaption>ukulele</figcaption>' + (u ? diagram(name, u, 'uke') : '<p class="dnote">no shape on file</p>');
          figs[1].innerHTML = '<figcaption>guitar</figcaption>' + (g ? diagram(name, g, 'guitar') : '<p class="dnote">no shape on file</p>');
          var dn = $('.dnote', card); if (dn && dn.parentNode === card) dn.remove();
        });
        if (stripNote) stripNote.textContent = stripNoteOrig + ' Transposed ' + sign(semis) + ': standard first-position shapes (KALA’s own picks show at 0).';
      }
    }
    $$('#trval,#trval2').forEach(function (o) { o.textContent = sign(semis); });
  }
  function transpose(delta, abs) {
    semis = abs ? 0 : ((semis + delta + 12 + 6) % 12) - 6; /* keep within −6…+5 */
    render();
  }
  $$('[data-tr]').forEach(function (b) {
    b.addEventListener('click', function () { var v = b.getAttribute('data-tr'); transpose(v === '0' ? 0 : +v, v === '0'); });
  });

  /* ---- auto-scroll bar ---- */
  var playing = false, speed = 3, acc = 0, last = 0, raf = 0;
  var playBtn = $('#bar-play'), spOut = $('#spval');
  function scroller() { return document.body.classList.contains('bar-on') ? page : null; }
  function setPlay(on) {
    playing = on;
    if (playBtn) { playBtn.setAttribute('aria-pressed', on ? 'true' : 'false'); playBtn.textContent = on ? '⏸' : '▶'; playBtn.setAttribute('aria-label', on ? 'Pause auto-scroll' : 'Start auto-scroll'); }
    if (on) { last = performance.now(); acc = 0; raf = requestAnimationFrame(step); } else if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }
  function step(t) {
    if (!playing) return;
    var el = scroller(); if (!el) { setPlay(false); return; }
    var dt = Math.min(100, t - last); last = t;
    acc += speed * 14 * dt / 1000; /* px per second = speed × 14 */
    if (acc >= 1) { var px = Math.floor(acc); acc -= px; el.scrollTop += px; }
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) { setPlay(false); return; }
    raf = requestAnimationFrame(step);
  }
  function setSpeed(d) { speed = Math.max(1, Math.min(9, speed + d)); if (spOut) spOut.textContent = speed; }
  $$('[data-sp]').forEach(function (b) { b.addEventListener('click', function () { setSpeed(+b.getAttribute('data-sp')); }); });
  if (playBtn) playBtn.addEventListener('click', function () { setPlay(!playing); });
  ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(function (ev) {
    page.addEventListener(ev, function (e) { if (playing && !(e.target && e.target.closest && e.target.closest('.bar'))) setPlay(false); }, { passive: true });
  });

  function barHeight() { document.documentElement.style.setProperty('--bar-h', (bar && !bar.hidden ? bar.offsetHeight : 0) + 'px'); }
  function setBar(on, remember) {
    if (!bar) return;
    var y = document.body.classList.contains('bar-on') ? page.scrollTop : window.scrollY;
    if (!on) setPlay(false);
    bar.hidden = !on;
    document.body.classList.toggle('bar-on', on);
    barHeight();
    if (on) page.scrollTop = y; else window.scrollTo(0, y);
    if (remember) { try { localStorage.setItem('oso-learn-bar', on ? 'on' : 'off'); } catch (e) { /* private mode */ } }
  }
  var close = $('#bar-close'), open = $('#bar-open');
  if (close) close.addEventListener('click', function () { setBar(false, true); if (open) open.focus(); });
  if (open) open.addEventListener('click', function () { setBar(true, true); setPlay(true); });
  window.addEventListener('resize', barHeight);
  if (toolbar) toolbar.hidden = false;
  var pref = null; try { pref = localStorage.getItem('oso-learn-bar'); } catch (e) { pref = null; }
  var hasBar = !!bar && window.matchMedia('(min-height: 420px)').matches && !window.matchMedia('print').matches;
  setBar(hasBar && pref !== 'off', false);
  if (location.hash) { var tgt = $(location.hash); if (tgt && tgt.scrollIntoView) setTimeout(function () { tgt.scrollIntoView(); }, 0); }
  window.addEventListener('hashchange', function () { var t = $(location.hash); if (t) t.scrollIntoView(); });

  /* ---- copy link ---- */
  if (navigator.clipboard) {
    $$('.copy').forEach(function (b) {
      b.hidden = false;
      b.addEventListener('click', function () {
        var url = location.origin + location.pathname + b.getAttribute('data-href');
        navigator.clipboard.writeText(url).then(function () { var t = b.textContent; b.textContent = 'copied ✓'; setTimeout(function () { b.textContent = t; }, 1600); });
      });
    });
  }
  render();
  document.documentElement.classList.add('js');
})();
