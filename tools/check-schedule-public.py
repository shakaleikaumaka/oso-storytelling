#!/usr/bin/env python3
"""CI/release gate: public schedule pages must not ship coordination metadata.

Runs with Python stdlib only. Checks BOTH the public schedule and the unlinked
blueprint because view-source is public even when a page is not linked.
"""
from pathlib import Path
import copy
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
PAGES = (ROOT / 'schedule/index.html', ROOT / 'schedule/blueprint/index.html')
FORBIDDEN = frozenset({
    'comm', 'comm_note', 'ticket', 'dropped', 'pending',
    'needs_code', 'bench', 'code_note',
})
STATUS_WORDS = frozenset({'yes', 'no', 'held', 'bounced', 'via-carlota', 'true', 'false', 'pending'})


def payload(html, path):
    match = re.search(r'<script\b[^>]*\bid=["\']data["\'][^>]*>(.*?)</script>', html, re.S)
    if not match:
        raise AssertionError(f'{path}: missing application/json data blob')
    return json.loads(match.group(1))


def walk(value):
    if isinstance(value, dict):
        for key, child in value.items():
            yield key, child
            yield from walk(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk(child)


def assert_safe(public, private=None):
    for key, _ in walk(public):
        if key in FORBIDDEN:
            raise AssertionError(f'forbidden coordination key serialized: {key}')
    if private is not None:
        public_by_n = {a.get('n'): a for a in public.get('artists', [])}
        for old in private.get('artists', []):
            new = public_by_n.get(old.get('n'))
            if new is None:
                raise AssertionError('artist record lost during sanitization')
            serialized = json.dumps(new, ensure_ascii=False)
            for key in FORBIDDEN:
                value = old.get(key)
                if not isinstance(value, str):
                    continue
                value = value.strip()
                if len(value) < 8 or value.lower() in STATUS_WORDS:
                    continue
                if value in serialized:
                    raise AssertionError(f'private {key} value leaked under another field')


def check_page(path):
    html = path.read_text(encoding='utf-8')
    data = payload(html, path)
    assert_safe(data)
    canonical = re.findall(r'"(?:comm_note|ticket|dropped)"', html)
    if canonical:
        raise AssertionError(f'{path}: canonical forbidden-key count = {len(canonical)}')
    match = re.search(r'const COMPUTED_ARR = (.*?);\n', html)
    if not match:
        raise AssertionError(f'{path}: COMPUTED_ARR missing')
    if match.group(1).strip() == 'defaultArr()':
        raise AssertionError(f'{path}: browser still needs private ticket/dropout fields to compute the lineup')
    computed = json.loads(match.group(1))
    if set(computed) != {'November 3', 'November 4', 'November 5', 'November 6'}:
        raise AssertionError(f'{path}: computed arrangement has wrong days')
    print(f'PASS {path.relative_to(ROOT)} · artists={len(data.get("artists", []))} · canonical-forbidden=0')


def selftest():
    base = {'artists': [{'n': 1, 'name': 'Synthetic'}]}
    for key in FORBIDDEN:
        bad = copy.deepcopy(base)
        bad['artists'][0][key] = True
        try:
            assert_safe(bad)
        except AssertionError:
            pass
        else:
            raise AssertionError(f'selftest: {key} did not fail the gate')
    private = {'artists': [{'n': 1, 'comm_note': 'PRIVATE_SENTINEL_UNIQUE'}]}
    public = {'artists': [{'n': 1, 'note': 'PRIVATE_SENTINEL_UNIQUE'}]}
    try:
        assert_safe(public, private)
    except AssertionError:
        pass
    else:
        raise AssertionError('selftest: aliased private VALUE did not fail the gate')
    assert_safe(base)
    print(f'PASS selftest · {len(FORBIDDEN)} forbidden keys + aliased private value all rejected')


if __name__ == '__main__':
    selftest()
    for page in PAGES:
        check_page(page)
    print('PUBLIC SCHEDULE CONSENT GATE: PASS')
