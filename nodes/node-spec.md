# The OSO Node Profile Spec — v0.1 (draft, CC0)

> Every voice is a node. A node profile is a musician's home **they own** —
> like a social profile, but sovereign: your data, your keys, your choice of
> what becomes open source.

The first full profile node is live: [Node 003 — Shaka Lei Kaumaka](/nodes/shaka/)
(machine-readable manifest: [`node.json`](/nodes/shaka/node.json)).

## The principles

1. **Your data is yours.** A node is a folder (today) or your own repo (tomorrow).
   You can take it with you, mirror it, or delete it. The orchestra only *indexes* nodes,
   it never owns them.
2. **Open source is a blessing, not a default-grab.** Every song, video, photo and
   chart carries its own `license` and `visibility`. CC0 happens when *you* bless it,
   item by item. Anything you don't list simply never leaves your storage.
3. **Consent first.** Nothing about another person appears on a node without their yes.
   Anonymity is welcome. "No" is honored forever.
4. **No feed, no ads, no gate.** Profiles connect through music, not metrics.
   The orchestra never monetizes the nodes.
5. **A node can be a person or a collective.** [Node 013 — MUSICA W3](/nodes/musica-w3/)
   is the first collective chair (`"kind": "collective"` in `node.json`; individual
   nodes are `"kind": "artist"`, implicit when omitted).

## v0 — today (folder nodes)

A node lives at `nodes/<slug>/` in this site's repo:

```
nodes/<slug>/
  index.html    — your profile page (fork nodes/shaka/ as the template)
  node.json     — machine-readable manifest (spec below)
  media/        — optional: photos, small files (big media: link YouTube / your own host)
```

**How to create yours today:** fork the repo and open a PR — or simply email
[contribute@opensourceorchestra.org](mailto:contribute@opensourceorchestra.org) with your
name, bio, links, songs and media, and the orchestra sets your page; you approve
every word before it ships.

### node.json v0.1 fields

| field | meaning |
|---|---|
| `oso_node_spec` | spec version, `"0.1"` |
| `node`, `slug`, `name`, `emoji`, `tagline`, `bio`, `quote`, `location` | who you are |
| `links[]` | `{label, url}` — your doors |
| `songs[]` | `{title, status, key, progression, bpm, license, visibility, media{}}` |
| `media[]` | `{type: youtube|mp4|mp3|photo, id/src, title, channel, visibility}` |
| `license_default` | your default stance; per-item license always wins |

`status` values for songs: `artist-blessed` (you confirmed the chart) ·
`machine-draft` (detector output awaiting your ear) · `awaiting-words` etc.

## v1 — next (bring-your-own-repo federation)

Your `node.json` lives in **your own repo** (or any URL you control). The orchestra keeps
only a registry of node URLs and re-renders the roster from them — a webring, not a walled
garden. You rotate or revoke by editing your own file. Nothing to migrate, nothing held
hostage.

## v2 — later (accounts & editing)

When nodes need in-browser editing: **Sign-In With Ethereum** (you already have keys —
the bard's way; no password database to leak) with email magic-link as the fallback for
musicians without wallets. The editor writes to *your* storage (your repo / your bucket),
never to a central silo. Passwords, if ever, are hashed, exportable-on-demand, and
deletable — but the goal is to never need them.

## Media

- **YouTube**: click-to-load embeds (`youtube-nocookie.com`) — no tracking until the
  visitor presses play. List the source channel honestly; credit community captures.
- **Audio/video files**: host anywhere you control (your site, R2, IPFS); the node just
  links. Karaoke packs from the Karaoke Protocol plug straight in.
- **Charts**: songs charted through the [Open Source Orchestrator](https://orchestrator.opensourceorchestra.org)
  can join the community catalog — with your blessing.

---
*CC0 — fork the format. The music is the blessing.* 🌺
