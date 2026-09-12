// OSO Web3 Songbook — node page glue.
//
// The public page renders EXACTLY as before with no wallet (spec §2): this
// module only (1) adds subtle provenance lines where an on-chain canonical
// version already exists, and (2) offers a small connect chip; edit
// affordances (✏️) appear only after a wallet connects and the CONTRACT
// confirms the role (spec §23 — no trust in local config).
//
// Wiring: song cards / bio elements carry data-oso-item / data-oso-label
// attributes; the page calls initNodeWeb3({ artistSlug }).

import { hasWallet, connectWallet, onWalletChange, walletState } from '../web3/wallet.js';
import {
  isConfigured, artistIdFromSlug, contentItemId, roleOf, canonicalOf,
  formatPhiWeight, phiWeightOfRank, reputationOf, assignFan, removeFan,
  transferFanRank, explainError, readContract,
} from '../web3/contract.js';
import { retrieveVerified } from '../storage/adapters.js';
import { renderMarkdown } from './markdown.js';
import { displayName, shortAddress } from '../web3/ens.js';
import { openEditor } from './editor.js';

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

let cssLoaded = false;
function ensureCss() {
  if (cssLoaded) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/songbook/songbook.css';
  document.head.appendChild(link);
  cssLoaded = true;
}

export async function initNodeWeb3(cfg) {
  const artistSlug = cfg.artistSlug;
  const artistId = artistIdFromSlug(artistSlug);
  const items = [...document.querySelectorAll('[data-oso-item]')];

  // Without a configured contract the page stays 100% untouched.
  if (!isConfigured()) return;
  ensureCss();

  let role = { isArtist: false, fanRank: 0 };

  // ---- 1. provenance for everyone (read-only public layer) ----
  for (const node of items) refreshItemProvenance(node);

  async function refreshItemProvenance(node) {
    const key = node.dataset.osoItem;
    node.querySelector(':scope > .sb-provline')?.remove();
    try {
      const canonical = await canonicalOf(artistId, contentItemId(key));
      if (!canonical) return; // legacy seed — leave the static page as-is (§27)
      const c = canonical.contribution;
      const line = el('div', 'sb-provline');
      line.appendChild(el('span', 'sb-badge ' + (canonical.artistApproved ? 'ok' : 'pending'),
        canonical.artistApproved ? '✓ artist approved' : 'community draft'));
      const who = el('b', null, shortAddress(c.contributor));
      displayName(c.contributor).then((n) => { who.textContent = n; });
      line.append(who, document.createTextNode(
        ` · ${c.roleRank === 0 ? 'artist' : 'fan rank #' + c.roleRank} · contribution #${c.id} · hash ${c.contentHash.slice(0, 10)}…`));
      // §26: verify + offer the canonical text inline
      try {
        const got = await retrieveVerified(c.contentURI, c.contentHash);
        line.appendChild(el('span', 'sb-badge ' + (got.verified ? 'ok' : 'warn'),
          got.verified ? 'verified ✓' : 'hash mismatch ⚠'));
        if (got.verified) {
          const det = document.createElement('details');
          det.appendChild(el('summary', null, '📖 read the on-chain canonical version'));
          const body = el('div', 'sb-preview');
          body.innerHTML = renderMarkdown(got.text); // safe: escape-first renderer
          det.appendChild(body);
          line.appendChild(det);
        }
      } catch (_) {
        line.appendChild(el('span', 'sb-badge warn', 'content unreachable'));
      }
      node.appendChild(line);
    } catch (e) {
      console.warn('[oso-songbook] provenance load failed for', key, e);
    }
  }

  // ---- 2. connect chip (footer, unobtrusive) ----
  const bar = el('div', 'sb-connectbar');
  const chip = el('button', 'sb-chip', '🪶 web3 songbook — connect wallet to suggest edits');
  bar.appendChild(chip);
  const status = el('div', 'sb-note', '');
  bar.appendChild(status);
  (document.querySelector(cfg.mountSelector || 'footer .wrap') || document.body).appendChild(bar);

  chip.addEventListener('click', async () => {
    if (!hasWallet()) { status.textContent = 'No Ethereum wallet detected — install MetaMask (or open in a wallet browser) to participate.'; return; }
    try { await connectWallet(); } catch (e) { status.textContent = explainError(e); }
  });

  onWalletChange(applyRole);
  async function applyRole() {
    const { address } = walletState();
    document.querySelectorAll('.sb-editchip, .sb-rolechip').forEach((n) => n.remove());
    if (!address) return;
    try {
      role = await roleOf(artistId, address);
    } catch (e) { status.textContent = explainError(e); return; }

    const name = await displayName(address);
    if (role.isArtist) {
      chip.textContent = `🌺 ${name} — the artist`;
      status.textContent = 'You hold root authority on this page: publish directly, approve or reject proposals, seat superfans.';
      const manage = el('button', 'sb-chip sb-rolechip', '🎚 manage superfans');
      manage.addEventListener('click', () => openFanPanel());
      bar.insertBefore(manage, status);
    } else if (role.fanRank > 0) {
      chip.textContent = `🎸 ${name} — fan rank #${role.fanRank}`;
      const [w, rep] = await Promise.all([phiWeightOfRank(role.fanRank), reputationOf(artistId, address)]);
      status.textContent = `phiWeight ${formatPhiWeight(w)} · ${rep} artist-approved contribution${rep === 1 ? '' : 's'}`;
      const xfer = el('button', 'sb-chip sb-rolechip', '↪ transfer my rank');
      xfer.addEventListener('click', async () => {
        const to = prompt('Transfer your fan rank #' + role.fanRank + ' to which address?\n(The seat and its phiWeight move; your earned reputation stays yours.)');
        if (!to) return;
        try { await transferFanRank(artistId, to.trim()); status.textContent = 'Rank transferred 🤙'; applyRole(); }
        catch (e) { status.textContent = explainError(e); }
      });
      bar.insertBefore(xfer, status);
    } else {
      chip.textContent = `👋 ${name} — visitor`;
      status.textContent = 'Browsing only. Editor seats are granted by the artist (96 ranked superfan chairs).';
    }

    // ✏️ edit affordances — only for wallets the contract recognizes as editors
    if (role.isArtist || role.fanRank > 0) {
      for (const node of items) {
        const key = node.dataset.osoItem;
        const label = node.dataset.osoLabel || key;
        const pencil = el('button', 'sb-chip sb-editchip', '✏️ ' + (role.isArtist ? 'edit' : 'suggest an edit'));
        pencil.addEventListener('click', () => openEditor({
          artistSlug,
          itemKey: key,
          itemLabel: label,
          seedText: seedTextFor(node, cfg),
          role,
          onChainChange: () => refreshItemProvenance(node),
        }));
        node.appendChild(pencil);
      }
    }
  }

  // ---- artist: superfan management panel ----
  async function openFanPanel() {
    const overlay = el('div', 'sb-overlay');
    const modal = el('div', 'sb-modal');
    overlay.appendChild(modal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    const head = el('div', 'sb-head');
    head.appendChild(el('h3', null, '🎚 superfan chairs — ' + artistSlug));
    const x = el('button', 'sb-close', '✕');
    x.addEventListener('click', () => overlay.remove());
    head.appendChild(x);
    modal.appendChild(head);
    const body = el('div', 'sb-body');
    modal.appendChild(body);
    body.appendChild(el('div', 'sb-note',
      '96 ranked chairs. Lower rank = stronger editorial authority (phi sequence). Seats are authority, never ownership or payment.'));

    const list = el('div', 'sb-fanlist', 'Loading occupied chairs…');
    body.appendChild(list);

    const err = el('div', 'sb-error', '');
    const f1 = el('div', 'sb-field');
    const rankIn = Object.assign(el('input'), { placeholder: 'rank 1–96', size: 6 });
    const addrIn = Object.assign(el('input'), { placeholder: '0x… fan address' });
    const btnAssign = el('button', 'sb-btn primary', 'seat fan');
    f1.append(el('label', null, 'assign'), rankIn, addrIn, btnAssign);
    const f2 = el('div', 'sb-field');
    const rankOut = Object.assign(el('input'), { placeholder: 'rank to vacate', size: 6 });
    const btnRemove = el('button', 'sb-btn danger', 'remove fan');
    f2.append(el('label', null, 'remove'), rankOut, btnRemove);
    body.append(f1, f2, err);

    async function loadChairs() {
      try {
        const c = readContract();
        const reads = [];
        for (let r = 1; r <= 96; r++) reads.push(c.fanAtRank(artistId, r));
        const seats = await Promise.all(reads);
        list.textContent = '';
        let any = false;
        for (let r = 1; r <= 96; r++) {
          const a = seats[r - 1];
          if (a && a !== '0x0000000000000000000000000000000000000000') {
            any = true;
            const row = el('div', null, `#${String(r).padStart(2, ' ')}  ${a}`);
            displayName(a).then((n) => { if (n !== shortAddress(a)) row.textContent = `#${String(r).padStart(2, ' ')}  ${a}  (${n})`; });
            list.appendChild(row);
          }
        }
        if (!any) list.textContent = 'No chairs seated yet.';
      } catch (e) { list.textContent = explainError(e); }
    }
    btnAssign.addEventListener('click', async () => {
      err.textContent = '';
      try { await assignFan(artistId, parseInt(rankIn.value, 10), addrIn.value.trim()); rankIn.value = addrIn.value = ''; loadChairs(); }
      catch (e) { err.textContent = explainError(e); }
    });
    btnRemove.addEventListener('click', async () => {
      err.textContent = '';
      try { await removeFan(artistId, parseInt(rankOut.value, 10)); rankOut.value = ''; loadChairs(); }
      catch (e) { err.textContent = explainError(e); }
    });

    document.body.appendChild(overlay);
    loadChairs();
  }
}

/// Legacy seed (§27): the text the editor starts from when no chain version
/// exists. Prefer an explicit inline seed template; fall back to the element's
/// visible text as a crude last resort.
function seedTextFor(node, cfg) {
  const tpl = node.querySelector(':scope [data-oso-seed]');
  if (tpl) return tpl.textContent.trim() + '\n';
  const seeds = cfg.seeds || {};
  if (seeds[node.dataset.osoItem]) return seeds[node.dataset.osoItem];
  return (node.innerText || '').trim().slice(0, 4000) + '\n';
}
