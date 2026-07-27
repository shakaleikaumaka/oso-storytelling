/* devcon-float.js v3 — golden Devcon 8 ticket CTA + the Definition Button (📖 Words We Play By).
   Floats bottom-LEFT, opposite the jukebox.
   Shaka's canon (Jul 27, 2026): "float opposite of the juke box at all times with the CTA to buy your Devcon Tickets!"
   v2 mobile canon (Shaka, Jul 27 2026): shrink to sit side-by-side with the jukebox on phones;
   on very narrow screens (≤400px) stack — ticket floats ABOVE the jukebox bar. Desktop unchanged.
   v3 (Jul 27 2026): the Definition Button — a small 📖 tab riding the ticket pill, like the lyric
   button on the jukebox. Opens "Words We Play By 📖" — every word on the page, translated with aloha.
   Born from Alaska's feedback: for every human, not just Web3. 16 definitions, approved copy verbatim.
   Live-pages only — NEVER commit this include to repos (same protocol as the music trail). */
(function () {
  if (document.getElementById('devcon-float-cta')) return;
  var css = document.createElement('style');
  css.textContent = '#devcon-float-wrap{position:fixed;left:20px;bottom:20px;z-index:999998}'
  + '#devcon-float-cta{position:relative;display:flex;flex-direction:column;align-items:center;gap:1px;padding:10px 20px;border-radius:999px;background:linear-gradient(135deg,#f5b942,#ffcf5c 55%,#e09c1f);color:#1a1206;text-decoration:none;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;box-shadow:0 6px 24px rgba(245,185,66,.45),0 2px 6px rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.35);line-height:1.15;animation:devconFloatPulse 3.2s ease-in-out infinite;transition:transform .2s ease}'
  + '#devcon-float-cta strong{font-size:.95rem;font-weight:800;letter-spacing:.02em;white-space:nowrap}'
  + '#devcon-float-cta span{font-size:.68rem;font-weight:600;opacity:.75;letter-spacing:.05em;white-space:nowrap}'
  + '#devcon-float-cta:hover{transform:translateY(-2px) scale(1.03)}'
  + '@keyframes devconFloatPulse{0%,100%{box-shadow:0 6px 24px rgba(245,185,66,.45),0 2px 6px rgba(0,0,0,.4)}50%{box-shadow:0 6px 36px rgba(245,185,66,.8),0 2px 8px rgba(0,0,0,.45)}}'
  + '#devcon-defs-tab{position:absolute;top:-13px;right:-7px;width:30px;height:30px;border-radius:999px;background:linear-gradient(135deg,#3d1c42,#2a1740);border:1px solid #f0c464;color:#f0c464;font-size:.92rem;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;box-shadow:0 3px 10px rgba(0,0,0,.5);transition:transform .2s ease}'
  + '#devcon-defs-tab:hover{transform:scale(1.12)}'
  + '#devcon-defs-tab:focus-visible{outline:2px solid #f0c464;outline-offset:2px}'
  + '#devcon-defs-panel{display:none;position:fixed;left:20px;bottom:88px;z-index:999999;width:min(360px,calc(100vw - 40px));max-height:min(62vh,560px);overflow-y:auto;background:linear-gradient(165deg,rgba(42,23,64,.97),rgba(11,6,18,.98));border:1px solid rgba(240,196,100,.45);border-radius:18px;padding:20px 22px 16px;box-shadow:0 16px 60px rgba(0,0,0,.65);font-family:system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-overflow-scrolling:touch}'
  + '#devcon-defs-panel::-webkit-scrollbar{width:8px}'
  + '#devcon-defs-panel::-webkit-scrollbar-thumb{background:rgba(240,196,100,.3);border-radius:8px}'
  + '#devcon-defs-panel h2{margin:0;font-family:"Iowan Old Style","Palatino Linotype",Palatino,"Book Antiqua",Georgia,serif;font-size:1.06rem;font-weight:700;color:#f0c464;letter-spacing:.02em;padding-right:28px}'
  + '#devcon-defs-panel .devcon-defs-sub{margin:5px 0 4px;font-size:.74rem;font-style:italic;color:rgba(247,236,217,.6);line-height:1.45;padding-right:28px}'
  + '#devcon-defs-close{position:absolute;top:10px;right:12px;width:26px;height:26px;border-radius:999px;background:transparent;border:1px solid rgba(240,196,100,.5);color:#f0c464;font-size:.8rem;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}'
  + '#devcon-defs-close:hover{background:rgba(240,196,100,.15)}'
  + '#devcon-defs-panel dl{margin:0}'
  + '#devcon-defs-panel dt{margin-top:15px;font-family:"Iowan Old Style","Palatino Linotype",Palatino,"Book Antiqua",Georgia,serif;font-size:.93rem;font-weight:700;color:#f0c464}'
  + '#devcon-defs-panel dt:first-of-type{margin-top:10px}'
  + '#devcon-defs-panel dd{margin:4px 0 0;font-size:.84rem;line-height:1.55;color:rgba(247,236,217,.85)}'
  + '@media(max-width:600px){#devcon-float-wrap{left:12px;bottom:12px}#devcon-float-cta{padding:7px 12px;gap:0}#devcon-float-cta strong{font-size:.72rem}#devcon-float-cta span{font-size:.56rem}#devcon-defs-tab{width:26px;height:26px;top:-11px;right:-6px;font-size:.8rem}#devcon-defs-panel{left:12px;bottom:66px;width:min(340px,calc(100vw - 24px));max-height:56vh;padding:16px 18px 12px}}'
  + '@media(max-width:400px){#devcon-float-wrap{bottom:76px}#devcon-defs-panel{bottom:128px}}';
  document.head.appendChild(css);

  var DEFS = [
    ["Decentralization", "no single owner, no off-switch held by one hand. Like a jam circle: the music lives between everyone, not in any one player."],
    ["Censorship Resistance", "nobody can mute the song. Once a melody belongs to everyone, no authority can take it back."],
    ["Node", "one voice in the network. Every singer is a node; the song is what happens when nodes listen to each other."],
    ["Open Source", "the sheet music is public. Read it, copy it, improve it, share it — the tune gets better every time someone new picks it up."],
    ["Permissionless", "no audition, no gatekeeper, no guest list. If you feel the pull, you already have a seat."],
    ["Protocol", "a set of shared agreements that lets strangers play in tune. Humanity's oldest protocol? Gathering in a circle to make rhythm together."],
    ["Fork", "take the whole song and sing it your own way, somewhere new. Forking isn't stealing — it's how open music travels."],
    ["Consensus", "how a circle stays in time without a conductor: everyone listening, everyone adjusting. Sounds of consensus."],
    ["Ethereum", "a world computer no one owns, kept honest by thousands of computers at once. The orchestra borrows its values; you don't need to touch crypto to play."],
    ["Web3", "the idea that the internet's next verse should be owned by the people who sing in it, not the platforms that host them."],
    ["Steward", "a gardener of the space. Stewards steer and tend, but never own, never gatekeep."],
    ["Sanctuary Tech", "technology arranged for belonging: our circular stage has no 'front,' so the music faces itself and everyone is inside the song."],
    ["DIP", "Devcon Improvement Proposal: the community's way of saying 'here's something beautiful we should do' — ours is DIP #8576, the Music Space."],
    ["CC0", "the most open license there is: no rights reserved. This whole site, the songs, the rider — copy them freely, fork us like crazy. 🍴"],
    ["Pluralistic Privacy", "privacy is power when private individuals choose to play together in public. You own your sound; you share it on your terms."],
    ["Self-owned", "your voice, your instrument, your recording — yours. The orchestra never takes custody of anyone's music."]
  ];

  var wrap = document.createElement('div');
  wrap.id = 'devcon-float-wrap';

  var a = document.createElement('a');
  a.id = 'devcon-float-cta';
  a.href = 'https://devcon.org/en/tickets/';
  a.target = '_blank';
  a.rel = 'noopener';
  a.setAttribute('aria-label', 'Get your Devcon 8 Mumbai tickets — November 3–6, 2026');
  a.innerHTML = '<strong>🎟️ Get Devcon 8 Tickets</strong><span>Mumbai · Nov 3–6, 2026</span>';

  var tab = document.createElement('button');
  tab.id = 'devcon-defs-tab';
  tab.type = 'button';
  tab.textContent = '📖';
  tab.title = 'Words We Play By — every word on this page, translated with aloha';
  tab.setAttribute('aria-label', 'Open Words We Play By — a friendly glossary of every word on this page');
  tab.setAttribute('aria-expanded', 'false');
  tab.setAttribute('aria-controls', 'devcon-defs-panel');

  var panel = document.createElement('aside');
  panel.id = 'devcon-defs-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Words We Play By — glossary');

  var html = '<h2>Words We Play By 📖</h2>'
    + '<p class="devcon-defs-sub">every word on this page, translated with aloha</p>'
    + '<button id="devcon-defs-close" type="button" aria-label="Close glossary">✕</button>'
    + '<dl>';
  for (var i = 0; i < DEFS.length; i++) {
    html += '<dt>' + DEFS[i][0] + '</dt><dd>' + DEFS[i][1] + '</dd>';
  }
  html += '</dl>';
  panel.innerHTML = html;

  var closeBtn = panel.querySelector('#devcon-defs-close');
  function openPanel() {
    panel.style.display = 'block';
    tab.setAttribute('aria-expanded', 'true');
    closeBtn.focus();
  }
  function closePanel() {
    panel.style.display = 'none';
    tab.setAttribute('aria-expanded', 'false');
    tab.focus();
  }
  tab.addEventListener('click', function () {
    if (panel.style.display === 'block') { closePanel(); } else { openPanel(); }
  });
  closeBtn.addEventListener('click', closePanel);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && panel.style.display === 'block') closePanel();
  });

  wrap.appendChild(a);
  wrap.appendChild(tab);
  document.body.appendChild(wrap);
  document.body.appendChild(panel);
})();
