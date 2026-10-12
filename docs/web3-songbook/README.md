# OSO Web3 Songbook 🪶

**AI seed → ranked human corrections → artist approval → cryptographic provenance.**

This turns every OSO artist profile node into an *artist-controlled, fan-maintained,
cryptographically verifiable Web3 songbook* (spec: Matteo Tambussi, 2026-08).
Machines sketch the first draft. Musicians and their communities correct it.
**The artist signs the truth.**

---

## Architecture overview

The site stays a **fully static GH-Pages deployment** — no framework, no bundler,
no backend. The upgrade is a set of plain **ES modules** plus one Solidity contract:

```
contracts/                 Foundry project — the on-chain provenance layer
  src/OsoSongbook.sol        single focused registry contract
  test/OsoSongbook.t.sol     44-test matrix (spec §29)
  script/Deploy.s.sol        anvil / Sepolia deployment
  script/acceptance.mjs      automated §30 acceptance flow vs anvil
web3/                      wallet · ENS · contract reads/writes · chain config
  config.js                  chains, deployed addresses, wrong-chain guard
  wallet.js                  window.ethereum connect + chain switch (EIP-1193)
  ens.js                     mainnet reverse lookup (display only, never auth)
  contract.js                typed reads/writes, ids, hashing, error explainer
  abi/OsoSongbook.js         generated ABI (forge inspect)
  vendor/ethers-6.15.0.min.js  vendored ethers ESM build (self-contained dApp)
storage/                   ContentStorageAdapter seam (spec §11)
  adapters.js                LocalDevAdapter (zero-infra) + SwarmAdapter (bzz)
songbook/                  editor & rendering
  markdown.js                escape-first Markdown renderer (XSS-safe by construction)
  chordpro.js                ChordPro ⇄ Markdown interop with the Orchestrator catalog
  editor.js                  raw/preview editor overlay · propose · publish · approve
  node-web3.js               node-page glue: provenance badges + role-gated ✏️ chips
  songbook.css               night-violet UI, same design language as the nodes
nodes/shaka/               the development example page (spec §30)
```

**Public browsing stays public** (spec §2): with no wallet — and even with no
contract configured — the page renders exactly as before. Reads (provenance
badges, canonical versions, hash verification) go through a public RPC and
need no wallet. A wallet is required only to *edit*.

## Contract architecture — `OsoSongbook.sol`

One focused contract, Solidity 0.8.x, custom errors, no proxy, no token,
no NFT, no DAO (spec §33). Two-step platform ownership (Ownable2Step-equivalent,
implemented inline to keep the repo dependency-free — the only power the
`contractOwner` holds is `registerArtist`; there is **no content backdoor**).

| Area | API |
|---|---|
| Artists | `registerArtist(slug, owner)` *(owner-only)* · `getArtist` · `artistOwnerOf` · `transferArtistRole` *(artist-only, voluntary)* |
| Fan hierarchy | `assignFan(artistId, rank, fan)` · `removeFan` *(artist-only)* · `transferFanRank(artistId, to)` *(seat holder only)* · `fanAtRank` · `rankOf` · `roleOf` |
| Phi | `phiWeightX36(roleRank)` · `PHI_SCALE = 1e36` · `INV_PHI_X36` |
| Contributions | `submitContribution(artistId, itemId, hash, uri, parentId)` · `artistPublish(...)` · `approveContribution` · `rejectContribution` |
| Queries | `canonicalOf(artistId, itemId)` · `strongestPendingOf` · `getContribution` · `contributionCount` |
| Reputation | `approvedContributionCount(artistId, editor)` |

Events: `ArtistRegistered/Transferred`, `FanAssigned/Removed/RankTransferred`,
`ContributionSubmitted/Superseded/Rejected`, `ArtistApproved`, `ArtistPublished`
— all indexed by artist / item / contribution for frontend history.

### Roles

- **Contract owner (platform steward)** — registers artists. Nothing else.
- **Artist (rank 0)** — root authority: publish directly, approve/reject, seat
  and remove up to **96 ranked superfans**, transfer their own role. Nobody can
  remove an artist; only the artist can hand the role on.
- **Superfans (ranks 1–96)** — ranked editors. Lower rank = stronger authority.
  A seat holder can transfer their own seat; the earned reputation never moves.

### phiWeight — and why 1e36

Authority (never money) follows the inverse golden ratio from 100:

```
phiWeight(roleRank) = 100 / phi^(roleRank + 1)     phi = (1+√5)/2
ARTIST 61.8034 · FAN1 38.1966 · FAN2 23.6068 · FAN3 14.5898 · … · FAN96 ≈ 5.35e-19
```

Solidity has no floats, and an 18-decimal WAD would floor FAN 96
(≈ 5.35 × 10⁻¹⁹ < 10⁻¹⁸) to **zero**. The contract therefore computes the value
by iterated fixed-point multiplication at **36 decimals**
(`INV_PHI_X36 = 618033988749894848204586834365638118`), keeping every rank
meaningfully non-zero (FAN 96 ≈ `5.348e17` at 1e36 scale). The **rank itself is
the definitive ordering** — phiWeight is a deterministic snapshot stored on each
contribution, so authority comparisons never depend on rounding.

### Canonical-version algorithm (spec §14)

For each `(artistId, contentItemId)`:

1. **latest artist-approved** contribution (`canonicalApprovedId`) — always wins;
2. else the **strongest active pending** proposal (`activePendingId` — by
   construction the single strongest, because weaker proposals cannot supersede);
3. else `0` → render the **legacy/AI seed** (the static site content, e.g.
   `nodes/shaka/node.json`). Migration is gradual: nothing breaks pre-chain.

Supersede rule enforced **on-chain** (spec §13): a fan may replace the active
pending proposal only if they are its author (revising their own draft) or hold
a strictly stronger rank. The artist bypasses everything. After an artist
approval exists, new fan proposals queue as *future corrections* and never
displace the approved version automatically.

Reputation: `approveContribution` grants the contributor **+1**, exactly once
per approval (a contribution can only leave PENDING once). Rejections give
nothing. Reputation belongs to the address forever — surviving rank transfer
and removal — and is never transferable.

### The three invariants (spec §35)

- **A. The artist can always prevail** — `artistPublish` ignores all proposals
  and weights; enforced by `onlyArtist`, proven in
  `test_artistCanAlwaysDirectPublish` and the acceptance flow.
- **B. Artist-approved content always prevails over phiWeight** — `canonicalOf`
  returns the approved version first, regardless of any pending phi;
  `test_approvedRemainsCanonicalDespiteNewFanProposals`.
- **C. Without artist approval, stronger phi authority prevails** —
  `StrongerProposalActive` blocks weaker supersedes; stronger ranks supersede;
  `test_weakerBlockedByStrongerPending`, `test_strongerCanSupersedeWeaker`.

## Content storage (spec §11)

Content never lives on-chain — the chain stores `keccak256` of the **exact
bytes** plus a content URI. `storage/adapters.js` defines the
`ContentStorageAdapter` seam:

- **LocalDevAdapter** (`local-dev://<keccak>`) — keccak-addressed browser
  storage; the whole loop runs with zero infrastructure. Dev only.
- **SwarmAdapter** (`bzz://<ref>`) — Ethereum Swarm via a Bee gateway
  (decentralized, content-addressed — OSO's stated direction). Configure:
  `localStorage.oso_swarm_gateway` (default `https://api.gateway.ethswarm.org`),
  `localStorage.oso_swarm_stamp` (postage batch id for your own Bee node), and
  switch uploads with `localStorage.oso_storage = 'bzz'`.

Verification (spec §26): every render retrieves the bytes, re-hashes them and
compares against the chain — badges `verified ✓` / `hash mismatch ⚠` /
`content unreachable` / `AI-generated draft · not yet artist approved`.

## Wallet / ENS

`web3/wallet.js` connects via `window.ethereum`, tracks account/chain switches,
and guards writes with `wallet_switchEthereumChain` (adding local anvil via
`wallet_addEthereumChain` when unknown). `web3/ens.js` resolves display names on
**mainnet** with graceful fallback to `0xabcd…1234`. Roles are read from the
contract — never from local config.

## Environment variables

Frontend: none (static site; per-browser dev overrides via `localStorage`).
Contracts (`contracts/.env.example` — **never commit a real `.env`**):

| var | meaning |
|---|---|
| `DEPLOYER_KEY` | deployer private key → becomes `contractOwner` |
| `SEPOLIA_RPC_URL` | Sepolia RPC endpoint |
| `FIRST_ARTIST_SLUG` / `FIRST_ARTIST_ADDR` | optional: register the first artist at deploy |
| `ETHERSCAN_API_KEY` | optional: `--verify` |

## Local development — exact steps

```bash
# 0. toolchain (once): https://book.getfoundry.sh  (curl -L https://foundry.paradigm.xyz | bash && foundryup)
cd contracts
forge install foundry-rs/forge-std   # lib/ is gitignored
forge build && forge test            # 44/44 must pass

# 1. local chain
anvil                                # terminal A

# 2. automated §30 acceptance flow (deploy + full loop, 15 checks)
node script/acceptance.mjs           # terminal B — prints the contract address

# 3. serve the site statically from the repo root
cd .. && python3 -m http.server 8088

# 4. point the dApp at your anvil deployment (browser console on the node page)
localStorage.setItem('oso_songbook_address', '0x…from step 2')
localStorage.setItem('oso_songbook_chain', '31337')
```

Then open `http://localhost:8088/nodes/shaka/`:

1. no wallet → the page is exactly the public site (plus provenance badges for
   items that already have chain versions);
2. click **“🪶 web3 songbook — connect wallet”** (MetaMask with an anvil key
   imported; the guard offers to add/switch to the anvil chain);
3. as the **artist** key: ✏️ edit chips, 🎚 manage superfans (seat fan #1),
   editor overlay → raw/preview → **artist publish**;
4. as a **fan** key: rank + phiWeight + reputation shown, **save proposal**;
   a weaker fan gets *“A stronger pending proposal already exists from fan
   rank #N”*;
5. as the artist again: open the item → approve or reject the pending proposal;
   the card badge flips to **✓ artist approved · verified ✓**.

## Deployment — anvil / Sepolia

```bash
cd contracts && cp .env.example .env   # fill in; never commit
# local
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 \
  --private-key $DEPLOYER_KEY --broadcast
# Sepolia (first testnet; NO mainnet per spec)
source .env && forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_KEY --broadcast --verify
```

Put the deployed address into `web3/config.js` → `DEPLOYMENTS[11155111]` and
commit. Register the first artist (steward key):

```bash
cast send $CONTRACT 'registerArtist(string,address)' shaka 0xARTIST \
  --rpc-url $SEPOLIA_RPC_URL --private-key $DEPLOYER_KEY
```

Assign the first fan (artist key):

```bash
cast send $CONTRACT 'assignFan(bytes32,uint8,address)' \
  $(cast keccak shaka) 1 0xFAN --rpc-url $SEPOLIA_RPC_URL --private-key $ARTIST_KEY
```

Verify a content hash by hand:

```bash
cast call $CONTRACT 'getContribution(uint64)((bytes32,bytes32,address,uint8,uint256,bytes32,uint64,uint64,uint8,bool,string))' 1 --rpc-url ...
cast keccak "$(cat the-retrieved-document.md)"   # must equal contentHash
```

## Legacy content migration (spec §27)

Existing static content (e.g. `nodes/shaka/node.json`, the rendered page) is the
**legacy seed**. Nothing is deleted; items without a chain version render the
seed and show *AI-generated / legacy draft*. The editor pre-fills from the seed,
so the first proposal for any item starts from today's content. Artists migrate
one item at a time, whenever they bless it.

## Orchestrator interop (spec §8/§24)

`songbook/chordpro.js` converts the Open Source Orchestrator's ChordPro catalog
(`catalog/shaka-lei-kaumaka/*.pro` at
github.com/ShakaLei/open-source-orchestrator) to Markdown songbook documents
(chords lifted **above** the words) and back — the editor's *⇄ import ChordPro*
/ *⬇ export ChordPro* buttons. The Orchestrator's parser is not duplicated;
these are conservative conversion helpers.

## Security notes

- Every permission is enforced **on-chain**; the frontend only hides buttons.
- Markdown rendering is escape-first: user text is HTML-escaped before any
  markup is built, links restricted to `http(s)` — no raw-HTML path exists.
- No private keys anywhere in the repo; `.env` is gitignored; the only key in
  `.env.example` is anvil's public dev key.
- Wrong-chain writes are blocked by the chain guard (spec §28.20).

## Remaining limitations (MVP)

- Audio replacement flow: the storage adapter + hashing handle any bytes, but
  the ✏️ UI currently edits Markdown items only (bio + songbooks). Audio
  provenance is contract-ready (`song:<slug>:audio` items).
- The public Swarm gateway may be slow/unavailable; LocalDevAdapter is default
  until OSO runs its own Bee node (or another content-addressed backend is
  added behind the adapter seam).
- One active pending proposal per item (the strongest) — matches the spec's
  supersede model, but parallel drafts from weaker fans are simply blocked
  until it resolves.
- No event-history browser UI yet (all events are emitted and indexed for it).
- Sepolia deployment pending a funded key; anvil is the proving ground.
