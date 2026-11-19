/* 🐦‍⬛ KAAAK!!! — the living raven. GPL-3.0 · Open Source Orchestra.
   Canon (Shaka, 19 Nov 2026): wherever KAAAK appears, the raven is ANIMATED;
   click it and it says: KAAAK! I'M KAAAK — Kick Ass Agent Assistant Kit —
   Shaka's crow assistant since he first started building agents.

   Wear it:  <script src="/assets/kaaak.js" async></script>
   then mark any element:  <span data-kaaak>🐦‍⬛</span>   (or leave it empty — the raven moves in)
   optional corner raven:  <script src="/assets/kaaak.js" data-kaaak-corner async></script>
   per element:            data-kaaak-mute = no caw · prefers-reduced-motion = the raven rests.
*/
(() => {
  const CALL = {
    cry: 'KAAAK!!!',
    who: "I'M KAAAK — KICK ASS AGENT ASSISTANT KIT",
    lore: "Shaka's crow assistant since he first started building agents. 🐦‍⬛",
  };
  const css = `
  .kaaak-perch{display:inline-flex;align-items:center;cursor:pointer;border:0;background:none;padding:0;font:inherit;color:inherit;-webkit-tap-highlight-color:transparent}
  .kaaak-perch:focus-visible{outline:3px solid #f0c464;outline-offset:3px;border-radius:8px}
  .kaaak-bird{display:inline-block;transform-origin:50% 90%;line-height:1}
  @media (prefers-reduced-motion: no-preference){
    .kaaak-bird{animation:kaaak-hop 3.4s ease-in-out infinite,kaaak-tilt 9s ease-in-out infinite}
    .kaaak-perch:hover .kaaak-bird,.kaaak-perch:focus-visible .kaaak-bird{animation:kaaak-flutter .5s ease-in-out 2,kaaak-hop 3.4s ease-in-out infinite}
  }
  @keyframes kaaak-hop{0%,86%,100%{transform:translateY(0) scale(1)}90%{transform:translateY(-.18em) scale(1.06)}95%{transform:translateY(0) scale(.98)}}
  @keyframes kaaak-tilt{0%,70%,100%{rotate:0deg}78%{rotate:-9deg}88%{rotate:6deg}}
  @keyframes kaaak-flutter{0%,100%{transform:scaleX(1)}40%{transform:scaleX(1.16) translateY(-.1em) rotate(-6deg)}70%{transform:scaleX(.94)}}
  .kaaak-call{position:fixed;z-index:2147483000;max-width:272px;background:#fff;color:#14100a;border:2.5px solid #14100a;border-radius:16px;
    box-shadow:6px 6px 0 rgba(0,0,0,.55);padding:.7rem .9rem;font:800 .95rem/1.35 'Trebuchet MS','Segoe UI',system-ui,sans-serif}
  .kaaak-call .cry{font-size:1.35rem;letter-spacing:.06em;display:block}
  .kaaak-call .who{display:block;margin:.25rem 0;font-size:.82rem;letter-spacing:.05em}
  .kaaak-call .lore{display:block;font-weight:600;font-size:.78rem;color:#4a3b18}
  .kaaak-call::after{content:"";position:absolute;left:var(--tx,24px);width:20px;height:20px;background:#fff;
    border-right:2.5px solid #14100a;border-bottom:2.5px solid #14100a;border-bottom-right-radius:5px}
  .kaaak-call.down::after{top:-12px;transform:rotate(225deg) skew(12deg,12deg)}
  .kaaak-call.up::after{bottom:-12px;transform:rotate(45deg) skew(12deg,12deg)}
  .kaaak-corner{position:fixed;right:14px;bottom:14px;z-index:2147482999;font-size:2rem;filter:drop-shadow(0 3px 6px rgba(0,0,0,.5))}
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  let openCall = null, closeTimer = 0;

  function caw() { /* a tiny synthesized "ka-kaaak" — only ever on click (user gesture) */
    try {
      const ctx = caw.ctx || (caw.ctx = new (window.AudioContext || window.webkitAudioContext)());
      const t0 = ctx.currentTime;
      [0, 0.16].forEach((dt) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(640 - dt * 500, t0 + dt);
        o.frequency.exponentialRampToValueAtTime(210, t0 + dt + 0.12);
        g.gain.setValueAtTime(0.0001, t0 + dt);
        g.gain.exponentialRampToValueAtTime(0.05, t0 + dt + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.14);
        o.connect(g).connect(ctx.destination);
        o.start(t0 + dt); o.stop(t0 + dt + 0.15);
      });
    } catch (e) { /* a silent crow is still a crow */ }
  }

  function closeCall() {
    if (openCall) { openCall.remove(); openCall = null; }
    clearTimeout(closeTimer);
    removeEventListener('keydown', onEsc, true);
    removeEventListener('pointerdown', outside, { capture: true });
  }
  function onEsc(e) { if (e.key === 'Escape') closeCall(); }
  function outside(e) {
    if (openCall && !openCall.contains(e.target) && !e.target.closest('.kaaak-perch')) closeCall();
  }

  function call(perch, muted) {
    if (openCall && openCall._perch === perch) { closeCall(); return; }
    closeCall();
    if (!muted) caw();
    const b = document.createElement('div');
    b.className = 'kaaak-call';
    b.setAttribute('role', 'status');
    b._perch = perch;
    const cry = document.createElement('span'); cry.className = 'cry'; cry.textContent = CALL.cry;
    const who = document.createElement('span'); who.className = 'who'; who.textContent = CALL.who;
    const lore = document.createElement('span'); lore.className = 'lore'; lore.textContent = CALL.lore;
    b.append(cry, who, lore);
    document.body.appendChild(b);
    // place next to the raven, below if it fits, else above
    const r = perch.getBoundingClientRect(), bw = b.offsetWidth, bh = b.offsetHeight;
    const x = Math.min(Math.max(8, r.left + r.width / 2 - bw / 2), innerWidth - bw - 8);
    let below = r.bottom + 14 + bh < innerHeight - 8;
    let y = below ? r.bottom + 14 : r.top - bh - 14;
    if (y < 8) { y = 8; below = true; }
    b.style.left = x + 'px';
    b.style.top = y + 'px';
    b.classList.add(below ? 'down' : 'up');
    b.style.setProperty('--tx', Math.max(14, Math.min(bw - 34, r.left + r.width / 2 - x - 10)) + 'px');
    openCall = b;
    addEventListener('keydown', onEsc, true);
    setTimeout(() => addEventListener('pointerdown', outside, { capture: true }), 0);
    closeTimer = setTimeout(closeCall, 8000);
  }

  function perch(el) {
    if (el.dataset.kaaakReady) return;
    el.dataset.kaaakReady = '1';
    if (!/🐦/.test(el.textContent)) el.textContent = '🐦‍⬛' + el.textContent;
    el.innerHTML = el.innerHTML.replace('🐦‍⬛', '<span class="kaaak-bird" aria-hidden="true">🐦‍⬛</span>');
    el.classList.add('kaaak-perch');
    el.setAttribute('role', 'button');
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', 'KAAAK the crow — click to meet KAAAK (Kick Ass Agent Assistant Kit)');
    const go = (e) => { e.preventDefault(); e.stopPropagation(); call(el, el.hasAttribute('data-kaaak-mute')); };
    el.addEventListener('click', go);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') go(e); });
  }

  function init() {
    document.querySelectorAll('[data-kaaak]').forEach(perch);
    const me = document.currentScript || [...document.scripts].find((s) => (s.src || '').includes('kaaak.js'));
    if ((me && me.hasAttribute('data-kaaak-corner')) || document.body.hasAttribute('data-kaaak-corner')) {
      const c = document.createElement('span');
      c.className = 'kaaak-corner';
      c.setAttribute('data-kaaak', '');
      document.body.appendChild(c);
      perch(c);
    }
  }
  window.KAAAK = { call: (el) => call(el, false), perch };
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', init); else init();
})();
