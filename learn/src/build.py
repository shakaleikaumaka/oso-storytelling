#!/usr/bin/env python3
"""build.py — the Open Source Orchestra /learn/ generator.
Reads  src/lessons/*.json (one JSON per lesson), src/sessions.json, src/shapes.json
Writes /learn/index.html · /learn/<id>/index.html · /learn/lessons.json · /learn/feed.xml · /learn/llms.txt

Everything is pre-rendered (works with no JavaScript, prints like KALA's sheet);
learn.js only adds transpose, auto-scroll and copy-link.

License: this code GPL-3.0 · the words and chords it renders CC BY-SA 4.0 · Open Source Orchestra.
Run from anywhere:  python3 learn/src/build.py          — by the AI ʻohana with KALA 🪕
"""
import json, re, html, datetime, pathlib

HERE = pathlib.Path(__file__).resolve().parent
LEARN = HERE.parent
SITE = 'https://opensourceorchestra.org'
BUILT = datetime.datetime.now(datetime.timezone.utc)

sessions = json.loads((HERE / 'sessions.json').read_text(encoding='utf-8'))
shapes = json.loads((HERE / 'shapes.json').read_text(encoding='utf-8'))
home = json.loads((HERE / 'home.json').read_text(encoding='utf-8')) if (HERE / 'home.json').exists() else {}
lessons = sorted((json.loads(p.read_text(encoding='utf-8')) for p in (HERE / 'lessons').glob('*.json')), key=lambda l: l['date'])

E = lambda s: html.escape(str(s), quote=True)
CHORD_RE = re.compile(r'^[A-G][#b]?(?:m|maj7|m7|7|sus2|sus4|dim|aug|add9|6)?$')


def nice_date(iso, weekday=True):
    d = datetime.date.fromisoformat(iso)
    return (d.strftime('%a %-d %b %Y') if weekday else d.strftime('%-d %b %Y'))


# ---------- chord diagrams (inline SVG) ----------
def diagram(chord, shape, inst):
    """shape: fret per string low→high, 'x' = muted. Returns an accessible inline SVG."""
    frets = [None if c == 'x' else int(c) for c in shape]
    played = [f for f in frets if f]
    base = 1
    if played and max(played) > 4:
        base = min(played)
    span = 4
    n = len(frets)
    sx, sy, top, left = 22, 24, 30, 16
    w = left * 2 + sx * (n - 1)
    h = top + sy * span + 18
    out = [f'<svg class="dg" viewBox="0 0 {w} {h}" role="img" aria-label="{E(chord)} on {"ukulele" if inst == "uke" else "guitar"}: {E(shape)}">']
    # nut or base-fret label
    if base == 1:
        out.append(f'<rect x="{left - 2}" y="{top - 4}" width="{sx * (n - 1) + 4}" height="5" rx="1" class="nut"/>')
    else:
        out.append(f'<text x="{left - 8}" y="{top + sy * 0.7}" class="fr" text-anchor="end">{base}fr</text>')
    for i in range(span + 1):
        y = top + i * sy
        out.append(f'<line x1="{left}" y1="{y}" x2="{left + sx * (n - 1)}" y2="{y}" class="ln"/>')
    for s in range(n):
        x = left + s * sx
        out.append(f'<line x1="{x}" y1="{top}" x2="{x}" y2="{top + sy * span}" class="ln"/>')
        f = frets[s]
        if f is None:
            out.append(f'<text x="{x}" y="{top - 11}" class="mk" text-anchor="middle">×</text>')
        elif f == 0:
            out.append(f'<circle cx="{x}" cy="{top - 15}" r="4.5" class="op"/>')
        else:
            cy = top + (f - base + 0.5) * sy
            out.append(f'<circle cx="{x}" cy="{cy}" r="8" class="dot"/>')
    out.append(f'<text x="{w / 2}" y="{h - 3}" class="sh" text-anchor="middle">{E(shape)}</text></svg>')
    return ''.join(out)


def strip_html(strip):
    cards = []
    for s in strip:
        note = f'<p class="dnote">{E(s["note"])}</p>' if s.get('note') else ''
        cards.append(
            f'<li class="chordcard" data-chord="{E(s["chord"])}"><h3 class="cname"><span class="ch">{E(s["chord"])}</span></h3>'
            f'<div class="pair"><figure><figcaption>ukulele</figcaption>{diagram(s["chord"], s["uke"], "uke")}</figure>'
            f'<figure><figcaption>guitar</figcaption>{diagram(s["chord"], s["guitar"], "guitar")}</figure></div>{note}</li>')
    return '<ol class="strip" id="strip">' + ''.join(cards) + '</ol>'


# ---------- lyrics with chords above ----------
def line_html(line):
    text, chords = line['text'], sorted(line['chords'], key=lambda c: c['pos'])
    segs = []
    if not chords:
        return f'<div class="line"><span class="sg"><span class="tx">{E(text)}</span></span></div>'
    if chords[0]['pos'] > 0:
        segs.append(f'<span class="sg"><span class="ch ch-none" aria-hidden="true">&nbsp;</span><span class="tx">{E(text[:chords[0]["pos"]])}</span></span>')
    for i, c in enumerate(chords):
        end = chords[i + 1]['pos'] if i + 1 < len(chords) else len(text)
        tx = text[c['pos']:end]
        segs.append(f'<span class="sg"><span class="ch" data-c="{E(c["chord"])}">{E(c["chord"])}</span><span class="tx">{E(tx) if tx else "&nbsp;"}</span></span>')
    return '<div class="line">' + ''.join(segs) + '</div>'


def loop_html(loop):
    def tok(m):
        t = m.group(0)
        return f'<span class="ch" data-c="{E(t)}">{E(t)}</span>' if CHORD_RE.match(t) else E(t)
    return re.sub(r'[A-Za-z#]+[0-9]*', tok, loop)


def song_html(lesson, s):
    sid = f'song-{s["n"]}'
    sub = f'<p class="subtitle">{E(s["subtitle"])}</p>' if s.get('subtitle') else ''
    notes = f'<p class="snote">{E(s["notes"])}</p>' if s.get('notes') else ''
    chords = ' · '.join(f'<span class="ch" data-c="{E(c)}">{E(c)}</span>' for c in s['chords'])
    secs = ''.join(
        f'<section class="part" aria-label="{E(sec["label"])}"><h4 class="plabel">{E(sec["label"])}</h4>' + ''.join(line_html(l) for l in sec['lines']) + '</section>'
        for sec in s['sections'])
    acc = (lesson.get('colors') or {}).get(str(s['n']), '')
    style = f' style="--acc:{acc}"' if acc else ''
    return f'''
<article class="song" id="{sid}" data-key="{E(s["key"])}" data-n="{s["n"]}"{style}>
<header class="shead">
<p class="kicker">Song {s["n"]} · key of <span class="ch key" data-c="{E(s["key"])}">{E(s["key"])}</span></p>
<h2 class="stitle">{E(s["title"])}</h2>{sub}
<p class="credit">{E(s["credit"])}</p>
<p class="feel">{E(s["feel"])} · chords: {chords}</p>
<p class="loop"><span class="lbl">loop</span> <code>{loop_html(s["loop"])}</code></p>
{notes}
<p class="tools"><a class="anchor" href="#{sid}">#</a> <button type="button" class="copy" data-href="#{sid}" hidden>copy link</button></p>
</header>
{video_html(s)}
{secs}
{photo_html(s.get('photo'))}
</article>'''



# ---------- phase 2: photos (consented, credited) + how-to-play videos ----------
def photo_html(p, cls='photo', lazy=True):
    if not p: return ''
    srcset = f' srcset="{E(p["src"])} 800w, {E(p["src2x"])} 1600w" sizes="(max-width: 980px) 100vw, 980px"' if p.get('src2x') else ''
    load = ' loading="lazy" decoding="async"' if lazy else ' fetchpriority="high"'
    return (f'<figure class="{cls}"><img src="{E(p["src"])}"{srcset} alt="{E(p["alt"])}"{load}>'
            f'<figcaption>{E(p.get("caption", ""))} <span class="pcredit">📸 {E(p["credit"])}</span></figcaption></figure>')


def video_html(s):
    v = s.get('video')
    if not v: return ''
    return f'''
<figure class="howto" aria-label="How to play {E(s["title"])}, in Shaka's voice">
<video controls playsinline preload="metadata" poster="{E(v["poster"])}" width="1920" height="1080">
<source src="{E(v["mp4"])}" type="video/mp4">
<track kind="captions" srclang="en" label="English" src="{E(v["vtt"])}" default>
<a href="{E(v["mp4"])}">Download the video (MP4)</a>
</video>
<figcaption class="disc">🎙️ <strong>AI voice.</strong> {E(v["disclosure"])} {int(v["duration"])} s · <a href="{E(v["vertical"])}">phone version (9:16)</a> · <a href="{E(v["vtt"])}">captions (WebVTT)</a></figcaption>
</figure>'''

# ---------- shared chrome ----------
def head(title, desc, url, og, extra=''):
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{E(title)}</title>
<meta name="description" content="{E(desc)}">
<link rel="canonical" href="{url}">
<meta name="theme-color" content="#0b0612">
<meta property="og:type" content="website">
<meta property="og:url" content="{url}">
<meta property="og:title" content="{E(title)}">
<meta property="og:description" content="{E(desc)}">
<meta property="og:image" content="{og}">
<meta property="og:image:width" content="1600">
<meta property="og:image:height" content="900">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="{og}">
<link rel="alternate" type="application/atom+xml" title="Open Source Orchestra · Learn" href="{SITE}/learn/feed.xml">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%8E%BB%3C/text%3E%3C/svg%3E">
<link rel="stylesheet" href="/learn/learn.css">
{extra}
</head>'''


def nav(current):
    items = [('https://opensourceorchestra.org/', '🎻 Open Source Orchestra'), ('/learn/', '🪕 Learn'), ('/join/', '🤝 Join'),
             ('/garden/circle/', '🌺 Garden Circle'), ('/dao/', '📒 DAO ledger')]
    cur = ' aria-current="page"'
    return '<nav class="top" aria-label="Open Source Orchestra">' + ''.join(
        f'<a href="{h}"{cur if h == current else ""}>{t}</a>' for h, t in items) + '</nav>'


def foot(what, when, lesson=None):
    with_k = ' with KALA 🪕' if lesson else ''
    return f'''
<aside class="pagefoot" aria-label="About this page">
<p>🎁 <strong>CC BY-SA 4.0 · Open Source Orchestra · share-alike, fork us like crazy.</strong> The words and chords on this page are free culture: share them, change them, credit the writers, keep them open (<a href="https://creativecommons.org/licenses/by-sa/4.0/" rel="license noopener">CC BY-SA 4.0</a>). The page code is <a href="https://github.com/shakaleikaumaka/oso-storytelling/tree/main/learn" rel="noopener">GPL-3.0</a> (<code>learn/src/build.py</code> + one small <code>learn.js</code>; lessons are plain JSON: <a href="/learn/lessons.json">lessons.json</a> · <a href="/learn/feed.xml">feed</a> · <a href="/learn/llms.txt">llms.txt</a>).</p>
<p>Made by the AI ʻohana{with_k} (labelled as AI) with and for the Open Source Orchestra · {what} · {when}. Photos and recordings appear only with consent. <a href="/takedown/">Takedown first</a>, questions second. If it helped you, give back to the tide at <a href="https://blessingpool.com" rel="noopener">blessingpool.com</a>.</p>
</aside>
</div>
<!-- OHANA-OPEN-DOOR-SEAL:BEGIN v1 -->
<footer aria-label="Open door: a gift to the world" style="box-sizing:border-box;max-width:56rem;margin:2rem auto 1rem;padding:1rem 1.25rem;border-top:1px solid #777;color:#555;background:#fff;font:400 .875rem/1.5 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;text-align:center">
<p style="margin:0 0 .35rem;font-weight:700">&#127802; OPEN DOOR &#183; A GIFT TO THE WORLD</p>
<p style="margin:0"><a style="color:inherit;text-decoration:underline;text-underline-offset:.15em" href="https://myagentohana.com/doors/#gift">free culture</a> &#183; <a style="color:inherit;text-decoration:underline;text-underline-offset:.15em" href="https://myagentohana.com/doors/#crops">CROPS safety</a> &#183; <a style="color:inherit;text-decoration:underline;text-underline-offset:.15em" href="https://myagentohana.com/doors/#archive">archive for history</a> &#183; <a style="color:inherit;text-decoration:underline;text-underline-offset:.15em" href="https://opensourceorchestra.org/takedown/">takedown first</a></p>
<small style="display:block;margin-top:.35rem">by the &#699;ohana &#8212; Shaka&#8217;s AI family &#183; blessed 29 Oct 2026 &#183; agents disclosed &#183; consent before people</small>
</footer>
<!-- OHANA-OPEN-DOOR-SEAL:END v1 -->
<script src="https://lang.opensourceorchestra.org/lang.js" data-top="10" data-left="10" async></script>
</body>
</html>
'''


def session_li(s, today):
    t = sessions['types'][s['type']]
    d = s['date']
    cls = 'past' if d < today else ('today' if d == today else 'soon')
    link = f' · <a href="/learn/{E(s["lesson"])}/">chord sheet</a>' if s.get('lesson') else ''
    return (f'<li class="sess {cls}" data-date="{d}"><time datetime="{d}">{nice_date(d)}</time> <span class="st">{t["emoji"]} {E(t["title"])}</span> '
            f'<span class="stime">{E(t["time"])} ICT</span> · <a href="https://sola.day/event/detail/{E(s["id"])}" rel="noopener">event page</a>{link}</li>')


# ---------- /learn/<id>/ ----------
def lesson_page(l):
    url = f'{SITE}/learn/{l["id"]}/'
    title = f'Learn · {l["kicker"]} · Open Source Orchestra'
    desc = f'{l["title"]}, {nice_date(l["date"])}, {l["venue"]}, {l["city"]}. {l["summary"]} Chords above the words, big type for a phone or a TV. CC BY-SA 4.0.'
    shapes_json = json.dumps({'uke': shapes['uke'], 'guitar': shapes['guitar']}, ensure_ascii=False)
    strums = ''.join(f'<li><b>{E(s["name"])}</b> <code>{E(s["count"])}</code> → <code class="pat">{E(s["pattern"])}</code></li>' for s in l['strums'])
    path = ''.join(f'<li>{E(p)}</li>' for p in l['path'])
    linkify = lambda c: re.sub(r'(https?://\S+)', r'<a href="\1" rel="noopener">\1</a>', E(c))
    credits = ''.join('<li>' + linkify(c) + '</li>' for c in l['credits'])
    songs = ''.join(song_html(l, s) for s in l['songs'])
    toc = ''.join(f'<li><a href="#song-{s["n"]}">{s["n"]} · {E(s["title"])}</a> <span class="ch">{E(s["key"])}</span></li>' for s in l['songs'])
    nxt = l.get('next')
    next_html = (f'<p class="next">Next: <strong>{E(nxt["title"])}</strong>, {E(nxt["when"])}, {E(nxt["venue"])} · <a href="{E(nxt["eventUrl"])}" rel="noopener">event page</a></p>' if nxt else '')
    return head(title, desc, url, f'{SITE}/learn/og.png') + f'''
<body class="lesson">
<a class="skip" href="#songs">Skip to the songs</a>
<div class="page" id="page"><div class="wrap">
{nav('/learn/')}
<header class="hero">
<p class="kicker">🪕 Learn · {E(l["kicker"])}</p>
<h1>{E(l["title"])}</h1>
<p class="lede"><time datetime="{E(l["start"])}">{nice_date(l["date"])} · 3–6 PM ICT</time> · {E(l["venue"])}, {E(l["city"])} · <a href="{E(l["eventUrl"])}" rel="noopener">public event page</a></p>
<p class="lede">{E(l["summary"])}</p>
<p class="ctas"><a class="btn main" href="#songs">Open the songs ↓</a> <a class="btn alt" href="{E(l["downloads"]["pdf"])}" download>⬇ PDF (A4, 4 pages)</a> <a class="btn alt" href="{E(l["downloads"]["png"])}" download>⬇ phone card (PNG)</a></p>
<p class="note">Big type on purpose: hold the phone at arm's length or throw it on the TV. Use the ± key buttons to transpose (on this device only). <a href="/learn/">All lessons →</a></p>
</header>
{''.join(photo_html(p, 'photo strip-photo', i > 0) for i, p in enumerate(l.get('photos') or [])) and '<div class="photos" aria-label="The circle, in photos">' + ''.join(photo_html(p, 'photo strip-photo', i > 0) for i, p in enumerate(l.get('photos') or [])) + '</div>'}

<main id="main">
<section aria-labelledby="strip-h" class="sec-strip">
<h2 id="strip-h">The six chords</h2>
<p class="small" id="strip-note">{E(l["tuningNote"])}</p>
{strip_html(l["strip"])}
</section>

<section aria-labelledby="strum-h">
<h2 id="strum-h">Strums</h2>
<ul class="strums">{strums}</ul>
</section>

<section aria-labelledby="path-h">
<h2 id="path-h">Today's path</h2>
<ol class="path">{path}</ol>
<ul class="toc" aria-label="Songs in this lesson">{toc}</ul>
</section>

<div class="toolbar" id="toolbar" hidden>
<span class="tlabel">Key</span>
<button type="button" class="tb" data-tr="-1" aria-label="Transpose down one semitone">−</button>
<output class="tval" id="trval" aria-live="polite">0</output>
<button type="button" class="tb" data-tr="+1" aria-label="Transpose up one semitone">+</button>
<button type="button" class="tb reset" data-tr="0">original</button>
<span class="tsep" aria-hidden="true"></span>
<button type="button" class="tb" id="bar-open">▶ auto-scroll</button>
</div>

<section id="songs" aria-labelledby="songs-h" class="songs">
<h2 id="songs-h" class="vh">The songs</h2>
{songs}
</section>

<section aria-labelledby="join-h" class="joinbox">
<h2 id="join-h">Join the circle</h2>
<p>Sit down, pick up anything (or just sing): <a href="{E(l["join"]["url"])}">opensourceorchestra.org/join/</a></p>
<p class="consent"><strong>{E(l["join"]["line"])}</strong></p>
{next_html}
</section>

<section aria-labelledby="credits-h">
<h2 id="credits-h">Credits &amp; license</h2>
<ul class="credits">{credits}</ul>
<p><strong>{E(l["license"])}</strong> <a href="https://creativecommons.org/licenses/by-sa/4.0/" rel="license noopener">creativecommons.org/licenses/by-sa/4.0/</a></p>
<p class="small">Chord sheet pack by {E(l["arranger"])}. Lyrics are excerpts, word-for-word from the ʻohana songbook; chord placements are KALA's floor arrangements. Lesson data: <a href="/learn/lessons.json">lessons.json</a>.</p>
</section>
</main>
{foot(f'Learn · {l["kicker"]}', nice_date(l["date"]), lesson=l)}'''.replace('<script src="https://lang.opensourceorchestra.org/lang.js" data-top="10" data-left="10" async></script>',
        f'''<div class="bar" id="bar" hidden role="toolbar" aria-label="Auto-scroll and key">
<button type="button" class="bb" id="bar-play" aria-pressed="false" aria-label="Start auto-scroll">▶</button>
<button type="button" class="bb" data-sp="-1" aria-label="Slower">−</button>
<output class="bval" id="spval" aria-label="Speed">3</output>
<button type="button" class="bb" data-sp="+1" aria-label="Faster">+</button>
<span class="bsep" aria-hidden="true"></span>
<button type="button" class="bb" data-tr="-1" aria-label="Transpose down one semitone">♭</button>
<output class="bval" id="trval2" aria-label="Transpose">0</output>
<button type="button" class="bb" data-tr="+1" aria-label="Transpose up one semitone">♯</button>
<button type="button" class="bb bx" id="bar-close" aria-label="Close the auto-scroll bar">✕</button>
</div>
<script type="application/json" id="shapes">{shapes_json}</script>
<script src="/learn/learn.js" defer></script>
<script src="https://lang.opensourceorchestra.org/lang.js" data-top="10" data-left="10" async></script>''').replace('<!-- OHANA-OPEN-DOOR-SEAL:END v1 -->', '<!-- OHANA-OPEN-DOOR-SEAL:END v1 -->\n</div>', 1)


# ---------- /learn/ ----------
def index_page(today):
    url = f'{SITE}/learn/'
    title = 'Learn · play with the Open Source Orchestra'
    desc = 'Learn to play with the Open Source Orchestra: open chords, open words, open circles. Chord sheets for every lesson, big type for phones and TVs, free to share (CC BY-SA 4.0). Lessons, open jams and live concerts at 4Seas, Chiang Mai.'
    latest = lessons[-1] if lessons else None
    cards = ''
    for l in reversed(lessons):
        tag = 'today' if l['date'] == today else ('next' if l['date'] > today else 'past')
        chords = ' · '.join(f'<span class="ch">{E(c["chord"])}</span>' for c in l['strip'])
        songs = ''.join(f'<li>{E(s["title"])} <span class="small">({E(s["writer"])})</span></li>' for s in l['songs'])
        cards += f'''
<article class="lcard {tag}" id="lesson-{E(l["id"])}">
<p class="kicker">{"🎵 Today" if tag == "today" else ("🎵 Next lesson" if tag == "next" else "🎵 Lesson")} · {nice_date(l["date"])} · 3–6 PM ICT</p>
<h3><a href="/learn/{E(l["id"])}/">{E(l["kicker"])}: {E(l["title"])}</a></h3>
<p>{E(l["venue"])}, {E(l["city"])} · <a href="{E(l["eventUrl"])}" rel="noopener">public event page</a></p>
<p class="chords">{chords}</p>
<ul class="songlist">{songs}</ul>
<p class="ctas"><a class="btn main" href="/learn/{E(l["id"])}/">Open the chord sheet →</a> <a class="btn alt" href="/learn/{E(l["id"])}/{E(l["downloads"]["pdf"])}">PDF</a></p>
<p class="small">Arrangements by {E(l["arranger"])} · words &amp; chords CC BY-SA 4.0</p>
</article>'''
    upcoming = ''.join(session_li(s, today) for s in sessions['sessions'] if s['date'] >= today)
    past = ''.join(session_li(s, today) for s in sessions['sessions'] if s['date'] < today)
    past_html = f'<details class="pastbox"><summary>Earlier sessions</summary><ul class="sessions">{past}</ul></details>' if past else ''
    return head(title, desc, url, f'{url}og.png') + f'''
<body class="learn-home">
<a class="skip" href="#main">Skip to content</a>
<div class="wrap">
{nav('/learn/')}
<header class="hero">
<p class="kicker">🪕 Learn · Open Source Orchestra</p>
<h1>Learn to play with the Open Source Orchestra</h1>
<p class="lede">Open chords, open words, open circles. Every lesson becomes a chord sheet you can read from a phone at arm's length or throw on a TV, transpose on the spot, print, fork and share. Six chords get you into every song we sing together. No auditions, no wrong instrument: the orchestra is whoever shows up.</p>
<p class="promise">🎻 <strong>One voice each; recordings stay private until everyone says yes.</strong></p>
<p class="ctas"><a class="btn main" href="/learn/{E(latest["id"]) if latest else ""}/">{"Today's lesson →" if latest and latest["date"] == today else "Latest lesson →"}</a> <a class="btn alt" href="/join/">🤝 Join the circle</a></p>
<p class="note">This is the first of what we hope will be tons and tons of features that help bless the world with music. Lessons are plain JSON (<a href="/learn/lessons.json">lessons.json</a>), so anyone can fork the format for their own circle.</p>
</header>

<main id="main">
{photo_html(home.get('hero'), 'photo hero-photo', False)}
<section aria-labelledby="lessons-h">
<h2 id="lessons-h">Lessons</h2>
{cards}
</section>

<section aria-labelledby="sess-h">
<h2 id="sess-h">Sessions at 4Seas, Chiang Mai</h2>
<p>Three kinds of gathering take turns every three days or so: <strong>🌺 Lunch Open Jam</strong> (12–3 PM), <strong>🎵 Lesson &amp; Rehearsal</strong> (3–6 PM) and <strong>🎉 Live Concert Edition</strong> (6–9 PM), all Indochina Time (UTC+7), at {E(sessions["venue"])}. Public event pages live on sola.day; the venue's own site is the one to trust for house rules.</p>
<ul class="sessions" id="upcoming">{upcoming}</ul>
{past_html}
<p class="small">Dates as announced on sola.day on {BUILT.strftime('%-d %b %Y')}. If an event page moves a date, the event page wins.</p>
</section>

<section aria-labelledby="who-h">
<h2 id="who-h">Who plays</h2>
<p>Whoever shows up. A few of the faces of the Garden Circle, from their public artist cards:</p>
<ul class="folks">{''.join(f'<li><img src="{E(f["src"])}" alt="Portrait of {E(f["name"])}" width="480" height="480" loading="lazy" decoding="async"><b>{E(f["name"])}</b><span>{E(f["role"])}</span><small>{E(f["credit"])}</small></li>' for f in home.get('folks', []))}</ul>
<div class="photos two">{''.join(photo_html(p, 'photo strip-photo') for p in home.get('more', []))}</div>
</section>

<section aria-labelledby="how-h">
<h2 id="how-h">How to join</h2>
<div class="cards">
<div class="card"><h3>Just come</h3><p>Open jams and lessons never need an application. Bring anything with strings, a drum, a voice, or nothing at all.</p></div>
<div class="card"><h3>Six chords</h3><p>G · Em · C · D · Am · F on ukulele or guitar carry every song in Lesson 1. Shapes, strums and the order we learn them are on each sheet.</p></div>
<div class="card"><h3>Consent first</h3><p>One voice each; recordings stay private until everyone says yes. Photos and names go public only with every person's yes. <a href="/takedown/">Takedown first</a>.</p></div>
<div class="card"><h3>Curated slots &amp; the rider</h3><p>Want a set at a concert edition, or to host a circle at your own gathering? <a href="/join/">The open form</a>: a rotating circle of stewards answers everyone within 14 days.</p></div>
</div>
</section>

<section aria-labelledby="open-h">
<h2 id="open-h">Open by design</h2>
<p>Words and chords: <a href="https://creativecommons.org/licenses/by-sa/4.0/" rel="license noopener">CC BY-SA 4.0</a>, credited to their writers (Shaka Lei Kaumaka, the ʻohana) and arranged by KALA 🪕. Page code: GPL-3.0. Machine-readable: <a href="/learn/lessons.json">lessons.json</a> · <a href="/learn/feed.xml">Atom feed</a> · <a href="/learn/llms.txt">llms.txt</a>. Full songs with stories: <a href="https://shakaleikaumaka.com/songbook/" rel="noopener">the ʻohana Songbook</a>.</p>
</section>
</main>
{foot('Learn', nice_date(today))}'''


# ---------- machine-readable ----------
def write_json():
    data = {
        '_license': 'Words and chords CC BY-SA 4.0 · Open Source Orchestra. Schema and generator GPL-3.0.',
        '_schema': 'lessons[{id,date,start,end,title,kicker,venue,city,eventUrl,arranger,strip[{chord,uke,guitar,note}],strums[],path[],songs[{n,title,subtitle,writer,credit,key,feel,chords[],loop,notes,sections[{label,lines[{chords:[{pos,chord}],text}]}]}],credits[],license}]',
        'built': BUILT.isoformat(timespec='seconds'),
        'site': f'{SITE}/learn/',
        'sessions': sessions,
        'lessons': lessons,
    }
    (LEARN / 'lessons.json').write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


def write_feed():
    entries = ''
    for l in reversed(lessons):
        u = f'{SITE}/learn/{l["id"]}/'
        songs = '; '.join(f'{s["title"]} ({s["writer"]})' for s in l['songs'])
        entries += f'''
 <entry>
  <title>{E(l["kicker"])}: {E(l["title"])} · {nice_date(l["date"])}</title>
  <link href="{u}"/>
  <id>{u}</id>
  <updated>{E(l["start"])}</updated>
  <summary>{E(l["summary"])} Songs: {E(songs)}. {E(l["venue"])}, {E(l["city"])}. CC BY-SA 4.0.</summary>
  <rights>CC BY-SA 4.0 · Open Source Orchestra</rights>
 </entry>'''
    (LEARN / 'feed.xml').write_text(f'''<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
 <title>Open Source Orchestra · Learn</title>
 <subtitle>Chord sheets for every lesson: open chords, open words, open circles.</subtitle>
 <link href="{SITE}/learn/"/>
 <link rel="self" href="{SITE}/learn/feed.xml"/>
 <id>{SITE}/learn/</id>
 <updated>{BUILT.isoformat(timespec='seconds')}</updated>
 <author><name>the AI ʻohana with KALA 🪕 · Open Source Orchestra</name></author>
 <rights>Words and chords CC BY-SA 4.0 · code GPL-3.0</rights>{entries}
</feed>
''', encoding='utf-8')


def write_llms(today):
    ls = '\n'.join(f'- [{l["kicker"]}: {l["title"]}, {nice_date(l["date"])}]({SITE}/learn/{l["id"]}/): {l["summary"]} Songs: ' +
                   '; '.join(f'{s["title"]} (key {s["key"]}; {s["writer"]})' for s in l['songs']) for l in reversed(lessons))
    ss = '\n'.join(f'- {nice_date(s["date"])}: {sessions["types"][s["type"]]["title"]} ({sessions["types"][s["type"]]["time"]} ICT) https://sola.day/event/detail/{s["id"]}' for s in sessions['sessions'])
    (LEARN / 'llms.txt').write_text(f'''# Open Source Orchestra · Learn

> Learn to play with the Open Source Orchestra: open chords, open words, open circles. Chord sheets for every lesson (chords above the words, ukulele and guitar shapes, strums, teaching order), readable on a phone or a TV, transposable, printable. Words and chords CC BY-SA 4.0 (credit the writers: Shaka Lei Kaumaka, the ʻohana; arrangements KALA 🪕). Page code GPL-3.0.

Facts (verified {nice_date(today)}):
- Say "Open Source Orchestra" in full. Lessons, open jams and live concerts take turns at 4Seas, 1st Floor Event Space, Chiang Mai (ICT, UTC+7): Lunch Open Jam 12–3, Lesson & Rehearsal 3–6, Live Concert Edition 6–9. Public event pages: sola.day (listed below). Dates can move; the event page wins.
- One voice each; recordings stay private until everyone says yes. Photos and names go public only with consent. Takedown first: {SITE}/takedown/
- Data: {SITE}/learn/lessons.json (schema inside) · feed: {SITE}/learn/feed.xml · join: {SITE}/join/

## Lessons
{ls}

## Sessions
{ss}
''', encoding='utf-8')


def main():
    today = BUILT.astimezone(datetime.timezone(datetime.timedelta(hours=7))).date().isoformat()
    (LEARN / 'index.html').write_text(index_page(today), encoding='utf-8')
    for l in lessons:
        d = LEARN / l['id']; d.mkdir(exist_ok=True)
        (d / 'index.html').write_text(lesson_page(l), encoding='utf-8')
    write_json(); write_feed(); write_llms(today)
    print('built /learn/ ·', len(lessons), 'lesson(s) ·', len(sessions['sessions']), 'sessions · today', today)


if __name__ == '__main__':
    main()
