// OSO Web3 Songbook — Markdown songbook editor overlay (spec §23–§24).
//
// One overlay serves fans and the artist; controls the wallet cannot execute
// are simply not shown (the CONTRACT is the security layer — this is UX only).
// All dynamic values reach the DOM via textContent; the only innerHTML sink is
// the output of renderMarkdown, which is safe by construction (escape-first).

import {
  artistIdFromSlug, contentItemId, hashText,
  canonicalOf, strongestPendingOf, reputationOf, formatPhiWeight,
  submitContribution, artistPublish, approveContribution, rejectContribution,
  explainError,
} from '../web3/contract.js';
import { storeContent, retrieveVerified, utf8Bytes } from '../storage/adapters.js';
import { renderMarkdown } from './markdown.js';
import { chordProToMarkdown, markdownToChordPro } from './chordpro.js';
import { displayName, shortAddress } from '../web3/ens.js';
import { walletState } from '../web3/wallet.js';

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

/// Open the songbook editor for one content item.
/// cfg: { artistSlug, itemKey, itemLabel, seedText, role: {isArtist, fanRank}, onChainChange }
export async function openEditor(cfg) {
  const artistId = artistIdFromSlug(cfg.artistSlug);
  const itemId = contentItemId(cfg.itemKey);
  const { role } = cfg;

  const overlay = el('div', 'sb-overlay');
  const modal = el('div', 'sb-modal');
  overlay.appendChild(modal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  // header
  const head = el('div', 'sb-head');
  head.appendChild(el('h3', null, '📖 ' + cfg.itemLabel));
  const roleTag = el('span', 'sb-badge ' + (role.isArtist ? 'ok' : role.fanRank ? 'pending' : 'ai'),
    role.isArtist ? 'artist 🌺' : role.fanRank ? `fan rank #${role.fanRank}` : 'visitor');
  head.appendChild(roleTag);
  const closeBtn = el('button', 'sb-close', '✕');
  closeBtn.addEventListener('click', () => overlay.remove());
  head.appendChild(closeBtn);
  modal.appendChild(head);

  const body = el('div', 'sb-body');
  modal.appendChild(body);

  // provenance panel
  const prov = el('div', 'sb-prov', 'Loading on-chain provenance…');
  body.appendChild(prov);

  // tabs + editor
  const tabs = el('div', 'sb-tabs');
  const tabRaw = el('button', 'sb-tab active', 'Raw Markdown');
  const tabPre = el('button', 'sb-tab', 'Preview');
  tabs.append(tabRaw, tabPre);
  body.appendChild(tabs);

  const raw = el('textarea', 'sb-raw');
  raw.spellcheck = false;
  const preview = el('div', 'sb-preview');
  preview.style.display = 'none';
  body.append(raw, preview);

  tabRaw.addEventListener('click', () => {
    tabRaw.classList.add('active'); tabPre.classList.remove('active');
    raw.style.display = ''; preview.style.display = 'none';
  });
  tabPre.addEventListener('click', () => {
    tabPre.classList.add('active'); tabRaw.classList.remove('active');
    preview.innerHTML = renderMarkdown(raw.value); // safe: escape-first renderer
    raw.style.display = 'none'; preview.style.display = '';
  });

  const errBox = el('div', 'sb-error', '');
  const note = el('div', 'sb-note', '');

  // actions
  const actions = el('div', 'sb-actions');
  const canEdit = role.isArtist || role.fanRank > 0;

  if (canEdit) {
    const btnPropose = el('button', 'sb-btn primary', role.isArtist ? '💾 save as proposal' : '💾 save proposal');
    btnPropose.addEventListener('click', () => write(false, btnPropose));
    actions.appendChild(btnPropose);
    if (role.isArtist) {
      const btnPublish = el('button', 'sb-btn primary', '🌺 artist publish (canonical)');
      btnPublish.addEventListener('click', () => write(true, btnPublish));
      actions.appendChild(btnPublish);
    }
  } else {
    note.textContent = 'This wallet holds no editor seat for this artist — browsing only. Ask the artist for a superfan rank to propose corrections.';
  }

  // ChordPro interop (Orchestrator catalog exchange)
  const btnImport = el('button', 'sb-btn ghost', '⇄ import ChordPro');
  btnImport.addEventListener('click', () => {
    const pro = prompt('Paste a ChordPro (.pro) document — e.g. from the Open Source Orchestrator catalog:');
    if (pro) raw.value = chordProToMarkdown(pro);
  });
  const btnExport = el('button', 'sb-btn ghost', '⬇ export ChordPro');
  btnExport.addEventListener('click', () => {
    const blob = new Blob([markdownToChordPro(raw.value)], { type: 'text/plain' });
    const a = el('a');
    a.href = URL.createObjectURL(blob);
    a.download = cfg.itemKey.replace(/[^a-z0-9-]+/gi, '-') + '.pro';
    a.click();
    URL.revokeObjectURL(a.href);
  });
  actions.append(btnImport, btnExport);
  body.append(actions, errBox, note);

  document.body.appendChild(overlay);

  // ---- load current canonical + pending state ----
  let parentId = 0;
  async function refresh() {
    errBox.textContent = '';
    prov.textContent = 'Loading on-chain provenance…';
    try {
      const canonical = await canonicalOf(artistId, itemId);
      const pending = await strongestPendingOf(artistId, itemId);
      prov.textContent = '';

      if (canonical) {
        parentId = canonical.id;
        const c = canonical.contribution;
        const line = el('div');
        line.appendChild(el('span', 'sb-badge ' + (canonical.artistApproved ? 'ok' : 'pending'),
          canonical.artistApproved ? '✓ artist approved' : 'community draft'));
        const who = el('b', null, shortAddress(c.contributor));
        displayName(c.contributor).then((n) => { who.textContent = n; });
        line.append(who, document.createTextNode(
          ` · ${c.roleRank === 0 ? 'artist' : 'fan rank #' + c.roleRank} · phiWeight ${formatPhiWeight(c.phiWeightX36)} · contribution #${c.id}`));
        prov.appendChild(line);
        const hash = el('div', 'hash', 'hash ' + c.contentHash);
        prov.appendChild(hash);
        // §26 verification: retrieve, re-hash, compare
        try {
          const got = await retrieveVerified(c.contentURI, c.contentHash);
          hash.append(' ', Object.assign(el('span', 'sb-badge ' + (got.verified ? 'ok' : 'warn'),
            got.verified ? 'verified ✓' : 'hash mismatch ⚠'), {}));
          if (!raw.value) raw.value = got.text;
        } catch (e) {
          hash.append(' ', el('span', 'sb-badge warn', 'content unreachable'));
          if (!raw.value) raw.value = cfg.seedText || '';
        }
      } else {
        prov.appendChild(el('span', 'sb-badge ai', 'AI-generated / legacy draft · not yet artist approved'));
        prov.appendChild(el('div', null, 'No on-chain version yet — editing starts from the legacy seed content (§27).'));
        if (!raw.value) raw.value = cfg.seedText || '';
      }

      if (pending && (!canonical || pending.id !== canonical.id)) {
        const p = el('div');
        p.style.marginTop = '8px';
        p.appendChild(el('span', 'sb-badge pending', 'pending proposal #' + pending.id));
        const who = el('b', null, shortAddress(pending.contributor));
        displayName(pending.contributor).then((n) => { who.textContent = n; });
        p.append(who, document.createTextNode(
          ` · ${pending.roleRank === 0 ? 'artist' : 'fan rank #' + pending.roleRank} · phiWeight ${formatPhiWeight(pending.phiWeightX36)}`));
        if (role.isArtist) {
          const ok = el('button', 'sb-btn', '✓ approve');
          ok.addEventListener('click', async () => {
            ok.disabled = true;
            try { await approveContribution(artistId, pending.id); raw.value = ''; await refresh(); cfg.onChainChange?.(); }
            catch (e) { errBox.textContent = explainError(e); ok.disabled = false; }
          });
          const no = el('button', 'sb-btn danger', '✕ reject');
          no.addEventListener('click', async () => {
            no.disabled = true;
            try { await rejectContribution(artistId, pending.id); await refresh(); cfg.onChainChange?.(); }
            catch (e) { errBox.textContent = explainError(e); no.disabled = false; }
          });
          const view = el('button', 'sb-btn ghost', '👁 load into editor');
          view.addEventListener('click', async () => {
            try { const got = await retrieveVerified(pending.contentURI, pending.contentHash); raw.value = got.text; tabRaw.click(); }
            catch (e) { errBox.textContent = explainError(e); }
          });
          p.append(' ', ok, ' ', no, ' ', view);
        }
        prov.appendChild(p);
      }

      // reputation of the connected wallet on this artist page
      const me = walletState().address;
      if (me && canEdit) {
        const rep = await reputationOf(artistId, me);
        note.textContent = `Signed in as ${shortAddress(me)} — ${rep} artist-approved contribution${rep === 1 ? '' : 's'} on this page.`;
        displayName(me).then((n) => {
          note.textContent = `Signed in as ${n} — ${rep} artist-approved contribution${rep === 1 ? '' : 's'} on this page.`;
        });
      }
    } catch (e) {
      prov.textContent = 'Could not load on-chain state: ' + explainError(e);
    }
  }

  // ---- write path: store bytes → hash → chain tx ----
  async function write(direct, btn) {
    errBox.textContent = '';
    const text = raw.value;
    if (!text.trim()) { errBox.textContent = 'The document is empty.'; return; }
    btn.disabled = true;
    const old = btn.textContent;
    try {
      btn.textContent = '⬆ storing content…';
      const bytes = utf8Bytes(text);
      const { uri, hash } = await storeContent(bytes);
      if (hash !== hashText(text)) throw new Error('Internal hash sanity check failed'); // never expected
      btn.textContent = '✍ waiting for wallet…';
      if (direct) await artistPublish(artistId, itemId, hash, uri, parentId);
      else await submitContribution(artistId, itemId, hash, uri, parentId);
      btn.textContent = '✓ on chain';
      await refresh();
      cfg.onChainChange?.();
      setTimeout(() => { btn.textContent = old; btn.disabled = false; }, 1200);
    } catch (e) {
      errBox.textContent = explainError(e);
      btn.textContent = old;
      btn.disabled = false;
    }
  }

  await refresh();
  return overlay;
}
