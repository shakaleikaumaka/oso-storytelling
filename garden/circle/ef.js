/* ── THE EF SEATS · "see the EF committee" · CC0 · by the ʻohana, Shaka's AI family ─────────────────────────
   The Ethereum Foundation's own musicians, in the circle. Big gold button → a ring of seats + the Nov 6
   2–4pm afternoon ("The EF Presents") + who plays around it.
   CONSENT-FIRST: data/ef.json shows a NAME only for 'listed' seats; 'held' seats are a glowing lock. ?ef=1 opens it.
   init({ ARTISTS, BY, esc, pick }) from app.js
   ----------------------------------------------------------------------------------------------------- */
export async function initEF(ctx) {
  const { ARTISTS, esc, pick } = ctx;
  let D = null;
  try { D = await (await fetch('./data/ef.json', { cache: 'no-cache' })).json(); } catch (e) { console.warn('ef seats unavailable', e); return; }
  const seats = D.seats || [];
  const listed = seats.filter((s) => s.status === 'listed'), held = seats.filter((s) => s.status === 'held');

  const fab = document.createElement('button');
  fab.id = 'ef-fab'; fab.type = 'button'; fab.setAttribute('aria-label', 'The EF Presents — the Ethereum Foundation in the circle');
  fab.innerHTML = '<span class="xi">Ξ</span><span>The EF Presents<small>Nov 6 · 2–4pm · the foundation’s own artists</small></span>';
  document.body.appendChild(fab);

  const box = document.createElement('div');
  box.id = 'ef'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'The Ethereum Foundation seats');
  const n = seats.length, R = 112, CX = 160, CY = 150;
  // photo support: only a 'listed' seat may carry s.photo (consent-first). Missing/broken image → falls back to the Ξ glyph.
  const photoOf = (s) => (s.status === 'listed' && s.photo && /^(\.\/|\/)?img\/ef\/[\w.-]+\.(jpe?g|png|webp)$/i.test(s.photo)) ? s.photo : '';
  const defs = [];
  const ring = seats.map((s, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2, x = CX + Math.cos(a) * R, y = CY + Math.sin(a) * R;
    const ph = photoOf(s), r = s.status === 'listed' ? (ph ? 20 : 15) : 13;
    const lab = s.status === 'listed' ? `<text class="n" x="${x}" y="${y + (y > CY ? r + 12 : -(r + 2))}">${esc(s.name)}</text>` : '';
    const glyph = s.status === 'listed' ? 'Ξ' : s.status === 'held' ? '🔒' : '＋';
    let img = '';
    if (ph) {
      defs.push(`<clipPath id="efc-${esc(s.id)}"><circle cx="${x}" cy="${y}" r="${r - 1.5}"/></clipPath>`);
      img = `<image class="ph" href="${esc(ph)}" x="${x - r}" y="${y - r}" width="${r * 2}" height="${r * 2}" preserveAspectRatio="xMidYMid slice" clip-path="url(#efc-${esc(s.id)})" onerror="this.remove()"/><circle class="pr" cx="${x}" cy="${y}" r="${r - 1.5}"/>`;
    }
    return `<g class="seat ${s.status}"><circle class="d" cx="${x}" cy="${y}" r="${r}"/><text class="g" x="${x}" y="${y + 4}">${glyph}</text>${img}${lab}</g>`;
  }).join('');
  const day = D.block.day;
  const around = ARTISTS.filter((a) => a.kind === 'placed' && +a.day === +day).sort((p, q) => tm(p.time) - tm(q.time));
  function tm(t) { const m = /(\d+):(\d+)([ap])/.exec(t || ''); if (!m) return 0; let h = +m[1] % 12; if (m[3] === 'p') h += 12; return h * 60 + +m[2]; }
  const mail = ['aloha', 'myagentohana.com'].join('@');
  box.innerHTML = `<div class="card"><button class="x" aria-label="close" id="ef-x">✕</button>
    <div class="hd"><div class="kick">Ξ the Ethereum Foundation · in the circle</div>
      <h2>${esc(D.block.title)}</h2>
      <p>${esc(D.block.line)}</p></div>
    <div class="body">
      <div class="col">
        <svg class="ring" viewBox="0 0 320 300" role="img" aria-label="a circle of ${n} seats: ${listed.length} open with a name, ${held.length} held, the rest open to any EF musician">
          <defs>${defs.join('')}</defs><circle class="floor" cx="${CX}" cy="${CY}" r="${R}"/><circle class="floor" cx="${CX}" cy="${CY}" r="${R - 34}" style="fill:none;stroke-dasharray:2 6"/>
          <text class="mid" x="${CX}" y="${CY + 10}">Ξ</text>${ring}</svg>
        <div class="legend"><span><i class="l"></i>${listed.length} named</span><span><i class="h"></i>${held.length} held · waiting for a yes</span><span><i class="o"></i>${seats.length - listed.length - held.length} open</span></div>
        <h3>Who is in the EF circle</h3>
        <div class="names">${listed.map((s) => `<button type="button" disabled style="cursor:default">${photoOf(s) ? `<img class="av" src="${esc(photoOf(s))}" alt="" width="30" height="30" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'tm',textContent:'Ξ'}))">` : '<span class="tm">Ξ</span>'}<span><span class="nm">${esc(s.name)}</span><small>${esc(s.role || '')}${s.note ? ' · ' + esc(s.note) : ''}</small></span></button>`).join('')}
          ${held.length ? `<button type="button" disabled style="cursor:default;opacity:.8"><span class="tm">🔒 ${held.length}</span><span><span class="nm">seats held for EF musicians</span><small>each name appears the moment they say yes — never before</small></span></button>` : ''}</div>
        <div class="cta"><a class="p" href="mailto:${mail}?subject=${encodeURIComponent('EF seat in the circle')}&body=${encodeURIComponent('Aloha — I work at the Ethereum Foundation and I play. I would like a seat in the EF circle at Devcon 8.\n\nName:\nWhat I play:\nOK to list my name publicly? (yes/no):')}">I work at the EF &amp; I play → take a seat</a></div>
      </div>
      <div class="col">
        <h3>Featured · ${esc(D.block.date)}</h3>
        <div class="slotbox"><div class="w">${esc(D.block.from)} – ${esc(D.block.to)} · Music Stage</div><div class="t">${esc(D.block.title)}</div>
          <p>Hosted with the Devcon team. The EF's own artists — who know exactly how loud a room full of builders wants to be — hold the whole afternoon. At 4:00p the floor goes to the Devcon team’s closing party — after DJ Amogh’s sound check.</p></div>
        <h3>How the two hours move</h3>
        <ul class="ideas">${(D.ideas || []).map((i) => `<li><span class="ico">${i.ico}</span><span><b>${esc(i.t)}.</b> ${esc(i.d)}</span></li>`).join('')}</ul>
        <h3>Around it · who plays on Nov ${day}</h3>
        <div class="names">${around.map((a) => `<button type="button" data-slug="${esc(a.slug)}"><span class="tm">${esc(a.time || '')}</span><span><span class="nm">${esc(a.name)}</span><small>${esc((a.tagline || '').slice(0, 74))}</small></span></button>`).join('')}
          <button type="button" disabled style="cursor:default;border-color:rgba(255,217,122,.5)"><span class="tm">2:00p</span><span><span class="nm">Ξ the EF afternoon</span><small>the whole two hours · see left</small></span></button>
          <button type="button" disabled style="cursor:default"><span class="tm">4:00p</span><span><span class="nm">🎉 Closing party · Devcon team</span><small>feat. DJ Amogh · Bollywood closing set</small></span></button></div>
        <div class="cta"><a href="/schedule/">the full schedule →</a></div>
      </div>
      <div class="fine"><b>Built on the Devcon Music Space sheet the EF shares with us</b> — friends first, protocol second. A name shows here only when that person has said yes; if you'd rather not be on this page, tell any steward or write to <a href="mailto:${mail}" style="color:var(--gold-bright)">${mail.replace('@', '&#64;')}</a> and we take it down first, ask questions second. 🌺</div>
    </div></div>`;
  document.body.appendChild(box);

  const open = () => { box.classList.add('open'); document.body.classList.add('efopen'); };
  const close = () => { box.classList.remove('open'); document.body.classList.remove('efopen'); };
  fab.addEventListener('click', open);
  box.addEventListener('click', (e) => {
    if (e.target === box || e.target.id === 'ef-x') return close();
    const b = e.target.closest('button[data-slug]'); if (b) { close(); pick(b.dataset.slug); }
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && box.classList.contains('open')) close(); });
  let want = new URLSearchParams(location.search).has('ef'); try { if (sessionStorage.getItem('oso-ef-open')) { want = true; sessionStorage.removeItem('oso-ef-open'); } } catch (e) {}
  if (want) {   // /garden/circle/EF/ lands here: wait for the intro 'Enter the circle', then open the EF seats
    const ent = document.getElementById('enter');
    if (ent && ent.offsetParent !== null) ent.addEventListener('click', () => setTimeout(open, 650), { once: true });
    else setTimeout(open, 600);
  }
  window.__efSeats = { open, close };
}
