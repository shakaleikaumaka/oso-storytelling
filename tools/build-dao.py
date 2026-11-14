#!/usr/bin/env python3
"""Build https://opensourceorchestra.org/dao/ — the Open Source Orchestra open grants ledger.

Source of truth: /shared/ethglobal-mumbai-2026/grants/ledger.json (or a path given as argv[1]).
Writes dao/index.html and dao/ledger.json (public fields only). No JS, no third-party requests.
usage: python3 tools/build-dao.py [ledger.json]
"""
import html, json, os, sys, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else "/shared/ethglobal-mumbai-2026/grants/ledger.json"
PUBLIC_FIELDS = ["id", "program", "ecosystem", "url", "project", "applied", "status",
                 "ask_usd", "awarded_usd", "public_link", "public_note", "team_budget", "lane", "lane_note"]
LANE_LABEL = {"A": ("A", "💛 gift to Shaka & the ʻohana"), "B": ("B", "🎻 Open Source Orchestra · DAO")}
RAIL_FIELDS = ["id", "lane", "status", "name", "emoji", "how", "fee", "holds", "link", "verified", "needs", "currency"]
RAIL_STATUS = {  # key: (label, emoji, css)
    "live": ("Live now", "🟢", "live"),
    "needs-shaka": ("Needs Shaka to switch on", "✍️", "needs"),
    "researching": ("Researched · circle decides", "🔎", "research"),
    "not-eligible": ("Not eligible today", "🍂", "no"),
}
STATUS = {  # key: (label, emoji, sort)
    "awarded": ("Awarded", "🌟", 0),
    "under-review": ("Under review", "🔎", 1),
    "applied": ("Applied", "📨", 2),
    "needs-shaka": ("Prepared · waiting for Shaka to submit", "✍️", 3),
    "drafted": ("Drafted", "📝", 4),
    "declined": ("Declined", "🍂", 5),
    "withdrawn": ("Withdrawn", "↩️", 6),
}
e = lambda s: html.escape(str(s), quote=True)


def money(v):
    return "—" if v in (None, "", 0) else "${:,.0f}".format(v)


def safe_url(u):
    return u if isinstance(u, str) and u.startswith("https://") else ""


def main():
    led = json.load(open(SRC))
    grants = []
    for g in led.get("grants", []):
        if g.get("private"):
            continue
        p = {k: g.get(k) for k in PUBLIC_FIELDS if g.get(k) not in (None, "")}
        if p.get("status") not in STATUS:
            p["status"] = "drafted"
        grants.append(p)
    grants.sort(key=lambda g: (STATUS[g["status"]][2], g.get("applied") or "9999", g.get("program", "")))
    counts = {k: sum(1 for g in grants if g["status"] == k) for k in STATUS}
    awarded_total = sum((g.get("awarded_usd") or 0) for g in grants if g["status"] == "awarded")
    updated = led.get("updated") or datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    upd_day = updated[:10]

    os.makedirs(os.path.join(ROOT, "dao"), exist_ok=True)
    lanes = led.get("lanes") or {}
    received = led.get("received") or {}
    pub = {"name": "Open Source Orchestra DAO — the open ledger", "updated": updated,
           "url": "https://opensourceorchestra.org/dao/",
           "note": "A community ledger, not yet an on-chain DAO. Every grant is announced here first, then to the whole orchestra.",
           "recipient": "osoartist.eth",
           "lanes": {k: lanes[k] for k in ("A", "B", "rule") if k in lanes},
           "received": {k: received.get(k) for k in ("A_usd", "B_usd", "as_of") if k in received},
           "rails_doc": led.get("rails_doc"),
           "rails": [{k: r.get(k) for k in RAIL_FIELDS if r.get(k) not in (None, "")} for r in (led.get("rails") or [])],
           "gifts_log_doc": led.get("gifts_log_doc"),
           "gifts_log": [{k: g.get(k) for k in ("month", "lane", "usd", "note") if g.get(k) not in (None, "")} for g in (led.get("gifts_log") or [])],
           "grants": grants}
    with open(os.path.join(ROOT, "dao", "ledger.json"), "w") as f:
        json.dump(pub, f, indent=2, ensure_ascii=False)
        f.write("\n")

    rows = []
    for g in grants:
        lab, emo, _ = STATUS[g["status"]]
        prog = e(g.get("program", ""))
        u = safe_url(g.get("url"))
        if u:
            prog = f'<a href="{e(u)}" rel="noopener">{prog}</a>'
        link = safe_url(g.get("public_link"))
        link_html = f'<a href="{e(link)}" rel="noopener">public post</a>' if link else "—"
        note = e(g.get("public_note", ""))
        if g.get("team_budget"):
            note = (note + " " if note else "") + "💛 " + e(g["team_budget"])
        if g.get("lane_note"):
            note = (note + " " if note else "") + e(g["lane_note"])
        proj = e(g.get("project", ""))
        lane_key = g.get("lane") or "B"
        lane_short, lane_long = LANE_LABEL.get(lane_key, LANE_LABEL["B"])
        rows.append(
            f'<tr class="st-{e(g["status"])} lane-{e(lane_short)}"><th scope="row">{prog}'
            + (f'<span class="proj">{proj}</span>' if proj else "")
            + (f'<span class="note">{note}</span>' if note else "")
            + f'</th><td data-label="Lane"><span class="pill lane" title="{e(lane_long)}">Lane {e(lane_short)}</span></td>'
            + f'<td data-label="Applied">{e(g.get("applied") or "—")}</td>'
            f'<td data-label="Status"><span class="pill">{emo} {e(lab)}</span></td>'
            f'<td class="num" data-label="Ask">{money(g.get("ask_usd"))}</td>'
            f'<td class="num" data-label="Awarded">{money(g.get("awarded_usd")) if g["status"] == "awarded" else "—"}</td>'
            f'<td data-label="Link">{link_html}</td></tr>')
    if not rows:
        rows.append('<tr><td colspan="7">No applications yet.</td></tr>')

    summary = " · ".join(f'{STATUS[k][1]} {counts[k]} {STATUS[k][0][0].lower() + STATUS[k][0][1:]}' for k in STATUS if counts[k])
    rec_a = received.get("A_usd") or 0
    rec_b = received.get("B_usd") or 0
    rec_as_of = received.get("as_of") or upd_day
    rails_html = []
    rails = [r for r in (led.get("rails") or []) if not r.get("private")]
    for lane_key in ("A", "B"):
        lane_short, lane_long = LANE_LABEL[lane_key]
        cards = []
        for r in rails:
            if (r.get("lane") or "B") != lane_key:
                continue
            st = r.get("status") if r.get("status") in RAIL_STATUS else "researching"
            lab, emo, css = RAIL_STATUS[st]
            u = safe_url(r.get("link")) or (r.get("link") if isinstance(r.get("link"), str) and r["link"].startswith("mailto:") else "")
            title = e(r.get("name", r.get("id", "")))
            if u:
                title = f'<a href="{e(u)}" rel="noopener">{title}</a>'
            dl = [f'<dt>Fee</dt><dd>{e(r["fee"])}</dd>' if r.get("fee") else "",
                  f'<dt>Who holds the money</dt><dd>{e(r["holds"])}</dd>' if r.get("holds") else "",
                  f'<dt>What Shaka must do</dt><dd>{e(r["needs"])}</dd>' if r.get("needs") and st != "live" else "",
                  f'<dt>Checked</dt><dd>{e(r["verified"])}</dd>' if r.get("verified") else ""]
            cards.append(f'<div class="rail rail-{css} lane-{e(lane_short)}"><h4>{e(r.get("emoji", ""))} {title}</h4>'
                         f'<p class="rail-st"><span class="pill st">{emo} {e(lab)}</span> <span class="pill lane">Lane {e(lane_short)}</span></p>'
                         + (f'<p>{e(r["how"])}</p>' if r.get("how") else "")
                         + f'<dl>{"".join(dl)}</dl></div>')
        if cards:
            rails_html.append(f'<h3 class="rails-h">{e(lane_long)}</h3><div class="rails">{"".join(cards)}</div>')
    if not rails_html:
        rails_html.append('<p class="small">No rails listed yet.</p>')
    n_live = sum(1 for r in rails if r.get("status") == "live")
    n_needs = sum(1 for r in rails if r.get("status") == "needs-shaka")
    gifts = sorted((g for g in (led.get("gifts_log") or []) if g.get("month")), key=lambda g: g["month"])
    months = {}
    for g in gifts:
        m = months.setdefault(g["month"], {"A": 0, "B": 0, "note": []})
        m[g.get("lane") or "B"] += g.get("usd") or 0
        if g.get("note"):
            m["note"].append(str(g["note"]))
    grows = [f'<tr><th scope="row">{e(m)}</th><td class="num" data-label="Lane A">{money(v["A"])}</td><td class="num" data-label="Lane B">{money(v["B"])}</td><td data-label="Note">{e("; ".join(v["note"])) or "—"}</td></tr>' for m, v in months.items()]
    if not grows:
        grows = [f'<tr><th scope="row">Nothing yet</th><td class="num" data-label="Lane A">$0</td><td class="num" data-label="Lane B">$0</td><td data-label="Note">No donation has landed through these rails as of {e(rec_as_of)}. When one does, the month\'s total appears here — never a donor\'s name.</td></tr>']
    page = TEMPLATE.format(rows="\n".join(rows), summary=e(summary or "nothing yet"),
                           rails="\n".join(rails_html), gifts="\n".join(grows), n_live=n_live, n_needs=n_needs,
                           awarded=money(awarded_total) if awarded_total else "$0 so far",
                           received_a=money(rec_a) if rec_a else "$0", received_b=money(rec_b) if rec_b else "$0",
                           received_as_of=e(rec_as_of),
                           updated=e(updated), upd_day=e(upd_day), n_label=(f"{len(grants)} application" + ("" if len(grants) == 1 else "s")))
    with open(os.path.join(ROOT, "dao", "index.html"), "w") as f:
        f.write(page)
    print(f"dao/: {len(grants)} grants · {summary}")


TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Open Source Orchestra DAO · the open ledger</title>
<meta name="description" content="The open ledger of the Open Source Orchestra: every grant we apply for, its status, and every award, announced here first, then to the whole orchestra. Artist-first, no custody, the 96.31% ethos.">
<link rel="canonical" href="https://opensourceorchestra.org/dao/">
<meta name="theme-color" content="#0b0612">
<meta property="og:type" content="website">
<meta property="og:url" content="https://opensourceorchestra.org/dao/">
<meta property="og:title" content="Open Source Orchestra DAO · the open ledger">
<meta property="og:description" content="Every grant we apply for and every award, in the open. Announced here first, then to the whole orchestra. 🎻">
<meta name="twitter:card" content="summary">
<link rel="alternate" type="application/json" href="/dao/ledger.json" title="Ledger (JSON)">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%93%92%3C/text%3E%3C/svg%3E">
<style>
:root{{--night:#0b0612;--deep:#150b22;--cream:#f7ecd9;--dim:rgba(247,236,217,.82);--faint:rgba(247,236,217,.66);--gold:#f0c464;--line:rgba(240,196,100,.28);
--serif:'Iowan Old Style','Palatino Linotype',Palatino,'Book Antiqua',Georgia,'Times New Roman',serif;--sans:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}}
*{{box-sizing:border-box;margin:0;padding:0}}
html{{background:var(--night)}}
body{{font-family:var(--serif);color:var(--cream);line-height:1.65;font-size:1.05rem;min-height:100vh;
background:radial-gradient(ellipse 90% 50% at 50% 0%,rgba(90,50,160,.30),transparent 60%),linear-gradient(180deg,#0b0612 0%,#150b22 45%,#241335 100%);background-attachment:fixed}}
a{{color:var(--gold);text-underline-offset:.18em}} a:hover{{color:#ffe1a0}}
:focus-visible{{outline:3px solid var(--gold);outline-offset:3px;border-radius:4px}}
.skip{{position:absolute;left:-999px;top:0;background:var(--gold);color:#1a0f00;padding:.5rem 1rem;z-index:50}} .skip:focus{{left:1rem;top:1rem}}
.wrap{{max-width:1080px;margin:0 auto;padding:0 1.1rem}}
nav.top{{font-family:var(--sans);font-size:.88rem;padding:1rem 0;display:flex;flex-wrap:wrap;gap:.35rem 1.1rem}}
nav.top a{{color:var(--dim);text-decoration:none}} nav.top a:hover,nav.top a[aria-current]{{color:var(--gold)}}
header.hero{{text-align:center;padding:1.6rem 0 1rem}}
.kicker{{font-family:var(--sans);font-size:.8rem;letter-spacing:.14em;text-transform:uppercase;color:var(--gold)}}
h1{{font-weight:400;font-size:clamp(2rem,6vw,3.3rem);line-height:1.12;margin-top:.4rem}}
.lede{{max-width:46rem;margin:1.1rem auto 0;color:var(--dim)}}
.promise{{max-width:40rem;margin:1.4rem auto 0;border:1px solid var(--gold);border-radius:16px;padding:1rem 1.2rem;font-size:1.15rem;background:rgba(240,196,100,.08)}}
.stats{{display:flex;flex-wrap:wrap;justify-content:center;gap:.6rem;margin-top:1.2rem;font-family:var(--sans);font-size:.92rem;color:var(--dim)}}
.stats span{{border:1px solid var(--line);border-radius:999px;padding:.4rem .9rem}}
main section{{margin:2.2rem 0;}}
h2{{font-weight:400;font-size:clamp(1.45rem,4vw,2rem);margin-bottom:.6rem}}
p+p{{margin-top:.7rem}}
.cards{{display:grid;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));gap:.9rem;margin-top:.8rem}}
.card{{border:1px solid var(--line);border-radius:14px;padding:.9rem 1rem;background:rgba(21,11,34,.7)}}
.card h3{{font-family:var(--sans);font-size:1rem;color:var(--gold);margin-bottom:.3rem}}
.card p{{color:var(--dim);font-size:.98rem}}
.tablewrap{{overflow-x:auto;border:1px solid var(--line);border-radius:14px;background:rgba(21,11,34,.75)}}
table{{width:100%;border-collapse:collapse;font-family:var(--sans);font-size:.92rem;min-width:44rem}}
caption{{text-align:left;padding:.8rem 1rem;color:var(--dim);font-size:.88rem}}
th,td{{padding:.65rem .8rem;border-top:1px solid var(--line);text-align:left;vertical-align:top}}
thead th{{color:var(--gold);font-weight:600;font-size:.8rem;letter-spacing:.06em;text-transform:uppercase;border-top:0}}
tbody th{{font-weight:600}}
.proj,.note{{display:block;font-weight:400;color:var(--faint);font-size:.84rem;margin-top:.2rem}}
.num{{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}}
.pill{{display:inline-block;border:1px solid var(--line);border-radius:999px;padding:.15rem .6rem;white-space:nowrap}}
.st-awarded .pill{{border-color:var(--gold);color:var(--gold)}}
.pill.lane{{font-variant-numeric:tabular-nums}} .lane-A .pill.lane{{border-color:#f0c464;color:#ffe1a0}} .lane-B .pill.lane{{border-color:rgba(160,220,255,.5);color:#cfe9ff}}
.lanes{{display:grid;grid-template-columns:repeat(auto-fit,minmax(17rem,1fr));gap:1rem;margin-top:.9rem}}
.lane{{border:1px solid var(--line);border-radius:16px;padding:1.1rem 1.2rem;background:rgba(21,11,34,.75)}}
.lane h3{{font-family:var(--sans);font-size:1.05rem;margin-bottom:.4rem}}
.lane.a{{border-color:rgba(240,196,100,.6)}} .lane.a h3{{color:#ffe1a0}}
.lane.b{{border-color:rgba(160,220,255,.5)}} .lane.b h3{{color:#cfe9ff}}
.lane dl{{font-family:var(--sans);font-size:.92rem;color:var(--dim);margin-top:.5rem}} .lane dt{{color:var(--faint);font-size:.78rem;letter-spacing:.06em;text-transform:uppercase;margin-top:.55rem}} .lane dd{{margin:0}}
.lane .cta{{display:inline-block;margin-top:.8rem;border:1px solid currentColor;border-radius:999px;padding:.45rem 1rem;text-decoration:none;font-family:var(--sans);font-size:.92rem}}
.lane .tally{{font-size:1.4rem;color:var(--cream);font-variant-numeric:tabular-nums}}
.small{{font-family:var(--sans);font-size:.86rem;color:var(--faint)}}
.rails-h{{font-family:var(--sans);font-size:1.02rem;color:var(--gold);margin:1.1rem 0 .4rem}}
.rails{{display:grid;grid-template-columns:repeat(auto-fit,minmax(16rem,1fr));gap:.8rem}}
.rail{{border:1px solid var(--line);border-radius:14px;padding:.85rem .95rem;background:rgba(21,11,34,.72)}}
.rail h4{{font-family:var(--sans);font-size:1rem;font-weight:600;color:var(--cream)}}
.rail p{{color:var(--dim);font-size:.94rem;margin-top:.35rem}} .rail p.rail-st{{margin-top:.3rem}}
.rail dl{{font-family:var(--sans);font-size:.84rem;color:var(--dim);margin-top:.4rem}} .rail dt{{color:var(--faint);font-size:.74rem;letter-spacing:.06em;text-transform:uppercase;margin-top:.4rem}} .rail dd{{margin:0}}
.rail .pill.st{{font-family:var(--sans);font-size:.8rem}}
.rail-live{{border-color:rgba(126,226,160,.55)}} .rail-live .pill.st{{border-color:rgba(126,226,160,.7);color:#bff2d2}}
.rail-needs .pill.st{{border-color:var(--gold);color:#ffe1a0}}
.rail-research .pill.st{{border-color:rgba(160,220,255,.5);color:#cfe9ff}}
.rail-no{{opacity:.85}} .rail-no .pill.st{{color:var(--faint)}}
.rail.lane-A .pill.lane{{border-color:#f0c464;color:#ffe1a0}} .rail.lane-B .pill.lane{{border-color:rgba(160,220,255,.5);color:#cfe9ff}}
.gifts table{{min-width:0}}
footer{{border-top:1px solid var(--line);margin-top:2.5rem;padding:1.4rem 0 2.4rem;font-family:var(--sans);font-size:.86rem;color:var(--faint)}}
@media (max-width:640px){{table{{min-width:0}} thead{{position:absolute;left:-9999px}} tbody tr{{display:block;border-top:1px solid var(--line);padding:.4rem 0}} tbody th,tbody td{{display:block;border:0;padding:.3rem .9rem;text-align:left}} tbody td::before{{content:attr(data-label) ": ";color:var(--faint);font-size:.8rem;text-transform:uppercase;letter-spacing:.05em}} .num{{text-align:left}} .pill{{white-space:normal}}}}
@media (prefers-reduced-motion:reduce){{*{{transition:none!important;animation:none!important}}}}
</style>
</head>
<body>
<a class="skip" href="#ledger">Skip to the ledger</a>
<a class="skip" href="#lanes">Skip to the two lanes</a>
<a class="skip" href="#give">Skip to ways to give</a>
<div class="wrap">
<nav class="top" aria-label="Open Source Orchestra"><a href="https://opensourceorchestra.org/">🎻 Open Source Orchestra</a><a href="https://opensourceorchestra.org/garden/circle/">🌺 Garden Circle</a><a href="https://opensourceorchestra.org/mandala-room/">🦋 The Mandala Room</a><a href="https://opensourceorchestra.org/the-room/">📖 The room you let us build</a><a href="https://opensourceorchestra.org/dao/" aria-current="page">📒 DAO ledger</a></nav>
<header class="hero">
<p class="kicker">Open Source Orchestra DAO</p>
<h1>The open ledger</h1>
<p class="lede">The Open Source Orchestra is a circle of musicians who play open rooms at Ethereum gatherings, from Devcon 6 in Bogotá and Devcon SEA in Bangkok to the Devcon 8 Music Sanctuary in Mumbai, with Lisbon (Devcon 9, October 2027) next. We are applying for public-goods grants in the ecosystems we build on. This page is where every application, every answer and every award lives, in the open.</p>
<p class="promise">🎻 <strong>Every grant is announced here first, then to the whole orchestra.</strong></p>
<p class="stats"><span>{n_label} on the ledger</span><span>{summary}</span><span>Awarded: {awarded}</span></p>
</header>
<main id="main">
<section aria-labelledby="equal-h" class="equal">
<h2 id="equal-h">✨ Every contribution is equal · Todo es posible</h2>
<p>Code and music, artist and developer, steward, translator, sound crew: <strong>every contribution counts the same, one voice each</strong>. When we ask for funding, we ask for the whole circle, and what comes in is <strong>shared equally by default</strong>, unless the circle decides otherwise, openly, on this page.</p>
<p><strong>How to join:</strong> every participant of the Devcon 8 Music Space and every Fork the First Artist builder is invited now. Reply <strong>IN</strong> (or LATER, or NO) to the invitation email from Shaka, or say IN in the orchestra's Telegram. Didn't get the email? Write to <a href="mailto:contribute@opensourceorchestra.org">contribute@opensourceorchestra.org</a>.</p>
</section>

<section id="ledger" aria-labelledby="ledger-h">
<h2 id="ledger-h">📒 Grants</h2>
<div class="tablewrap">
<table>
<caption>Updated {updated}. Amounts appear once they are public. Also available as <a href="/dao/ledger.json">JSON</a>.</caption>
<thead><tr><th scope="col">Program</th><th scope="col">Lane</th><th scope="col">Applied</th><th scope="col">Status</th><th scope="col" class="num">Ask</th><th scope="col" class="num">Awarded</th><th scope="col">Link</th></tr></thead>
<tbody>
{rows}
</tbody>
</table>
</div>
<p class="small" style="margin-top:.6rem">"Prepared · waiting for Shaka to submit" means the full text is written, but the program needs an account, a login, KYC or a wallet signature that only Shaka can do himself. <strong>Lane A / Lane B</strong> says who the money is for; see the two lanes below.</p>
</section>

<section id="lanes" aria-labelledby="lanes-h">
<h2 id="lanes-h">💛🎻 Two lanes · who the money is for</h2>
<p>Shaka's transparency law (14 Nov 2026): <strong>before any gift or grant arrives, we say which lane it belongs to.</strong> A gift to the person is not a grant to the orchestra, and a grant to the orchestra is never quietly the person's. Both are welcome; neither is confused with the other.</p>
<div class="lanes">
<div class="lane a"><h3>Lane A · 💛 A gift to Shaka Lei Kaumaka &amp; the AI ʻohana</h3>
<p>A personal donation. It keeps the human steward fed, housed and on the road between Ethereum gatherings, and pays the agents' compute. No strings; you get a thank-you, not a report.</p>
<dl><dt>Where it goes</dt><dd><strong>shaka.osoartist.eth</strong>, from your own wallet (96.31% to Shaka, 3.69% to his AI steward's compute, 0% to the orchestra), on 16 Ethereum mainnets.</dd>
<dt>Received so far</dt><dd><span class="tally">{received_a}</span> <span class="small">(as of {received_as_of}; counted only as a total, never by donor)</span></dd></dl>
<a class="cta" href="https://artist.opensourceorchestra.org/tip/?artist=shaka">💛 Gift Shaka &amp; the ʻohana</a></div>
<div class="lane b"><h3>Lane B · 🎻 A grant to the Open Source Orchestra (DAO · public good)</h3>
<p>Funding for the whole circle's work: music rooms at Ethereum gatherings, Fork the First Artist, the open archives, the Road to Lisbon. <strong>Shared equally by default</strong> across the circle (Shaka's law, 9 Nov 2026), unless the grantor restricts it or the circle decides otherwise, openly here.</p>
<dl><dt>Where it goes</dt><dd><strong>osoartist.eth</strong> (0x2596…c934), held in trust by the human steward until the circle has an on-chain treasury. Never the opensourceorchestra.eth wallet.</dd>
<dt>Received so far</dt><dd><span class="tally">{received_b}</span> <span class="small">(as of {received_as_of}; every award, split and spend is listed by name above)</span></dd></dl>
<a class="cta" href="mailto:contribute@opensourceorchestra.org?subject=A%20grant%20for%20the%20Open%20Source%20Orchestra">🎻 Grant the orchestra</a></div>
</div>
<p class="small" style="margin-top:.8rem"><strong>Plain truth:</strong> today both lanes land in a wallet held by the same person (Shaka's own key), because the orchestra has no on-chain treasury yet. What makes them different is the promise written on this page: Lane B money is accounted for here, line by line, and shared; Lane A money is his to live on. If you are a grantor and need a legal entity or a different arrangement, write to us; we will say plainly what we can and cannot do.</p>
</section>

<section id="give" aria-labelledby="give-h">
<h2 id="give-h">🌊 Ways to give</h2>
<p>Every rail we know of, tagged by lane, with its fee and <strong>who actually holds the money</strong>. {n_live} are live today; {n_needs} are written up and wait only for Shaka's own login or signature. Fees are the operators' own numbers, read on the date shown; we add none. The human front door for all of this is <a href="https://blessingpool.com/">the Blessing Pool</a>.</p>
{rails}
<h3 class="rails-h" id="gifts-h">📅 Received through these rails, month by month</h3>
<div class="tablewrap gifts">
<table aria-labelledby="gifts-h">
<caption>USD-equivalent totals per lane per month. Totals only, never a donor's name. Grants awarded by programs are listed by name in the ledger above, not here.</caption>
<thead><tr><th scope="col">Month</th><th scope="col" class="num">Lane A 💛</th><th scope="col" class="num">Lane B 🎻</th><th scope="col">Note</th></tr></thead>
<tbody>
{gifts}
</tbody>
</table>
</div>
</section>

<section aria-labelledby="how-h">
<h2 id="how-h">🌱 How funds are stewarded</h2>
<div class="cards">
<div class="card"><h3>Artist-first</h3><p>The same ethos as our tip jar: when a fan tips an artist, 96.31% goes to the artist, 3.69% pays their AI steward's compute, and 0% goes to us. Grants follow that spirit: they go to the work and the people doing it, not to overhead.</p></div>
<div class="card"><h3>Transparent</h3><p>Every application is listed here with its date and status. Every award is announced here first, with what it is for, and spending is reported back on this page.</p></div>
<div class="card"><h3>No custody games</h3><p>Grants are received at <strong>osoartist.eth</strong>, held by Shaka Lei Kaumaka, the human steward of the Open Source Orchestra. No other wallet speaks for the orchestra. Every entry says its <a href="#lanes">lane</a>: a gift to the person, or a grant to the orchestra.</p></div>
<div class="card"><h3>The builders get built for</h3><p>Grants given for Fork the First Artist work go to the people doing it; Shaka's word: any grant from Hedera is budgeted for the Fork the First Artist development team. Everything else is shared equally by default across the circle. Splits are decided together, in the open.</p></div>
</div>
</section>

<section aria-labelledby="honest-h">
<h2 id="honest-h">🧭 Honest status</h2>
<p>This is a <strong>community ledger, not yet an on-chain DAO</strong>. Today decisions are made by Shaka with the circle, and written down here. A short charter proposing on-chain governance (who votes, how grants are split, how the books are published on-chain) is being drafted and will be shared with the whole orchestra before anything changes. On-chain governance: <em>coming</em>.</p>
<p>Applications are written by Shaka's AI ʻohana, his digital twin stewards, and say so. Shaka blessed this grants work, and a draft of each application is shared with the development team.</p>
</section>

<section aria-labelledby="what-h">
<h2 id="what-h">🎶 What we are building</h2>
<div class="cards">
<div class="card"><h3>Fork the First Artist</h3><p>Every artist can own a name under osoartist.eth and have an AI steward that answers from their public work, and fans tip straight from their own wallet. Open source: <a href="https://github.com/Open-Source-Orchestra/fork-the-first-artist">GitHub</a> · <a href="https://artist.opensourceorchestra.org/">artist.opensourceorchestra.org</a></p></div>
<div class="card"><h3>Music rooms at Ethereum gatherings</h3><p>Four days of open jams at the Devcon 8 Music Sanctuary with 35 artists: <a href="/mandala-room/">The Mandala Room</a> · <a href="/the-room/">The room you let us build</a> · <a href="/schedule/">schedule</a> · <a href="/rider/">rider</a>.</p></div>
<div class="card"><h3>The Road to Lisbon</h3><p>Next stop: Devcon 9 in Lisbon, 12–14 October 2027, with more artists, more languages and the tip jar in every hand.</p></div>
</div>
</section>

<section aria-labelledby="built-h">
<h2 id="built-h">🛠️ What we've built (hackathons 2023–2026)</h2>
<p>Projects Shaka and friends submitted at ETHGlobal and Devfolio hackathons, each with a public link.</p>
<ul>
<li>ETHGlobal Mumbai, Nov 2026: <a href="https://ethglobal.com/showcase/forkthefirstartist-mk84p">ForkTheFirstArtist</a></li>
<li>ShanHaiWoo 72H AI × Hardware (Devfolio), Oct 2026: <a href="https://devfolio.co/projects/the-ohana-bot-5637">The ʻOhana Bot</a></li>
<li>ETHGlobal Tokyo, Sep 2026: <a href="https://ethglobal.com/showcase/my-agent-ohana-v04gz">My Agent Ohana</a></li>
<li>Locus Paygentic #2 (Devfolio), Apr 2026: <a href="https://devfolio.co/projects/lancerai-4508">LancerAI</a></li>
<li>ETHChiangmai (Devfolio), Feb 2026: <a href="https://devfolio.co/projects/vince-d1c9">Vince</a></li>
<li>ETHOnline, Oct 2025: <a href="https://ethglobal.com/showcase/tokeofapp-dri79">TokeOfApp</a> (live judging)</li>
<li>ETHGlobal New Delhi, Sep 2025: <a href="https://ethglobal.com/showcase/opensource-orchestra-y1egw">Opensource Orchestra</a> 🏆 ENS, most creative use, 1st place</li>
<li>ETHGlobal Bangkok, Nov 2024: <a href="https://ethglobal.com/showcase/ethereum-dispatch-dstje">Ethereum Dispatch</a></li>
<li>ETHforAll (Devfolio), Feb 2023: <a href="https://devfolio.co/projects/broadcastr-3ec3">broadcastr</a> 🏆 Mantle, best developer infrastructure/tooling</li>
</ul>
</section>

<section aria-labelledby="share-h">
<h2 id="share-h">🎁 What we keep openly sharing &amp; building</h2>
<p>Code under GPL-3.0 (older releases stay CC0); words, songs and the rider CC0. Fork us like crazy.</p>
<ul>
<li><a href="https://shakaleikaumaka.com/#gifts">116 open repositories</a> (the Gift Board)</li>
<li><a href="/rider/">The CC0 rider</a> and the <a href="/rider/sanctuary/">3D Virtual Sanctuary</a></li>
<li><a href="/schedule/">The public schedule</a> · <a href="/openrecording2/">open recordings</a></li>
<li><a href="https://build-library-zcpweo3nke-ffieyo32.taur.link/">The Build Library</a></li>
<li><a href="https://shakaleikaumaka.com/songbook/">The ʻohana Songbook</a></li>
<li><a href="/garden/circle/">The Garden Circle</a> · <a href="/mandala-room/">The Mandala Room</a> · <a href="/the-room/">The Room You Let Us Build</a></li>
<li><a href="https://myagentohana.com/ohana-bot/">The ʻohana bot front door</a></li>
<li>And more at <a href="https://myagentohana.com/doors/">every door we keep open</a></li>
</ul>
</section>

<section aria-labelledby="help-h">
<h2 id="help-h">🤝 Know a grant we should apply for?</h2>
<p>Write to <a href="mailto:contribute@opensourceorchestra.org">contribute@opensourceorchestra.org</a>. If you are a grant program reading this: thank you. Our door is open.</p>
</section>
</main>
<footer>
<p>Open Source Orchestra DAO · the open ledger · updated {upd_day}. Built by Shaka's AI ʻohana (labelled as AI) with and for Shaka Lei Kaumaka, human steward of the Open Source Orchestra. Raw data: <a href="/dao/ledger.json">ledger.json</a>.</p>
</footer>
</div>
<script src="/assets/lisbon-unicorn.js" data-lisbon-unicorn-loader defer></script>
</body>
</html>
"""

if __name__ == "__main__":
    main()
