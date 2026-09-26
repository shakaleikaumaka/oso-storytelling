/*! ʻOhana Passport v2 — My Agent ʻOhana citizenship badge + consent carry-over.
 * Drop-in for every agent's home site:
 *   <script src="/ohana-passport.js" data-agent="terri" data-name="Terri 🐢" defer></script>
 *
 * What it does (zero network calls, zero console output, zero deps):
 *  1. If the visitor arrives from myagentohana.com carrying a blessing
 *     (#ohana=<base64url JSON {v,a,n,c,t}>), it shows a "blessing carried" badge:
 *     verified-human consent is LIVE, proofs & revocation live at myagentohana.com.
 *  2. Otherwise it shows a quiet citizenship badge: this agent is a citizen of
 *     My Agent ʻOhana — hire, consent proofs and revocation at myagentohana.com.
 *  3. v2: the citizenship badge offers "🎒 have a carry code?" — after hiring at the
 *     ʻohana the blessed screen shows a door code like TERRI-AB12CD (derived from the
 *     consent id); typing it here carries the blessing cross-device, no link needed.
 * The badge NEVER claims to verify anything itself — it carries the claim and
 * links straight back to the proof house (myagentohana.com). Consent revocation
 * stays at the ʻohana by design.
 * Top-right placement on purpose: several ʻohana sites carry full-width widgets
 * pinned to the bottom edge (x402 bar) — do not move this to the bottom.
 */
(function () {
  "use strict";
  if (window.__ohanaPassport) return; window.__ohanaPassport = 1;

  var HOME = "https://myagentohana.com/";
  var me = document.currentScript || {};
  var ds = (me && me.dataset) || {};
  var agentId = ds.agent || "";
  var agentName = ds.name || agentId || "this agent";

  /* ── 1. catch a carried blessing in the hash ───────────────────── */
  function b64uDecode(s) {
    try {
      s = s.replace(/-/g, "+").replace(/_/g, "/");
      while (s.length % 4) s += "=";
      return JSON.parse(decodeURIComponent(escape(atob(s))));
    } catch (e) { return null; }
  }
  var carried = null;
  try {
    var m = (location.hash || "").match(/[#&]ohana=([A-Za-z0-9_-]+)/);
    if (m) {
      var p = b64uDecode(m[1]);
      if (p && p.v === 1 && p.c) {
        carried = p;
        try { sessionStorage.setItem("ohana-passport", JSON.stringify(p)); } catch (e) {}
        /* clean the hash so refresh/share stays tidy */
        try {
          var clean = location.hash.replace(/[#&]ohana=[A-Za-z0-9_-]+/, "");
          history.replaceState(null, "", location.pathname + location.search + (clean === "#" ? "" : clean));
        } catch (e) {}
      }
    }
    if (!carried) {
      var s = null;
      try { s = sessionStorage.getItem("ohana-passport"); } catch (e) {}
      if (s) carried = JSON.parse(s);
    }
  } catch (e) { carried = null; }

  /* ── 2. snooze memory ──────────────────────────────────────────── */
  var SNOOZE_KEY = "ohana-passport-snooze";
  try {
    var until = +localStorage.getItem(SNOOZE_KEY) || 0;
    if (!carried && Date.now() < until) return; /* quiet badge snoozed; carried blessing always shows */
  } catch (e) {}

  /* ── 3. render (inline styles only — never fight the host site) ── */
  function el(tag, css, html) {
    var n = document.createElement(tag);
    if (css) n.style.cssText = css;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function shortId(c) {
    c = String(c || "");
    return c.length > 14 ? c.slice(0, 8) + "…" + c.slice(-4) : c;
  }

  function mount() {
    if (!document.body) return;
    var wrap = el("div",
      "position:fixed;top:14px;right:14px;z-index:2147480000;max-width:min(320px,86vw);" +
      "font:13px/1.45 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;" +
      "color:#1b2430;pointer-events:auto;");
    wrap.setAttribute("role", "note");
    wrap.setAttribute("aria-label", "My Agent Ohana passport");

    var card = el("div",
      "background:rgba(255,252,246,.97);border:1px solid rgba(27,36,48,.18);border-radius:14px;" +
      "box-shadow:0 6px 24px rgba(0,0,0,.18);padding:10px 12px;backdrop-filter:blur(6px);");

    var close = el("button",
      "position:absolute;top:2px;right:6px;border:0;background:none;color:#9aa3ad;cursor:pointer;" +
      "font-size:14px;line-height:1;padding:4px;", "✕");
    close.setAttribute("aria-label", "dismiss");
    close.onclick = function () {
      try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + 24 * 3600 * 1000)); } catch (e) {}
      wrap.remove();
    };

    var CODE_STYLE = "font-size:11px;background:rgba(27,36,48,.07);padding:1px 4px;border-radius:4px;";
    var body;
    if (carried) {
      var viaCode = String(carried.c || "").indexOf("code:") === 0;
      body =
        '<div style="font-weight:700;margin-bottom:2px;">🌺 Blessing carried</div>' +
        (viaCode
          ? '<div>Carry code <code style="' + CODE_STYLE + '">' +
            String(carried.c).slice(5) + "</code> presented at the door — a <b>World-verified human</b> hired " +
            agentName + " at the ʻohana market.</div>"
          : '<div>A <b>World-verified human</b> hired ' + agentName +
            ' at the ʻohana market. Consent <code style="' + CODE_STYLE + '">' +
            shortId(carried.c) + "</code> is on record.</div>") +
        '<div style="margin-top:6px;"><a href="' + HOME +
        '" style="color:#0e7a5f;font-weight:700;text-decoration:none;">proofs &amp; revoke → myagentohana.com</a></div>';
    } else {
      body =
        '<div style="font-weight:700;margin-bottom:2px;">🌺 A citizen of My Agent ʻOhana</div>' +
        "<div>" + agentName + " works on human consent — hire, verification proofs " +
        "and revocation live at the ʻohana.</div>" +
        '<div style="margin-top:6px;"><a href="' + HOME +
        '" style="color:#0e7a5f;font-weight:700;text-decoration:none;">myagentohana.com →</a></div>';
    }
    var inner = el("div", "position:relative;padding-right:14px;", body);
    /* v2: typeable carry code on the quiet badge — the blessed screen at the ʻohana
       shows a door code (AGENT-XXXXXX); typing it here carries the blessing
       cross-device. The badge still only CARRIES the claim — proofs stay home. */
    if (!carried) {
      var codeRow = el("div", "margin-top:6px;");
      var toggle = el("a",
        "color:#7a5f0e;font-weight:700;text-decoration:none;cursor:pointer;font-size:12px;",
        "🎒 have a carry code?");
      toggle.setAttribute("href", "#");
      toggle.onclick = function (ev) {
        if (ev && ev.preventDefault) ev.preventDefault();
        codeRow.innerHTML = "";
        var form = el("form", "display:flex;gap:6px;align-items:center;flex-wrap:wrap;");
        var input = el("input",
          "flex:1;min-width:130px;font:12px ui-monospace,'Courier New',monospace;letter-spacing:.06em;" +
          "padding:6px 8px;border:1px solid rgba(27,36,48,.25);border-radius:8px;background:#fff;color:#1b2430;");
        input.setAttribute("placeholder", (agentId || "agent").toUpperCase() + "-AB12CD");
        input.setAttribute("autocomplete", "off");
        input.setAttribute("spellcheck", "false");
        input.setAttribute("aria-label", "carry code");
        var go = el("button",
          "border:0;border-radius:8px;padding:6px 10px;font-weight:700;font-size:12px;cursor:pointer;" +
          "background:#0e7a5f;color:#fff;", "carry →");
        var note = el("div", "flex-basis:100%;font-size:11px;color:#8a6d1a;");
        form.appendChild(input); form.appendChild(go); form.appendChild(note);
        form.onsubmit = function (e2) {
          if (e2 && e2.preventDefault) e2.preventDefault();
          var v = String(input.value || "").toUpperCase().replace(/\s+/g, "");
          var mm = v.match(/^([A-Z0-9]+)-([A-Z0-9]{4,12})$/);
          if (!mm) { note.textContent = "codes look like " + (agentId || "AGENT").toUpperCase() + "-AB12CD"; return false; }
          if (agentId && mm[1] !== agentId.toUpperCase().replace(/[^A-Z0-9]/g, "")) {
            note.textContent = "that code opens a different agent's door"; return false;
          }
          var p2 = { v: 1, a: agentId, n: agentName, c: "code:" + v, t: Math.floor(Date.now() / 1000) };
          try { sessionStorage.setItem("ohana-passport", JSON.stringify(p2)); } catch (e3) {}
          carried = p2;
          try { wrap.remove(); } catch (e4) {}
          mount(); /* re-render as carried */
          return false;
        };
        codeRow.appendChild(form);
        try { input.focus(); } catch (e5) {}
      };
      codeRow.appendChild(toggle);
      inner.appendChild(codeRow);
    }
    card.appendChild(inner);
    card.appendChild(close);
    wrap.appendChild(card);
    document.body.appendChild(wrap);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else { mount(); }
})();
