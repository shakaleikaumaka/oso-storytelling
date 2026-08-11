/* 🎵⬇ juke-download — a "take the music" download tab that rides the jukebox
 * OSO enhancement for bl-player (the canonical family jukebox already carries
 * play · track-switch · 🦋 sing-along lyrics + chords). This adds the third gift:
 * DOWNLOAD. Every song is a public good — free to keep, CC0, no gate.
 *
 * Lives in the OSO repo, loaded AFTER bl-player.js. It does NOT modify the
 * shared canonical player; it only appends one button + a small popover.
 * Forkable. Track list mirrors bl-player TRACKS (keep in sync on change).
 * canon Aug 11 2026 · "every voice is a node — every song, free to carry home"
 */
(function () {
  // Mirror of bl-player TRACKS (title · chords · mp3). Keep in sync with
  // https://shakaleikaumaka.com/assets/bl-player.js if tracks ever change.
  var TRACKS = [
    { icon: '🦋', title: 'Butterflies and Love', chords: 'G–Em–C–D',
      src: 'https://shaka-anthem-gzdk4epeah-ffieyo32.taur.link/assets/i-open-sourced-my-whole-universe.mp3' },
    { icon: '🌍', title: 'A Planet We Share As One', chords: 'C–G–D–D',
      src: 'https://shaka-anthem-gzdk4epeah-ffieyo32.taur.link/assets/a-planet-we-share-as-one.mp3' },
    { icon: '🎻', title: 'Ginger Game — Matteo Tambussi', chords: 'instrumental',
      src: 'https://shaka-anthem-gzdk4epeah-ffieyo32.taur.link/assets/matteo-tambussi--ginger-game.mp3' },
    { icon: '🎻', title: 'Luogoper — Matteo Tambussi', chords: 'instrumental',
      src: 'https://shaka-anthem-gzdk4epeah-ffieyo32.taur.link/assets/matteo-tambussi--luogoper.mp3' }
  ];

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function build() {
    var mp = document.getElementById('miniplayer');
    if (!mp) return false;
    if (document.getElementById('bldlbtn')) return true; // idempotent

    // the ⬇ button — styled to match trackbtn / lyricsbtn (24px circle)
    var btn = document.createElement('button');
    btn.id = 'bldlbtn';
    btn.title = 'take the music — free download · CC0';
    btn.textContent = '⬇';
    btn.setAttribute('style',
      'width:24px;height:24px;border-radius:50%;border:1px solid #f0b429;' +
      'background:transparent;color:#ffd97a;font-size:.72rem;cursor:pointer;' +
      'flex-shrink:0;line-height:1');
    mp.appendChild(btn);

    // the popover — sits above the pill, styled like the lyrics panel
    var pop = document.createElement('div');
    pop.id = 'bldlpop';
    pop.setAttribute('style',
      'display:none;position:fixed;bottom:68px;right:14px;z-index:99998;' +
      'width:min(320px,86vw);background:linear-gradient(160deg,rgba(23,17,38,.97),rgba(13,10,20,.97));' +
      'border:1px solid rgba(240,180,41,.4);border-radius:16px;padding:16px 18px;' +
      'box-shadow:0 12px 50px rgba(0,0,0,.6);' +
      "font-family:'Avenir Next','Segoe UI',system-ui,sans-serif");

    var rows = TRACKS.map(function (t) {
      return '<a href="' + esc(t.src) + '" download rel="noopener" ' +
        'style="display:flex;align-items:center;gap:10px;text-decoration:none;' +
        'color:#b9a8cf;padding:9px 6px;border-radius:10px;transition:background .2s" ' +
        'onmouseover="this.style.background=\'rgba(240,180,41,.1)\'" ' +
        'onmouseout="this.style.background=\'transparent\'">' +
        '<span style="font-size:1.1rem">' + t.icon + '</span>' +
        '<span style="flex:1;line-height:1.3"><span style="color:#f3ead8;font-size:.9rem">' +
        esc(t.title) + '</span><br><span style="font-size:.72rem;letter-spacing:.06em;color:#2dd4bf">' +
        esc(t.chords) + '</span></span>' +
        '<span style="color:#ffd97a;font-size:.8rem;white-space:nowrap">⬇ mp3</span></a>';
    }).join('');

    pop.innerHTML =
      '<div style="font-size:.72rem;letter-spacing:.22em;text-transform:uppercase;color:#f0b429;margin-bottom:4px">🎵 take the music</div>' +
      '<div style="font-size:.72rem;color:#8a7fa6;margin-bottom:10px">free to keep · CC0 · every song is a public good</div>' +
      rows +
      '<div style="font-size:.7rem;color:#8a7fa6;margin-top:10px;border-top:1px solid rgba(240,180,41,.18);padding-top:9px">🦋 sing along — lyrics &amp; chords live in the jukebox</div>';
    document.body.appendChild(pop);

    function toggle(force) {
      var open = (typeof force === 'boolean') ? force : (pop.style.display !== 'block');
      pop.style.display = open ? 'block' : 'none';
      btn.style.background = open ? 'rgba(240,180,41,.18)' : 'transparent';
    }
    btn.addEventListener('click', function (e) { e.stopPropagation(); toggle(); });
    document.addEventListener('click', function (e) {
      if (pop.style.display === 'block' && !pop.contains(e.target) && e.target !== btn) toggle(false);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') toggle(false); });
    return true;
  }

  // bl-player appends #miniplayer synchronously, but retry a few times just in case.
  if (!build()) {
    var tries = 0;
    var iv = setInterval(function () {
      if (build() || ++tries > 40) clearInterval(iv);
    }, 150);
  }
})();
