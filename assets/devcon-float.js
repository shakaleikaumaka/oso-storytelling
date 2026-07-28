/* devcon-float.js v4 — golden Devcon 8 ticket CTA + the Definition Button (📖 Words We Play By).
   Floats bottom-LEFT, opposite the jukebox.
   Shaka's canon (Jul 27, 2026): "float opposite of the juke box at all times with the CTA to buy your Devcon Tickets!"
   v2 mobile canon (Shaka, Jul 27 2026): shrink to sit side-by-side with the jukebox on phones;
   on very narrow screens (≤400px) stack — ticket floats ABOVE the jukebox bar. Desktop unchanged.
   v3 (Jul 27 2026): the Definition Button — a small 📖 tab riding the ticket pill, like the lyric
   button on the jukebox. Opens "Words We Play By 📖" — every word on the page, translated with aloha.
   Born from Alaska's feedback: for every human, not just Web3. 16 definitions, approved copy verbatim.
   v4 (Jul 28 2026, Shaka): EXPANSIVE vocabulary — 16 new terms the world should better understand,
   so every page the ticket bubble rides becomes a friendly teacher of Web3 & decentralization.
   Two shelves now: "words on this page" (the approved 16, verbatim) + "words the world should know 🌍".
   Canon update (Option A, Jul 27): vendored per-repo is BLESSED — this file lives in the repos it serves. */
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
  + '#devcon-defs-panel .devcon-defs-shelf{margin:20px 0 0;font-size:.68rem;letter-spacing:.22em;text-transform:uppercase;color:rgba(240,196,100,.75);border-top:1px solid rgba(240,196,100,.25);padding-top:14px}'
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

  /* v4 shelf two — the words the world should know 🌍 (Shaka, Jul 28 2026).
     Written for the curious stranger: every page the ticket bubble rides becomes a teacher. */
  var DEFS_WORLD = [
    ["Wallet", "your pocket for digital belongings — not an account a company lends you, but a home you own. Only you hold the key."],
    ["Private Key & Seed Phrase", "the one true key to your wallet. Whoever holds it, holds everything inside. Write it on paper, guard it like a song you never sing in public — no one honest will ever ask for it."],
    ["Blockchain", "a shared ledger everyone can read and no one can secretly rewrite. The score of everything that ever happened, kept by the whole orchestra at once."],
    ["Smart Contract", "a promise written in code that keeps itself. No middleman needed to honor the agreement — it plays its own notes, exactly as written."],
    ["Gas", "the small toll that pays the network's musicians for carrying your transaction. Busier hall, higher toll."],
    ["Token", "a digital note that can carry value, membership, or meaning. A song can be a token. So can a thank-you."],
    ["NFT", "a token that says this one is one-of-a-kind. A signed vinyl of the internet — its beauty is the proof of the gift, not the price tag."],
    ["ENS", "a name you truly own on Ethereum — a stage name no one can take away. (The orchestra's ancestor, OSO P.I.T., won 'Most Creative Use of ENS' at ETHGlobal Delhi 🏆)"],
    ["DAO", "a band that makes decisions together, in the open, with the rules in code. Power lives in the circle, not in a manager's office."],
    ["Public Good", "something that gets better for everyone the more it's shared — a park, a song, an open archive. The opposite of a walled garden."],
    ["Credible Neutrality", "the stage doesn't pick favorites. The rules treat every player the same — that's what makes strangers brave enough to join the circle."],
    ["Immutability", "once written, never erased. A recording that can't be taken back — so we write with love, and mean what we publish."],
    ["Trustless", "not 'without trust' — beyond needing it. You don't have to trust anyone, because everyone can check. Trust through transparency, not permission."],
    ["Zero-Knowledge Proof (ZK)", "prove something is true without revealing the secret behind it — like proving you know the song without singing a single note. Privacy and honesty, together."],
    ["Layer 2 (L2)", "side stages built on Ethereum: faster, cheaper rooms that still answer to the main hall. More seats, same song."],
    ["Validator", "a node that vouches for the truth and puts skin in the game to back it. Honesty, staked."],
    ["Infinite Garden", "Ethereum's own metaphor for itself: a garden anyone can plant in, tended by all, owned by none, never finished. You are standing in it. 🌱"]
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
    + '<p class="devcon-defs-sub">every word on this page, translated with aloha — and the words the world should know</p>'
    + '<button id="devcon-defs-close" type="button" aria-label="Close glossary">✕</button>'
    + '<dl>';
  for (var i = 0; i < DEFS.length; i++) {
    html += '<dt>' + DEFS[i][0] + '</dt><dd>' + DEFS[i][1] + '</dd>';
  }
  html += '</dl><div class="devcon-defs-shelf">…and the words the world should know 🌍</div><dl>';
  for (var j = 0; j < DEFS_WORLD.length; j++) {
    html += '<dt>' + DEFS_WORLD[j][0] + '</dt><dd>' + DEFS_WORLD[j][1] + '</dd>';
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
