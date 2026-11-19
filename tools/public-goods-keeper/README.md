# 🎁 Public Goods Keeper

Keeps the Open Source Orchestra's open shelf ("**What we keep openly sharing & building**",
https://opensourceorchestra.org/dao/#share-h) **always true and healthy**.

> Shaka Lei Kaumaka, 15 Nov 2026: *"lets make sure these are always up to date and running super well for the public good 🎁"*
> and, a minute later, pointing at the original OSO P.I.T. code: *"we can dream and build because the ohana and myself we born for this"*.

Human report: https://opensourceorchestra.org/dao/health/ · machine copy: https://opensourceorchestra.org/dao/public-goods.json

## What it checks (every day)

`shelf.json` lists every item on the shelf and how to know it is working:

| check | means |
|---|---|
| `page` | the page answers 200, still contains the text it must (e.g. "Talk to the Totem"), isn't slow, doesn't carry a stale Devcon IX date (Lisbon is **12–14 Oct 2027**), and Cloudflare isn't rewriting its `mailto:` links |
| `asset` | a key file still downloads (first 1 KB, `Range` request): the plain-text rider, a transcript, an MP3 |
| `json` | a data endpoint parses and has what it should (the Garden Circle's artists, the chat proxy, the chat worker's `/health`) |
| `links` | every link on the page leads somewhere (`same-host`, or `family` = every door in the registry + our GitHub homes); walled sites (X, LinkedIn, Ko-fi…) never count as broken |
| `recordings` | every recording **published with consent** in the theater ledger still plays: audio, transcript, captions, film |
| `doors` | the All Doors registry says every public door is live |

It also **counts live** (never typed by hand): public repositories in every GitHub home (`github_homes`), Songbook
chapters, Build Library books (and how old the library build is), consented open recordings, doors.

Results: `out/status.json` · `out/STATUS.md` · `out/history.jsonl`. Exit `0` healthy · `10` needs care · `20` something down.

```bash
python3 -I keeper.py            # full check (≈30 s)
python3 -I keeper.py --no-links # quick
GH_TOKEN=… python3 -I keeper.py # optional: higher GitHub API limit (never printed or stored)
```

## Who does what

- **PUBLIC GOODS KEEPER 🎁** (a low-cost AI agent of the ʻohana, scheduled daily): runs `keeper.py`, writes the pulse
  `/shared/heartbeat/pulses/public-goods.md`, and tells Shaka only when an item is **down on two checks in a row**.
  It has no keys and never deploys.
- **The office** (sysadmin 🫡): on its rounds runs `keeper.py` + `apply.py --push`, which writes
  `dao/public-goods.json`, rebuilds `/dao/` + `/dao/health/` and the Gift Board count on shakaleikaumaka.com, and
  pushes only when something material changed (or once a day for the stamp). Then it repairs whatever is 🟡/🔴.

## Laws

1. Read-only and public-safe: GET/HEAD requests only, our own public URLs, no posts, no keys, nothing private in the output.
2. Numbers come from live sources. If a source doesn't answer, the last counted value is kept **and marked stale**.
3. Honest status: 🟡 and 🔴 are shown publicly until fixed. Nothing is hidden to look good.
4. Not ours to repair (e.g. the founding crew's original app on Vercel) → `soft` check: we notice, and we tell them.
5. Adding something to the shelf = add an item to `shelf.json` (and the line on `/dao/` in `tools/build-dao.py`).

Code GPL-3.0-or-later, words CC BY-SA 4.0. Fork it for your own public goods. Built by Shaka's AI ʻohana (labelled as AI).
