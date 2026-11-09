#!/usr/bin/env python3
"""Freeze the CURRENT /garden/circle/ as /garden/circle/vN/ — "archive-before-change, forever".

Usage:  python3 tools/freeze-garden-circle.py vN "frozen 2026-11-09 · one-line description"

What it does (law: /shared/kb/versioning-law-garden-circle.md):
  * copies the page code + data (index.html, *.js, *.css, data/, img/, vendor/,
    history/manifest.json) into garden/circle/vN/  — code + data are frozen for good;
  * the big photo files stay shared: history/*.webp is APPEND-ONLY (never overwrite or
    delete a file there; a new photo gets a new filename), so the frozen manifest keeps
    resolving via ../history/;
  * rewrites the relative paths that change by one folder level (../profiles/ → ../../profiles/ …);
  * adds a small "frozen version" ribbon with links to every version + current;
  * refuses to overwrite an existing vN.
"""
import json, os, re, shutil, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'garden', 'circle')
ROOT = os.path.normpath(ROOT)


def main():
    if len(sys.argv) < 3 or not re.fullmatch(r'v\d+', sys.argv[1]):
        sys.exit('usage: freeze-garden-circle.py vN "note"')
    ver, note = sys.argv[1], sys.argv[2]
    dst = os.path.join(ROOT, ver)
    if os.path.exists(dst):
        sys.exit(f'{dst} exists — versions are never overwritten')
    os.makedirs(dst)
    skip_dirs = {'history', 'EF', 'ef'} | {d for d in os.listdir(ROOT) if re.fullmatch(r'v\d+', d)}
    for name in os.listdir(ROOT):
        src = os.path.join(ROOT, name)
        if name in skip_dirs:
            continue
        if os.path.isdir(src):
            shutil.copytree(src, os.path.join(dst, name))
        else:
            shutil.copy2(src, os.path.join(dst, name))
    os.makedirs(os.path.join(dst, 'history'))
    shutil.copy2(os.path.join(ROOT, 'history', 'manifest.json'), os.path.join(dst, 'history', 'manifest.json'))

    def sub(path, pairs):
        p = os.path.join(dst, path)
        if not os.path.exists(p):
            return
        s = open(p, encoding='utf-8').read()
        for a, b in pairs:
            s = s.replace(a, b)
        open(p, 'w', encoding='utf-8').write(s)

    up = [('"../', '"../../'), ("'../", "'../../")]
    sub('index.html', up)
    sub('keys.js', up)
    sub('data/artists.json', up)
    sub('data/edits.json', up)
    # photos: the frozen manifest points at the shared, append-only photo folder one level up
    sub('app.js', [("'./history/' + p.file", "'../history/' + p.file")])
    # any manifest entry that already carries an absolute/relative url keeps working as-is

    # ribbon: which version this is + links to all versions
    vers = sorted([d for d in os.listdir(ROOT) if re.fullmatch(r'v\d+', d)], key=lambda v: int(v[1:]))
    links = ' · '.join(f'<a href="../{v}/" style="color:#ffd97a">{v}</a>' if v != ver else f'<b>{v}</b>' for v in vers)
    ribbon = (f'<div id="frozen-ribbon" style="position:fixed;top:0;left:0;z-index:99;'
              f'font:12px/1.4 ui-sans-serif,system-ui,sans-serif;color:#f6eedd;background:rgba(11,6,18,.82);'
              f'border:1px solid rgba(255,217,122,.5);border-radius:0 0 10px 0;padding:2px 10px;white-space:nowrap;max-width:100vw;overflow:hidden;text-overflow:ellipsis">'
              f'🗄️ frozen <b>{ver}</b> · {note} · versions: {links} · <a href="../" style="color:#ffd97a">current →</a></div>')
    p = os.path.join(dst, 'index.html')
    s = open(p, encoding='utf-8').read()
    s = s.replace('<body>', '<body>\n' + ribbon, 1) if '<body>' in s else re.sub(r'(<body[^>]*>)', r'\1\n' + ribbon, s, count=1)
    # make room for the ribbon above the title
    s = s.replace('</head>', '<style>#top{padding-top:30px!important}</style>\n</head>', 1)
    if '<link rel="canonical"' not in s:
        s = s.replace('</head>', '<link rel="canonical" href="https://opensourceorchestra.org/garden/circle/">\n</head>', 1)
    open(p, 'w', encoding='utf-8').write(s)
    print('frozen', ver, '→', dst)


if __name__ == '__main__':
    main()
