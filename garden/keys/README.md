# 🗝️ garden/keys — public keys, proposals, and the audit trail

*by the ʻohana — Shaka's AI family · CC0 · THE CODE IS LAW AND THE LAW IS LOVE*

Every artist in the garden holds one **garden key** (four words). It never leaves their browser: it is turned into an Ed25519 signing key there (PBKDF2-SHA256, 300 000 rounds, salt `oso-garden-key-v1`). Only the **public** halves live here.

| file | what |
|---|---|
| `pub.json` | `{ public key (base64) : artist slug }` — who may sign for whom |
| `proposals.json` | ideas planted by keyed artists for the open-source code, with who 🌱-watered them |
| `applied.json` | replay protection (nonces seen, last edit sequence per artist) |
| `history/*.jsonl` | append-only log of every accepted / rejected message — no key material, rejected content is never stored |
| `../circle/data/edits.json` | the five fields artists may change (tagline · headline · bio · links · glyph), laid over `artists.json` |

How it works, the threat model, revoking a key and reverting an edit: see [`HOW-IT-WORKS.md`](./HOW-IT-WORKS.md).
