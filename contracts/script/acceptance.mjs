#!/usr/bin/env node
// OSO Web3 Songbook — automated §30 acceptance flow against a local anvil.
//
//   1. anvil                       (terminal A)
//   2. cd contracts && forge build (once)
//   3. node script/acceptance.mjs  (terminal B, from repo root or contracts/)
//
// Deploys OsoSongbook with anvil account #0 as platform steward, then walks
// the §30 flow: register shaka → assign fan #1 → fan proposes a songbook
// edit → weaker fan blocked → artist approves (canonical + reputation +1) →
// hash re-verified from storage → artist direct-publish supersedes everything.
//
// Uses the SAME vendored ethers module and content hashing as the dApp, so a
// green run also proves the frontend crypto path. Browser-only steps (wallet
// prompt, ENS display, ✏️ UI) are covered in docs/web3-songbook/README.md.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { JsonRpcProvider, Wallet, NonceManager, ContractFactory, Contract, Interface, keccak256, toUtf8Bytes } =
  await import(join(root, 'web3', 'vendor', 'ethers-6.15.0.min.js'));
const { OSO_SONGBOOK_ABI } = await import(join(root, 'web3', 'abi', 'OsoSongbook.js'));
const iface = new Interface(OSO_SONGBOOK_ABI);

const RPC = process.env.RPC_URL || 'http://127.0.0.1:8545';
// anvil's standard, publicly-known dev mnemonic keys — never real funds
const KEYS = [
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', // steward
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d', // shaka (artist)
  '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a', // fan #1
  '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6', // fan #20 (weaker)
];

let passed = 0;
function ok(label, cond) {
  if (!cond) { console.error('  ✗ FAIL — ' + label); process.exit(1); }
  passed++;
  console.log('  ✓ ' + label);
}
async function expectRevert(label, p, needle) {
  try { await p; console.error('  ✗ FAIL — expected revert: ' + label); process.exit(1); }
  catch (e) {
    // decode the custom error name from the revert data via the ABI
    let decoded = null;
    try { decoded = iface.parseError(e?.data)?.name; } catch (_) { /* not decodable */ }
    const s = [decoded, e?.revert?.name, e?.reason, e?.shortMessage, e?.message].filter(Boolean).join(' | ');
    ok(label + (needle ? ` (${needle})` : ''), !needle || s.includes(needle));
    if (needle && !s.includes(needle)) console.error('    got: ' + s.slice(0, 300));
  }
}

const provider = new JsonRpcProvider(RPC, undefined, { staticNetwork: true });
try { await provider.getBlockNumber(); }
catch { console.error(`No chain at ${RPC} — start anvil first.`); process.exit(1); }

// NonceManager sidesteps ethers' brief tx-count cache against instamining anvil
const [steward, shaka, fan1, fan20] = KEYS.map((k) => new NonceManager(new Wallet(k, provider)));
[steward, shaka, fan1, fan20].forEach((s) => { s.address = s.signer.address; });

// In-memory ContentStorageAdapter (same contract as the browser adapters):
// store exact bytes, address by keccak256, verify on retrieval.
const memStore = new Map();
async function store(text) {
  const bytes = toUtf8Bytes(text);
  const hash = keccak256(bytes);
  memStore.set(hash, bytes);
  return { uri: 'local-dev://' + hash, hash };
}
async function retrieveVerified(uri, expectedHash) {
  const bytes = memStore.get(uri.replace('local-dev://', ''));
  return { text: new TextDecoder().decode(bytes), verified: keccak256(bytes) === expectedHash };
}

console.log('— deploy —');
const artifact = JSON.parse(readFileSync(join(root, 'contracts', 'out', 'OsoSongbook.sol', 'OsoSongbook.json'), 'utf8'));
const factory = new ContractFactory(OSO_SONGBOOK_ABI, artifact.bytecode.object, steward);
const deployed = await (await factory.deploy()).waitForDeployment();
const address = await deployed.getAddress();
console.log('  OsoSongbook @ ' + address);
const as = (signer) => new Contract(address, OSO_SONGBOOK_ABI, signer);

const artistId = keccak256(toUtf8Bytes('shaka'));
const itemId = keccak256(toUtf8Bytes('song:todo-es-posible:songbook'));

console.log('— §30 flow —');
// steps 1-2 (visitor browsing) are static-site behaviour; chain side starts here
await (await as(steward).registerArtist('shaka', shaka.address)).wait();
ok('steward registered artist "shaka" → ' + shaka.address, (await as(steward).artistOwnerOf(artistId)) === shaka.address);

await expectRevert('non-owner cannot register artists', as(fan20).registerArtist.staticCall('x', fan20.address), 'NotContractOwner');
await expectRevert('steward has NO content backdoor', as(steward).artistPublish.staticCall(artistId, itemId, keccak256(toUtf8Bytes('x')), '', 0), 'NotArtist');

// 5. roles resolve from chain state
let [isArtist, rank] = await as(shaka).roleOf(artistId, shaka.address);
ok('contract identifies artist role (rank 0)', isArtist && rank === 0n);

// 6. artist assigns Fan Rank #1
await (await as(shaka).assignFan(artistId, 1, fan1.address)).wait();
await (await as(shaka).assignFan(artistId, 20, fan20.address)).wait();
[isArtist, rank] = await as(fan1).roleOf(artistId, fan1.address);
// 8. fan sees rank #1 and correct phiWeight (~38.1966… at 1e36)
const w1 = await as(fan1).phiWeightX36(1);
const exactW1 = 38196601125010515179541316563436188227n; // 100/phi^2 at 1e36
const drift = w1 > exactW1 ? w1 - exactW1 : exactW1 - w1;
ok('fan #1 seated; phiWeight(1) = 38.19660112… (±1e-12 rel)', !isArtist && rank === 1n &&
  drift * 1_000_000_000_000n < exactW1);

// 9-11. fan edits Markdown; content stored off-chain; exact-bytes keccak256
const draftV2 = '# Todo Es Posible 🍂\n\nkey C major · ~81 bpm\n\n```\nC       Cmaj7        F\nTodo es posible, todo es posible\n```\n\n*fan correction: "Turo" → "Todo" — the title says so.*\n';
const { uri, hash } = await store(draftV2);

// 12-13. fan submits; sequential id
await (await as(fan1).submitContribution(artistId, itemId, hash, uri, 0)).wait();
const c1 = await as(fan1).getContribution(1);
ok('contribution #1 submitted by fan #1 (PENDING)', c1.contributor === fan1.address && c1.status === 1n);
// 14. contributor + phiWeight snapshot + pending displayable
ok('rank + phiWeight snapshotted on the contribution', c1.roleRank === 1n && c1.phiWeightX36 === w1);

// 15. weaker fan is blocked
await expectRevert('weaker fan #20 blocked from superseding', as(fan20).submitContribution.staticCall(artistId, itemId, keccak256(toUtf8Bytes('weak')), '', 0), 'StrongerProposalActive');
// 16. stronger could supersede weaker — proven exhaustively in forge tests
console.log('  ⓘ stronger-supersedes-weaker: forge test test_strongerCanSupersedeWeaker');

// 17-19. artist approves → canonical
await (await as(shaka).approveContribution(artistId, 1)).wait();
let [canonId, approved] = await as(shaka).canonicalOf(artistId, itemId);
ok('artist approved #1 → canonical', canonId === 1n && approved === true);
// 21. +1 contributionScore
ok('contributor reputation +1', (await as(shaka).approvedContributionCount(artistId, fan1.address)) === 1n);
await expectRevert('same approval cannot double-count', as(shaka).approveContribution.staticCall(artistId, 1), 'NotPendingContribution');

// 22. on-chain hash independently verified against retrieved content
const got = await retrieveVerified(uri, (await as(shaka).getContribution(1)).contentHash);
ok('storage bytes re-hashed == on-chain hash (verified ✓)', got.verified && got.text === draftV2);

// 23-25. artist direct edit + publish — prevails over everything
const final = draftV2.replace('fan correction', 'artist canon');
const pub = await store(final);
await (await as(shaka).artistPublish(artistId, itemId, pub.hash, pub.uri, 1)).wait();
[canonId, approved] = await as(shaka).canonicalOf(artistId, itemId);
ok('artistPublish #2 supersedes — invariant A (artist always prevails)', canonId === 2n && approved === true);
ok('previous approved version kept in history (SUPERSEDED, still artist-approved)',
  (await as(shaka).getContribution(1)).status === 4n && (await as(shaka).getContribution(1)).artistApproved === true);

// invariant B: new fan proposal does NOT displace approved canonical
const prop = await store(final + '\n*future correction proposal*\n');
await (await as(fan1).submitContribution(artistId, itemId, prop.hash, prop.uri, 2)).wait();
[canonId] = await as(shaka).canonicalOf(artistId, itemId);
ok('new fan proposal stays pending — invariant B (approval > phiWeight)', canonId === 2n &&
  (await as(shaka).strongestPendingOf(artistId, itemId)) === 3n);

console.log(`\nALL ${passed} ACCEPTANCE CHECKS PASSED 🤙  (contract ${address} on ${RPC})`);
console.log('Point the dApp at it:  localStorage.oso_songbook_address = "' + address + '"; localStorage.oso_songbook_chain = "31337"');
