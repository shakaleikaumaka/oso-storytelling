// OSO Web3 Songbook — contract reads & writes.
// Reads go through a public RPC (no wallet needed — the public site stays
// public, spec §2). Writes require the connected wallet on the expected chain.

import { Contract, JsonRpcProvider, keccak256, toUtf8Bytes } from './vendor/ethers-6.15.0.min.js';
import { OSO_SONGBOOK_ABI } from './abi/OsoSongbook.js';
import { chainInfo, contractAddressFor, expectedChainId } from './config.js';
import { getSigner, ensureExpectedChain } from './wallet.js';

export const STATUS = ['NONE', 'PENDING', 'APPROVED', 'REJECTED', 'SUPERSEDED'];
export const PHI_SCALE = 10n ** 36n;

// ---------------------------------------------------------------------------
// Identifiers
// ---------------------------------------------------------------------------

export function artistIdFromSlug(slug) {
  return keccak256(toUtf8Bytes(slug));
}

/// Stable content item ids (spec §12) — never derived from mutable titles.
///   bio                          -> item('bio')
///   a song's songbook            -> item('song:<song-slug>:songbook')
///   a song's audio               -> item('song:<song-slug>:audio')
///   a song's metadata            -> item('song:<song-slug>:meta')
export function contentItemId(key) {
  return keccak256(toUtf8Bytes(key));
}

/// keccak256 of the exact UTF-8 bytes of a text document (spec §11).
export function hashText(text) {
  return keccak256(toUtf8Bytes(text));
}

/// keccak256 of exact raw bytes (audio & other binaries).
export function hashBytes(uint8arr) {
  return keccak256(uint8arr);
}

// ---------------------------------------------------------------------------
// Instances
// ---------------------------------------------------------------------------

export function isConfigured() {
  return !!contractAddressFor(expectedChainId());
}

export function readContract() {
  const chainId = expectedChainId();
  const address = contractAddressFor(chainId);
  if (!address) return null; // not deployed/configured — legacy seed only
  const info = chainInfo(chainId);
  const provider = new JsonRpcProvider(info.rpc, chainId, { staticNetwork: true });
  return new Contract(address, OSO_SONGBOOK_ABI, provider);
}

export async function writeContract() {
  const ok = await ensureExpectedChain();
  if (!ok) throw new Error('Please switch your wallet to ' + (chainInfo(expectedChainId())?.name || 'the expected network') + ' first.');
  const address = contractAddressFor(expectedChainId());
  if (!address) throw new Error('OsoSongbook contract address is not configured for this chain.');
  return new Contract(address, OSO_SONGBOOK_ABI, await getSigner());
}

// ---------------------------------------------------------------------------
// Reads (all safe with no wallet)
// ---------------------------------------------------------------------------

/// { isArtist, fanRank } — role gate straight from chain state (spec §23).
export async function roleOf(artistId, address) {
  const c = readContract();
  if (!c || !address) return { isArtist: false, fanRank: 0 };
  const [isArtist, fanRank] = await c.roleOf(artistId, address);
  return { isArtist, fanRank: Number(fanRank) };
}

/// Canonical resolution (spec §14): returns null when the legacy seed applies.
export async function canonicalOf(artistId, itemId) {
  const c = readContract();
  if (!c) return null;
  const [id, artistApproved] = await c.canonicalOf(artistId, itemId);
  if (id === 0n) return null;
  const contribution = await getContribution(id);
  return { id: Number(id), artistApproved, contribution };
}

export async function getContribution(id) {
  const c = readContract();
  if (!c) return null;
  const r = await c.getContribution(id);
  return {
    id: Number(id),
    artistId: r.artistId,
    contentItemId: r.contentItemId,
    contributor: r.contributor,
    roleRank: Number(r.roleRank),
    phiWeightX36: r.phiWeightX36, // BigInt
    contentHash: r.contentHash,
    contentURI: r.contentURI,
    parentId: Number(r.parentId),
    timestamp: Number(r.timestamp),
    status: STATUS[Number(r.status)] || 'NONE',
    artistApproved: r.artistApproved,
  };
}

export async function strongestPendingOf(artistId, itemId) {
  const c = readContract();
  if (!c) return null;
  const id = await c.strongestPendingOf(artistId, itemId);
  return id === 0n ? null : getContribution(id);
}

export async function reputationOf(artistId, address) {
  const c = readContract();
  if (!c || !address) return 0;
  return Number(await c.approvedContributionCount(artistId, address));
}

export async function phiWeightOfRank(rank) {
  const c = readContract();
  if (!c) return 0n;
  return c.phiWeightX36(rank);
}

/// Render a 1e36 fixed-point phi weight for humans (~up to 18 decimals shown).
export function formatPhiWeight(x36) {
  if (typeof x36 !== 'bigint') x36 = BigInt(x36 || 0);
  const intPart = x36 / PHI_SCALE;
  let frac = (x36 % PHI_SCALE).toString().padStart(36, '0').slice(0, 18).replace(/0+$/, '');
  if (!frac && intPart === 0n && x36 > 0n) return '< 0.000000000000000001';
  return frac ? `${intPart}.${frac}` : `${intPart}`;
}

// ---------------------------------------------------------------------------
// Writes (wallet + expected chain enforced; contract enforces permissions)
// ---------------------------------------------------------------------------

export async function submitContribution(artistId, itemId, contentHash, contentURI, parentId = 0) {
  const c = await writeContract();
  const tx = await c.submitContribution(artistId, itemId, contentHash, contentURI, parentId);
  return tx.wait();
}

export async function artistPublish(artistId, itemId, contentHash, contentURI, parentId = 0) {
  const c = await writeContract();
  const tx = await c.artistPublish(artistId, itemId, contentHash, contentURI, parentId);
  return tx.wait();
}

export async function approveContribution(artistId, contributionId) {
  const c = await writeContract();
  const tx = await c.approveContribution(artistId, contributionId);
  return tx.wait();
}

export async function rejectContribution(artistId, contributionId) {
  const c = await writeContract();
  const tx = await c.rejectContribution(artistId, contributionId);
  return tx.wait();
}

export async function assignFan(artistId, rank, fanAddress) {
  const c = await writeContract();
  const tx = await c.assignFan(artistId, rank, fanAddress);
  return tx.wait();
}

export async function removeFan(artistId, rank) {
  const c = await writeContract();
  const tx = await c.removeFan(artistId, rank);
  return tx.wait();
}

export async function transferFanRank(artistId, toAddress) {
  const c = await writeContract();
  const tx = await c.transferFanRank(artistId, toAddress);
  return tx.wait();
}

/// Decode a revert into a friendly explanation (spec §13 — the UI must say WHY).
export function explainError(err) {
  const msg = String(err?.message || err || '');
  if (msg.includes('StrongerProposalActive')) {
    const m = msg.match(/StrongerProposalActive\([^,]+,[^,]+,\s*(\d+)\)/);
    return 'A stronger pending proposal already exists' + (m ? ` from fan rank #${m[1]}` : '') + '. Only a stronger-ranked editor (or the artist) can supersede it.';
  }
  if (msg.includes('NotAnEditor')) return 'This wallet holds no editor seat for this artist. Ask the artist for a fan rank.';
  if (msg.includes('NotArtist')) return 'Only the artist can do that.';
  if (msg.includes('NotContractOwner')) return 'Only the platform steward can register artists.';
  if (msg.includes('user rejected')) return 'Transaction cancelled in the wallet.';
  return msg.length > 220 ? msg.slice(0, 220) + '…' : msg;
}
