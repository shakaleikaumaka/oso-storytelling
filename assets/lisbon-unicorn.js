/* 🦄 Lisbon Unicorn · 13 Nov 2026 · dates 12–14 Oct 2027 since 14 Nov 2026 (Devcon moved them one day later than first announced)
   One small, self-hosted door to the officially announced Devcon IX.
   No audio, storage, tracking, network calls, or third-party runtime.
   The only onward navigation is the visitor's explicit click. */
(function () {
  'use strict';
  if (document.getElementById('lisbon-unicorn-door')) return;

  var link = document.createElement('a');
  link.id = 'lisbon-unicorn-door';
  link.href = 'https://devcon.org/lisbon/';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.setAttribute('aria-label', 'Devcon IX in Lisbon, 12–14 October 2027 — open the official Devcon website in a new tab');
  link.title = '🦄 Devcon IX · Lisbon · 12–14 October 2027 — official site';
  link.setAttribute('data-lisbon-unicorn', '');
  link.innerHTML = '<span class="lisbon-unicorn-icon" aria-hidden="true">🦄</span>' +
    '<span class="lisbon-unicorn-copy"><strong>Devcon IX · Lisbon</strong><small>12–14 October 2027</small></span>';

  var style = document.createElement('style');
  style.textContent =
    '#lisbon-unicorn-door{position:fixed;left:max(14px,env(safe-area-inset-left,0px));bottom:max(14px,env(safe-area-inset-bottom,0px));z-index:999997;display:inline-flex;align-items:center;gap:9px;max-width:calc(100vw - 28px);padding:8px 14px 8px 10px;border:1px solid rgba(226,190,255,.82);border-radius:999px;background:linear-gradient(135deg,rgba(48,25,72,.97),rgba(15,48,57,.97));color:#fff7ff;text-decoration:none;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.12;box-shadow:0 7px 28px rgba(9,5,20,.48),0 0 22px rgba(199,146,234,.18);backdrop-filter:blur(10px);transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}' +
    '#lisbon-unicorn-door:hover{transform:translateY(-2px);border-color:#f3d7ff;box-shadow:0 9px 32px rgba(9,5,20,.55),0 0 26px rgba(199,146,234,.3)}' +
    '#lisbon-unicorn-door:focus-visible{outline:3px solid #f4c96f;outline-offset:4px}' +
    '#lisbon-unicorn-door .lisbon-unicorn-icon{display:grid;place-items:center;width:30px;height:30px;font-size:1.55rem;filter:drop-shadow(0 2px 5px rgba(0,0,0,.28))}' +
    '#lisbon-unicorn-door .lisbon-unicorn-copy{display:flex;flex-direction:column;gap:3px;white-space:nowrap}' +
    '#lisbon-unicorn-door strong{font-size:.74rem;font-weight:750;letter-spacing:.025em}' +
    '#lisbon-unicorn-door small{font-size:.61rem;font-weight:550;color:#e6d5ef;letter-spacing:.045em}' +
    '#lisbon-unicorn-door[data-stack=devcon]{bottom:max(88px,calc(env(safe-area-inset-bottom,0px) + 74px))}' +
    '@media(max-width:640px){#lisbon-unicorn-door{left:max(12px,env(safe-area-inset-left,0px));bottom:max(12px,env(safe-area-inset-bottom,0px));padding:7px;gap:0}#lisbon-unicorn-door .lisbon-unicorn-copy{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}#lisbon-unicorn-door .lisbon-unicorn-icon{width:30px;height:30px}#lisbon-unicorn-door[data-stack=devcon]{bottom:max(70px,calc(env(safe-area-inset-bottom,0px) + 58px))}#lisbon-unicorn-door[data-immersive]{top:max(74px,calc(env(safe-area-inset-top,0px) + 62px));bottom:auto}}' +
    '@media(max-width:400px){#lisbon-unicorn-door[data-stack=devcon]{bottom:max(134px,calc(env(safe-area-inset-bottom,0px) + 122px))}}' +
    '@media(prefers-reduced-motion:reduce){#lisbon-unicorn-door{transition:none}#lisbon-unicorn-door:hover{transform:none}}';
  document.head.appendChild(style);

  // Preserve the existing Mandala/Devcon pill rather than covering it.
  if (document.getElementById('devcon-float-wrap')) link.setAttribute('data-stack', 'devcon');
  // The two immersive stages have their own bottom control decks on phones.
  if (document.getElementById('experience-ui') || (document.getElementById('stage') && document.getElementById('bottom'))) {
    link.setAttribute('data-immersive', '');
  }
  document.body.appendChild(link);
})();
