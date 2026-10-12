// OSO Web3 Songbook — ContentStorageAdapter (spec §11).
// The chain stores hashes + URIs; the content itself lives off-chain in
// content-addressed storage. This module is the seam where storage backends
// can evolve without touching the rest of the dApp.
//
// Adapter contract (duck-typed interface):
//   name                      string
//   scheme                    URI scheme this adapter produces/handles
//   canStore()                bool — is uploading possible right now?
//   store(bytes: Uint8Array)  -> Promise<uri: string>
//   retrieve(uri: string)     -> Promise<Uint8Array>
//
// Every stored object is verified by keccak256 of its EXACT bytes against the
// on-chain record — retrieval integrity never depends on the transport.

import { keccak256 } from '../web3/vendor/ethers-6.15.0.min.js';

const te = new TextEncoder();
const td = new TextDecoder();

export function utf8Bytes(text) { return te.encode(text); }
export function utf8Text(bytes) { return td.decode(bytes); }

// ---------------------------------------------------------------------------
// LocalDevAdapter — keccak-addressed localStorage. Zero infrastructure:
// lets the whole edit → hash → submit → verify loop run against anvil with no
// storage service. Obviously single-browser only; NOT for production content.
// ---------------------------------------------------------------------------

export class LocalDevAdapter {
  name = 'local-dev (browser storage)';
  scheme = 'local-dev';

  canStore() { return true; }

  async store(bytes) {
    const hash = keccak256(bytes);
    // store as UTF-8 text — this adapter is used for Markdown/JSON documents
    localStorage.setItem('oso_content_' + hash, utf8Text(bytes));
    return `local-dev://${hash}`;
  }

  async retrieve(uri) {
    const hash = uri.replace('local-dev://', '');
    const text = localStorage.getItem('oso_content_' + hash);
    if (text === null) throw new Error('Content not found in this browser\'s local dev storage: ' + uri);
    return utf8Bytes(text);
  }
}

// ---------------------------------------------------------------------------
// SwarmAdapter — Ethereum Swarm via a Bee gateway (the decentralized target
// direction for OSO). Upload needs a gateway that accepts unauthenticated
// POST /bzz or a configured postage stamp; retrieval works against any
// public gateway. Configure via localStorage:
//   oso_swarm_gateway   e.g. https://api.gateway.ethswarm.org  (or a local bee node http://127.0.0.1:1633)
//   oso_swarm_stamp     postage batch id (required by your own bee node)
// ---------------------------------------------------------------------------

export class SwarmAdapter {
  name = 'Swarm (bzz)';
  scheme = 'bzz';

  constructor() {
    let gw = null, stamp = null;
    try {
      gw = localStorage.getItem('oso_swarm_gateway');
      stamp = localStorage.getItem('oso_swarm_stamp');
    } catch (_) { /* storage unavailable */ }
    this.gateway = (gw || 'https://api.gateway.ethswarm.org').replace(/\/$/, '');
    this.stamp = stamp || null;
  }

  canStore() { return true; } // the gateway may still refuse — errors surface to the UI

  async store(bytes) {
    const headers = { 'Content-Type': 'application/octet-stream' };
    if (this.stamp) headers['Swarm-Postage-Batch-Id'] = this.stamp;
    const res = await fetch(this.gateway + '/bzz', { method: 'POST', headers, body: bytes });
    if (!res.ok) throw new Error(`Swarm upload failed (${res.status}) — check gateway/postage stamp configuration`);
    const { reference } = await res.json();
    if (!reference) throw new Error('Swarm gateway returned no reference');
    return `bzz://${reference}`;
  }

  async retrieve(uri) {
    const ref = uri.replace('bzz://', '');
    const res = await fetch(`${this.gateway}/bzz/${ref}/`);
    if (!res.ok) throw new Error(`Swarm retrieval failed (${res.status}) for ${uri}`);
    return new Uint8Array(await res.arrayBuffer());
  }
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const adapters = [new LocalDevAdapter(), new SwarmAdapter()];

/// The adapter used for NEW uploads. Defaults to local-dev so everything works
/// with zero infrastructure; flip to Swarm with:
///   localStorage.setItem('oso_storage', 'bzz')
export function activeAdapter() {
  let pref = null;
  try { pref = localStorage.getItem('oso_storage'); } catch (_) { /* ignore */ }
  return adapters.find((a) => a.scheme === pref) || adapters[0];
}

/// Route a URI to the adapter that can retrieve it.
export function adapterForUri(uri) {
  const a = adapters.find((x) => uri && uri.startsWith(x.scheme + '://'));
  if (!a) throw new Error('No storage adapter for URI: ' + uri);
  return a;
}

/// Retrieve + verify (spec §11 steps 1-3): fetch bytes, keccak them, compare.
/// Returns { bytes, text, hash, verified }.
export async function retrieveVerified(uri, expectedHash) {
  const bytes = await adapterForUri(uri).retrieve(uri);
  const hash = keccak256(bytes);
  return {
    bytes,
    text: utf8Text(bytes),
    hash,
    verified: !!expectedHash && hash.toLowerCase() === expectedHash.toLowerCase(),
  };
}

/// Store + hash in one step. Returns { uri, hash }.
export async function storeContent(bytes) {
  const adapter = activeAdapter();
  const hash = keccak256(bytes);
  const uri = await adapter.store(bytes);
  return { uri, hash, adapter: adapter.name };
}
