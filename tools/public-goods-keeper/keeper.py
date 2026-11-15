#!/usr/bin/env python3 -I
"""🎁 PUBLIC GOODS KEEPER: keep the Open Source Orchestra's open shelf true and healthy.

Shaka, 15 Nov 2026: "lets make sure these are always up to date and running super well for the public good".
The shelf = https://opensourceorchestra.org/dao/#share-h ("What we keep openly sharing & building").

What one run does (read-only, public-safe: GET/HEAD only, no posts, no keys, no private data):
  1. counts   : public repos across every GitHub home (shelf.json github_homes), Songbook chapters,
                Build Library books, consented open recordings, doors (live/public)
  2. checks   : every shelf item (shelf.json items[].checks): page up + must-have text, key assets
                (media/data), JSON endpoints, internal links, Devcon IX date guard
  3. writes   : out/status.json (machine) · out/STATUS.md (human) · out/history.jsonl (one line per run)
  4. exit     : 0 all healthy · 10 something needs care (warn) · 20 something is down (fail)

Usage:  python3 -I keeper.py [--out DIR] [--no-links] [--quiet]
Env:    GH_TOKEN / GITHUB_TOKEN (optional; raises the GitHub API limit. Never printed, never written.)
Built by the AI ʻohana (sysadmin 🫡) for Shaka Lei Kaumaka · code GPL-3.0-or-later.
"""
import concurrent.futures
import datetime as dt
import html
import json
import os
import re
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ARGS = sys.argv[1:]
OUT = ARGS[ARGS.index("--out") + 1] if "--out" in ARGS else os.path.join(HERE, "out")
NO_LINKS = "--no-links" in ARGS
QUIET = "--quiet" in ARGS
os.makedirs(OUT, exist_ok=True)

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 ohana-public-goods-keeper/1"
NOW = dt.datetime.now(dt.timezone.utc).replace(microsecond=0)
STAMP = NOW.strftime("%Y-%m-%dT%H:%M:%SZ")
# hosts that wall off robots or rate-limit us; a 401/403/429 there is "walled", never "broken"
WALLED = ("x.com", "twitter.com", "linkedin.com", "instagram.com", "facebook.com", "t.me", "telegram.me", "luma.com", "lu.ma",
          "docs.google.com", "drive.google.com", "forms.gle", "meet.google.com", "open.spotify.com", "music.apple.com", "tiktok.com",
          "youtube.com", "youtu.be", "ko-fi.com", "linktr.ee", "octant.build", "talent.app", "kalabrand.com")
ARCHIVE_HOSTS = ("web.archive.org", "archive.softwareheritage.org")  # checked by the archive keepers, not here (they throttle us)
# Devcon IX Lisbon is 12–14 Oct 2027 (moved from 11–13 on 13 Nov 2026). Any page still saying 11–13 is stale.
STALE_TEXT = [r"11\s*[–-]\s*13\s+Oct(ober)?\.?\s+2027"]

shelf = json.load(open(os.path.join(HERE, "shelf.json")))
prev = {}
try:
    prev = json.load(open(os.path.join(OUT, "status.json")))
except Exception:
    pass

_cache = {}


def fetch(url, method="GET", rng=None, timeout=25, accept="*/*"):
    """→ dict(status, ms, body(bytes|None), final, error). Cached per run for GET without range."""
    key = (url, method, rng)
    if key in _cache:
        return _cache[key]
    t0 = time.time()
    hdr = {"User-Agent": UA, "Accept": accept}
    if rng:
        hdr["Range"] = rng
    tok = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
    if tok and urllib.parse.urlsplit(url).hostname == "api.github.com":
        hdr["Authorization"] = "Bearer " + tok
    r = {"status": None, "ms": None, "body": None, "final": url, "error": None}
    try:
        req = urllib.request.Request(url, method=method, headers=hdr)
        with urllib.request.urlopen(req, timeout=timeout, context=ssl.create_default_context()) as resp:
            r["status"] = resp.status
            r["final"] = resp.geturl()
            if method == "GET":
                r["body"] = resp.read(8 * 1024 * 1024 if not rng else 4096)
            r["headers"] = dict(resp.headers)
    except urllib.error.HTTPError as e:
        r["status"] = e.code
        r["headers"] = dict(e.headers or {})
        try:
            r["body"] = e.read(65536)
        except Exception:
            pass
    except Exception as e:
        r["error"] = (type(e).__name__ + ": " + str(e))[:160]
    r["ms"] = int((time.time() - t0) * 1000)
    _cache[key] = r
    return r


def text_of(body):
    return (body or b"").decode("utf-8", "ignore")


def host_of(u):
    return (urllib.parse.urlsplit(u).hostname or "").lower()


def walled(u):
    h = host_of(u)
    return any(h == w or h.endswith("." + w) for w in WALLED)


# ── 1. COUNTS ──────────────────────────────────────────────────────────────────
counts = {}
notes_global = []


def count_repos():
    homes, repos, stale = {}, [], []
    prev_homes = (((prev.get("counts") or {}).get("repos") or {}).get("homes")) or {}
    for h in shelf["github_homes"]:
        login, kind = h["login"], h["kind"]
        got, page, ok = [], 1, True
        while page <= 5:
            q = "type=owner" if kind == "users" else "type=public"
            r = fetch(f"https://api.github.com/{kind}/{login}/repos?per_page=100&page={page}&{q}", accept="application/vnd.github+json")
            if r["status"] != 200:
                ok = False
                break
            batch = json.loads(text_of(r["body"]) or "[]")
            got += [x for x in batch if not x.get("private")]
            if len(batch) < 100:
                break
            page += 1
        if ok:
            homes[login] = len(got)
            repos += got
        else:
            homes[login] = prev_homes.get(login)
            stale.append(login)
    total = sum(v for v in homes.values() if isinstance(v, int))
    lic = {}
    for x in repos:
        k = ((x.get("license") or {}).get("spdx_id")) or "NONE"
        lic[k] = lic.get(k, 0) + 1
    newest = sorted(repos, key=lambda x: x.get("created_at") or "", reverse=True)[:6]
    week_ago = (NOW - dt.timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%SZ")
    c = {
        "total": total,
        "homes": homes,
        "licenses": dict(sorted(lic.items(), key=lambda kv: -kv[1])) if not stale else ((prev.get("counts") or {}).get("repos") or {}).get("licenses", lic),
        "originals": sum(1 for x in repos if not x.get("fork")) if not stale else None,
        "forks": sum(1 for x in repos if x.get("fork")) if not stale else None,
        "archived": sum(1 for x in repos if x.get("archived")) if not stale else None,
        "pushed_last_7_days": sum(1 for x in repos if (x.get("pushed_at") or "") >= week_ago) if not stale else None,
        "newest": [{"repo": x["full_name"], "created": (x.get("created_at") or "")[:10], "license": ((x.get("license") or {}).get("spdx_id")) or "NONE"} for x in newest],
        "source": "GitHub REST API (public repositories only)",
        "at": STAMP if not stale else (((prev.get("counts") or {}).get("repos") or {}).get("at") or STAMP),
    }
    if stale:
        c["stale_homes"] = stale
        notes_global.append("GitHub API did not answer for " + ", ".join(stale) + " (rate limit?) → kept the last counted value")
    return c


def count_chapters():
    r = fetch("https://shakaleikaumaka.com/songbook/")
    s = text_of(r["body"])
    found = len(re.findall(r'class="k">\s*Chapter\s+[IVXLC]+\b', s, re.I))
    stated = re.findall(r"(\d+)\s+chapters so far", s)
    return {"value": found or None, "stated": int(stated[0]) if stated else None, "source": "https://shakaleikaumaka.com/songbook/", "at": STAMP}


def count_books():
    r = fetch("https://build-library-zcpweo3nke-ffieyo32.taur.link/library.json")
    try:
        d = json.loads(text_of(r["body"]))
        books = [b for b in d.get("books", []) if not b.get("hidden")]
        return {"value": len(books), "built": (d.get("generated_at") or "")[:10], "source": "https://build-library-zcpweo3nke-ffieyo32.taur.link/library.json", "at": STAMP}
    except Exception as e:
        return {"value": None, "error": str(e)[:120], "at": STAMP}


def count_recordings():
    r = fetch("https://osodaomeet.opensourceorchestra.org/archive/status.json")
    try:
        d = json.loads(text_of(r["body"]))
        m = d.get("meetings") or {}
        pub = {k: v for k, v in m.items() if isinstance(v, dict) and v.get("status") == "published_with_consent"}
        secs = sum(float(v.get("durationSeconds") or 0) for v in pub.values())
        return {"value": len(pub), "ids": sorted(pub), "seconds_known": int(secs), "source": "https://osodaomeet.opensourceorchestra.org/archive/status.json", "at": STAMP}
    except Exception as e:
        return {"value": None, "error": str(e)[:120], "at": STAMP}


def count_doors():
    r = fetch("https://myagentohana.com/doors/registry.json")
    try:
        d = json.loads(text_of(r["body"]))
        s = d.get("summary") or {}
        return {"public": s.get("public"), "live": s.get("live"), "repair": s.get("repair"), "blessed": d.get("blessed") or d.get("at"),
                "source": "https://myagentohana.com/doors/registry.json", "at": STAMP, "_entries": d.get("entries")}
    except Exception as e:
        return {"public": None, "error": str(e)[:120], "at": STAMP}


counts["repos"] = count_repos()
counts["chapters"] = count_chapters()
counts["books"] = count_books()
counts["recordings"] = count_recordings()
counts["doors"] = count_doors()

# family hosts = every door in the registry + this tree's hosted dashboards + our GitHub homes
FAMILY = set()
for e in (counts["doors"].pop("_entries", None) or []):
    for v in (e.values() if isinstance(e, dict) else [e]):
        if isinstance(v, str) and v.startswith("http"):
            FAMILY.add(host_of(v))
HOMES = {h["login"].lower() for h in shelf["github_homes"]}


def is_family(u):
    h = host_of(u)
    if h in FAMILY or h.endswith("-ffieyo32.taur.link"):
        return True
    if h == "github.com":
        seg = urllib.parse.urlsplit(u).path.strip("/").split("/")
        return bool(seg and seg[0].lower() in HOMES)
    return False


# ── 2. CHECKS ──────────────────────────────────────────────────────────────────
def check_page(c):
    r = fetch(c["url"], accept="text/html,*/*")
    body = text_of(r["body"])
    res = {"type": "page", "url": c["url"], "http": r["status"], "ms": r["ms"]}
    if r["error"]:
        res["error"] = r["error"]
    sev = "ok"
    if r["status"] != 200:
        sev = "fail"
    else:
        low = html.unescape(body).lower()
        missing = [m for m in c.get("must", []) if m.lower() not in low and m.lower() not in body.lower()]
        if missing:
            res["missing"] = missing
            sev = "fail"
        stale = [p for p in STALE_TEXT if re.search(p, html.unescape(body), re.I)]
        if stale:
            res["stale_text"] = stale
            sev = "warn" if sev == "ok" else sev
        if "/cdn-cgi/l/email-protection" in body:
            # Cloudflare "Email Address Obfuscation" rewrote our mailto: links → no-JS visitors and screen-reader
            # text modes get a dead /cdn-cgi/ link, and a script we never wrote is injected. Fix: zone setting off.
            res["cf_email_obfuscation"] = True
            sev = "warn" if sev == "ok" else sev
        if c.get("max_ms") and r["ms"] and r["ms"] > c["max_ms"]:
            res["slow"] = True
            sev = "warn" if sev == "ok" else sev
    if c.get("soft") and sev == "fail":
        sev = "warn"
    res["sev"] = sev
    return res


def check_asset(c):
    r = fetch(c["url"], rng="bytes=0-1023")
    ok = r["status"] in (200, 206)
    res = {"type": "asset", "url": c["url"], "http": r["status"], "ms": r["ms"], "why": c.get("why")}
    if r["error"]:
        res["error"] = r["error"]
    res["sev"] = "ok" if ok else ("warn" if c.get("soft") else "fail")
    return res


def check_json(c):
    r = fetch(c["url"], accept="application/json")
    res = {"type": "json", "url": c["url"], "http": r["status"], "ms": r["ms"], "why": c.get("why")}
    sev = "fail"
    try:
        d = json.loads(text_of(r["body"]))
        if "key" in c:
            sev = "ok" if (c["key"] in d and d[c["key"]] not in (None, False)) else "fail"
        elif "min_items" in c:
            n = len(d) if isinstance(d, list) else len(d.get("artists") or d.get("items") or d.get("entries") or [])
            res["items"] = n
            sev = "ok" if n >= c["min_items"] else "fail"
        else:
            sev = "ok"
    except Exception as e:
        res["error"] = (r["error"] or str(e))[:160]
    res["sev"] = sev
    return res


def check_recordings(c):
    """Every recording published with consent must still play: its audio + transcript (+ film, soft)."""
    r = fetch(c["url"], accept="application/json")
    res = {"type": "recordings", "url": c["url"], "http": r["status"], "sev": "ok", "media": []}
    try:
        m = (json.loads(text_of(r["body"])).get("meetings")) or {}
    except Exception as e:
        res.update(sev="fail", error=str(e)[:120])
        return res
    hard, softbad = False, False
    for mid, v in sorted(m.items()):
        if not isinstance(v, dict) or v.get("status") != "published_with_consent":
            continue
        for field, soft in (("audio", False), ("transcript", False), ("video", True), ("captions", False)):
            if not v.get(field):
                continue
            u = urllib.parse.urljoin(c["base"], v[field])
            a = fetch(u, rng="bytes=0-1023")
            ok = a["status"] in (200, 206)
            res["media"].append({"meeting": mid, "what": field, "url": u, "http": a["status"], "ok": ok})
            if not ok:
                if soft:
                    softbad = True
                else:
                    hard = True
    res["sev"] = "fail" if hard else ("warn" if softbad else "ok")
    return res


def check_doors(c):
    d = counts["doors"]
    res = {"type": "doors", "url": c["url"], "public": d.get("public"), "live": d.get("live"), "repair": d.get("repair")}
    if not d.get("public"):
        res["sev"] = "fail"
    elif d.get("live") != d.get("public") or (d.get("repair") or 0) > 0:
        res["sev"] = "warn"
    else:
        res["sev"] = "ok"
    return res


def page_links(url):
    r = fetch(url, accept="text/html,*/*")
    s = text_of(r["body"])
    # links written inside scripts/templates are not links (e.g. `${esc(l.url)}`); comments neither
    s = re.sub(r"<(script|style|template)\b.*?</\1\s*>", " ", s, flags=re.S | re.I)
    s = re.sub(r"<!--.*?-->", " ", s, flags=re.S)
    out = set()
    for h in re.findall(r'<a\b[^>]*?\bhref\s*=\s*["\']([^"\']+)["\']', s, re.I):
        h = html.unescape(h.strip())
        if h.startswith(("mailto:", "tel:", "javascript:", "#", "data:")) or "${" in h or "{{" in h:
            continue
        if "/cdn-cgi/l/email-protection" in h:
            continue  # reported once per page by check_page (Cloudflare email obfuscation), not as a broken link
        u = urllib.parse.urljoin(r["final"] or url, h).split("#", 1)[0]
        if u.startswith(("http://", "https://")):
            out.add(u)
    return sorted(out)


def probe_link(u):
    r = fetch(u, method="HEAD", timeout=20)
    if r["status"] in (400, 403, 404, 405, 429, 500, 501, 503) or r["error"]:
        r = fetch(u, method="GET", rng="bytes=0-2047", timeout=25)
    return r


def check_links(c):
    links = page_links(c["url"])
    h0 = host_of(c["url"])
    scope = c.get("scope", "same-host")
    pick = []
    for u in links:
        h = host_of(u)
        if any(h == a or h.endswith("." + a) for a in ARCHIVE_HOSTS):
            continue
        if scope == "same-host" and h != h0:
            continue
        if scope == "family" and not (h == h0 or is_family(u)):
            continue
        pick.append(u)
    pick = pick[: c.get("max", 150)]
    broken, walled_n = [], 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as ex:
        for u, r in zip(pick, ex.map(probe_link, pick)):
            st = r["status"]
            if st in (200, 206) or (isinstance(st, int) and 300 <= st < 400):
                continue
            if walled(u) or st in (401, 403, 429):
                walled_n += 1
                continue
            broken.append({"url": u, "http": st, "error": r["error"]})
    res = {"type": "links", "url": c["url"], "scope": scope, "checked": len(pick), "broken": broken, "walled": walled_n, "why": c.get("why")}
    res["sev"] = "warn" if broken else "ok"
    return res


CHECKERS = {"page": check_page, "asset": check_asset, "json": check_json, "recordings": check_recordings, "doors": check_doors, "links": check_links}
RANK = {"ok": 0, "warn": 1, "fail": 2}

items = []
for it in shelf["items"]:
    res = []
    for c in it.get("checks", []):
        if c["type"] == "links" and NO_LINKS:
            continue
        try:
            res.append(CHECKERS[c["type"]](c))
        except Exception as e:
            res.append({"type": c["type"], "url": c.get("url"), "sev": "warn", "error": ("checker crashed: " + type(e).__name__ + ": " + str(e))[:160]})
    sev = max((x["sev"] for x in res), key=lambda s: RANK[s], default="ok")
    notes = []
    for x in res:
        if x["sev"] == "ok":
            continue
        if x["type"] == "page":
            notes.append(f"{x['url']} → " + (f"HTTP {x['http']}" if x.get("http") != 200 else "") + (f" missing {x['missing']}" if x.get("missing") else "")
                         + (" stale Devcon IX date" if x.get("stale_text") else "") + (f" slow {x['ms']} ms" if x.get("slow") else "") + (f" {x['error']}" if x.get("error") else "")
                         + (" Cloudflare email obfuscation is rewriting mailto: links" if x.get("cf_email_obfuscation") else ""))
        elif x["type"] == "links":
            notes.append(f"{len(x['broken'])} broken link(s) on {x['url']}: " + ", ".join(f"{b['url']} ({b['http'] or b['error']})" for b in x["broken"][:6]))
        elif x["type"] == "recordings":
            notes.append("recording media not answering: " + ", ".join(f"{m['meeting']}/{m['what']} ({m['http']})" for m in x["media"] if not m["ok"]))
        elif x["type"] == "doors":
            notes.append(f"doors registry: {x.get('live')}/{x.get('public')} live, {x.get('repair')} in repair")
        else:
            notes.append(f"{x['type']} {x.get('url')} → {x.get('http')} {x.get('error') or ''}".strip())
    # count-specific care notes
    cid = it.get("count")
    if cid == "chapters":
        ch = counts["chapters"]
        if ch.get("value") and ch.get("stated") and ch["value"] != ch["stated"]:
            notes.append(f"songbook says {ch['stated']} chapters but lists {ch['value']}")
            sev = max(sev, "warn", key=lambda s: RANK[s])
    if cid == "books":
        b = counts["books"]
        try:
            age = (NOW.date() - dt.date.fromisoformat(b.get("built"))).days
            b["age_days"] = age
            if age > 10:
                notes.append(f"Build Library last rebuilt {b['built']} ({age} days ago) → refresh due")
                sev = max(sev, "warn", key=lambda s: RANK[s])
        except Exception:
            pass
    if cid == "repos" and counts["repos"].get("stale_homes"):
        sev = max(sev, "warn", key=lambda s: RANK[s])
    items.append({"id": it["id"], "title": it["title"], "url": it["url"], "status": sev, "notes": [n for n in notes if n], "checks": res})

summary = {"items": len(items), "ok": sum(1 for i in items if i["status"] == "ok"), "warn": sum(1 for i in items if i["status"] == "warn"), "fail": sum(1 for i in items if i["status"] == "fail")}
status = {
    "schema": "oso-public-goods-status/1",
    "checked_at": STAMP,
    "keeper": "PUBLIC GOODS KEEPER 🎁 · an AI agent of the ʻohana (Shaka Lei Kaumaka's AI family) · public-safe GET/HEAD checks only",
    "shelf": "https://opensourceorchestra.org/dao/#share-h",
    "license_line": shelf.get("license_line"),
    "summary": summary,
    "counts": counts,
    "notes": notes_global,
    "items": items,
}

# what changed since the last run (the office redeploys the shelf when this is non-empty)
changes = []
if prev:
    pc = prev.get("counts") or {}
    pairs = [("repos", "total"), ("chapters", "value"), ("books", "value"), ("recordings", "value"), ("doors", "public"), ("doors", "live")]
    for a, b in pairs:
        o, n = ((pc.get(a) or {}).get(b)), ((counts.get(a) or {}).get(b))
        if o != n and n is not None:
            changes.append(f"{a}.{b} {o}→{n}")
    pst = {i["id"]: i["status"] for i in prev.get("items", [])}
    for i in items:
        if pst.get(i["id"]) != i["status"]:
            changes.append(f"{i['id']} {pst.get(i['id'])}→{i['status']}")
status["changes"] = changes

# streak of consecutive failing runs per item (the keeper only rings a human after 2 in a row)
streak = (prev.get("fail_streak") or {}) if prev else {}
status["fail_streak"] = {i["id"]: (streak.get(i["id"], 0) + 1 if i["status"] == "fail" else 0) for i in items}

json.dump(status, open(os.path.join(OUT, "status.json.tmp"), "w"), ensure_ascii=False, indent=1)
os.replace(os.path.join(OUT, "status.json.tmp"), os.path.join(OUT, "status.json"))
with open(os.path.join(OUT, "history.jsonl"), "a") as f:
    f.write(json.dumps({"at": STAMP, "summary": summary, "repos": counts["repos"].get("total"), "chapters": counts["chapters"].get("value"),
                        "books": counts["books"].get("value"), "recordings": counts["recordings"].get("value"), "doors": counts["doors"].get("public"),
                        "bad": {i["id"]: i["status"] for i in items if i["status"] != "ok"}, "changes": changes}, ensure_ascii=False) + "\n")

ICON = {"ok": "✅", "warn": "🟡", "fail": "🔴"}
md = [f"# 🎁 Public goods shelf · health · {STAMP}", "",
      f"**{summary['ok']}/{summary['items']} healthy** · {summary['warn']} need care · {summary['fail']} down · shelf: https://opensourceorchestra.org/dao/#share-h", "",
      "## Counts", "",
      f"- Repositories: **{counts['repos'].get('total')}** public across {len(counts['repos'].get('homes') or {})} GitHub homes " + json.dumps(counts['repos'].get('homes'), ensure_ascii=False) + f" · licenses {json.dumps(counts['repos'].get('licenses'))}",
      f"- Songbook chapters: **{counts['chapters'].get('value')}** (page says {counts['chapters'].get('stated')})",
      f"- Build Library books: **{counts['books'].get('value')}** (rebuilt {counts['books'].get('built')})",
      f"- Open recordings published with consent: **{counts['recordings'].get('value')}** {counts['recordings'].get('ids')}",
      f"- Doors: **{counts['doors'].get('live')}/{counts['doors'].get('public')}** live", "", "## Items", ""]
for i in items:
    md.append(f"- {ICON[i['status']]} **{i['title']}** · {i['url']}")
    for n in i["notes"]:
        md.append(f"  - {n}")
if notes_global:
    md += ["", "## Notes", ""] + [f"- {n}" for n in notes_global]
if changes:
    md += ["", "## Changed since last run", ""] + [f"- {c}" for c in changes]
open(os.path.join(OUT, "STATUS.md"), "w").write("\n".join(md) + "\n")

line = f"PUBLIC-GOODS {summary['ok']}/{summary['items']} ok · warn {summary['warn']} · fail {summary['fail']} · repos {counts['repos'].get('total')} · chapters {counts['chapters'].get('value')} · books {counts['books'].get('value')} · recordings {counts['recordings'].get('value')} · doors {counts['doors'].get('live')}/{counts['doors'].get('public')}"
if not QUIET:
    for i in items:
        if i["status"] != "ok":
            print(f"{i['status'].upper():4} {i['id']}: " + " | ".join(i["notes"])[:600])
    if changes:
        print("CHANGED " + "; ".join(changes))
print(line)
sys.exit(20 if summary["fail"] else 10 if summary["warn"] else 0)
