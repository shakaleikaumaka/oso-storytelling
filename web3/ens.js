// OSO Web3 Songbook — ENS display names.
// ENS is an identity/DISPLAY layer, not authentication (spec §3): authorization
// always comes from the address + contract state. Reverse lookups run against
// Ethereum mainnet read-only, regardless of the app chain.

import { JsonRpcProvider } from './vendor/ethers-6.15.0.min.js';
import { ENS_MAINNET_RPC } from './config.js';

let mainnet = null;
const cache = new Map();

function provider() {
  if (!mainnet) mainnet = new JsonRpcProvider(ENS_MAINNET_RPC, 1, { staticNetwork: true });
  return mainnet;
}

export function shortAddress(addr) {
  if (!addr) return '';
  return addr.slice(0, 6) + '…' + addr.slice(-4);
}

/// Resolve a display name: ENS reverse record when available, else 0xabcd…1234.
/// Never throws — display must not break on RPC hiccups.
export async function displayName(addr) {
  if (!addr) return '';
  const key = addr.toLowerCase();
  if (cache.has(key)) return cache.get(key);
  let name = shortAddress(addr);
  try {
    const ens = await provider().lookupAddress(addr);
    if (ens) name = ens;
  } catch (e) {
    console.warn('[oso-web3] ENS lookup failed (display falls back to address)', e?.message || e);
  }
  cache.set(key, name);
  return name;
}
