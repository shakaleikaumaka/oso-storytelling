# 🗝️ Garden Keys — how an artist edits only their own corner (and proposes to the open code)

*by the ʻohana — Shaka's AI family · built 29 Oct 2026 on Shaka's order: "giving each artist a code that they then can enter into OSO and customize only their own profile and make proposals to the overall OPEN SOURCE CODE — THE CODE IS LAW AND THE LAW IS LOVE." · CC0*

Live: https://opensourceorchestra.org/garden/circle/ → Greenhouse (🔎 find an artist) → **🗝️ I'm an artist — open my garden** (or `?keys=1`).

## The idea in one breath
Every artist holds **one garden key** = four words (EFF large wordlist, e.g. `word-word-word-word`). The key never leaves their browser. In the browser it becomes an **Ed25519 signing key**; every action (edit my corner · propose an idea · water someone's idea) is a **signed message** the artist emails (or pastes) to the stewards. A steward-agent verifies the signature against the public keys in the repo, sanitises the text, and publishes. No server, no database, no account — just math, email and git. (Our Cloudflare token is zone-scoped, so we can't run Workers/KV yet; this design needs none.)

## What an artist can do
| action | fields | limits |
|---|---|---|
| **edit** my corner | tagline · headline · bio · links · glyph (emoji) | tagline ≤140 · headline ≤90 · bio ≤600 plain text · ≤6 links {label ≤24, **https only**} · glyph ≤4 chars |
| **propose** to the open code | title · body · category (code/design/schedule/words/other) | title ≤80 · body ≤1200 · max 3 a day |
| **water 🌱** a proposal | proposal id | one water per artist per proposal, not your own |

Stewards keep: set time/day, kind, slug, name, photo, rider (shared promises with the Devcon team). Edits are laid over `artists.json` by `garden/circle/data/edits.json` (`overlay.js`); links are re-validated in the browser and everything is escaped.

## Cryptography (identical in browser and Python)
- key normalised: lowercase, trimmed, spaces/underscores → hyphens
- `seed = PBKDF2-HMAC-SHA256(key, salt="oso-garden-key-v1", 300000 iterations, 32 bytes)` → Ed25519 keypair (browser: WebCrypto + vendored tweetnacl, public domain; server: `cryptography`)
- message = `OSO-GARDEN-v1.` + base64url(payload JSON `{v,slug,ts,nonce,seq,kind,fields}`) + `.` + base64url(signature over the payload bytes)
- public keys only in the repo: `garden/keys/pub.json` `{pubkey_b64: slug}`. The 4-word keys live in the stewards'  private vault — never in `/shared`, the repo, logs, chats or tweets.
- delivery: `mailto:` to the ʻohana mailbox (address assembled in JS from parts so Cloudflare Scrape Shield can't mangle it) or "Copy" for Telegram. After sending: "Your garden grows within ~10 minutes".

## Processor (run by the stewards' office tick)
Read-only IMAP (never marks mail read; non-garden mail ignored) → finds subjects starting `OSO-GARDEN` → verifies signature for the claimed slug → replay checks (nonce unseen · timestamp ≤14 days old, not in the future · edit `seq` strictly increasing per artist) → sanitiser (control/bidi/zero-width chars stripped · no markup · lengths · https-only links, no IPs/ports/userinfo · `/shared/bin/scrub-public-text.py` rules: no emails/phones/Meet-Zoom codes/tokens; **whole message rejected with a reason**) → applies ONLY the allowed fields → append-only `garden/keys/history/*.jsonl` → commit "garden: … — verified signature — by the ʻohana, Shaka's AI family" → push. Proposals also open a GitHub issue `[proposal] <title>` (label `proposal`). It never emails artists. `--dry-run`, `--from-file`, and idempotent by Message-ID + nonce.

Policy today: edits publish **instantly after signature + sanitiser**, and are always revertable (alternative: steward approval first — Shaka's call).

## Threat model (honest)
| threat | answer |
|---|---|
| someone guesses a key | 4 EFF words ≈ 51 bits + 300 000-round PBKDF2 → each guess costs ~ms of CPU; offline attack on the public keys is ~10⁴ GPU-years |
| someone forges / tampers a message | Ed25519 signature over the exact payload bytes; any change = reject |
| replay of a captured message | per-message nonce + 14-day window + per-artist `seq` |
| one artist edits another | signature is checked against *that slug's* public key; wrong signer = reject |
| XSS / script links / HTML | text only, escaped on render; links must be https; `javascript:` etc. rejected on both sides |
| doxxing (emails/phones/Meet codes in a bio) | scrubber rejects; client warns first |
| spam | 3 proposals/day, 30 messages/day per artist; non-keyed mail can't write anything |
| the mailbox is read by others | messages hold only public-profile text + a signature — no secret; the key is never in the mail |
| **our weak spots** | a key shared in a chat can be reused by whoever reads it (revoke = re-issue); email is not instant; the steward container is trusted (it holds all keys in the vault — treat it like our other secrets, the tripwire watches it) |

## Steward cookbook
- **Issue / hand over a key:** `gk.py show <slug>` → one private message to that artist (Shaka's bless first — see `vault/garden-keys/DISTRIBUTION-DRAFT.md`).
- **Lost key / suspected leak (re-issue):** `gk.py reissue <slug>` → writes a new key to the vault and a new `pub.json` into the clone; commit + push `garden/keys/pub.json` (the old key stops working the moment it's live). Then hand over the new key privately.
- **Revoke without replacement:** `gk.py revoke <slug>` + push `pub.json`.
- **Revert an edit:** `process.py revert <slug> <seq>` (seq is in `garden/keys/history/*.jsonl`) — field-level; later changes to the same field are kept; logged as `reverted`. **Remove a proposal:** `process.py revert-proposal <id>`.
- **Check on it:** the office tick prints `🗝️ GARDEN KEYS: n applied` + one line per message; history is the audit trail.
- **Later, a real backend:** a Cloudflare Worker + KV with a token that has Workers scope would make edits instant (same signatures, same pub.json) — the client keeps working unchanged.

Code: `garden/circle/{keys.js,keys.css,overlay.js,vendor/nacl-fast.min.js}` · `garden/keys/` · the stewards' processor.
