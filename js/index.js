// /js/index.js — Scarlett Legacy Entry (FULL)
// BUILD: INDEX_FULL_v4_3_SAFE
// Purpose: compatibility entry; delegates to boot.js

const BUILD = "INDEX_FULL_v4_3_SAFE";

const log = (...a) => console.log("[index]", ...a);
const err = (...a) => console.error("[index]", ...a);

function $(id) { return document.getElementById(id); }
function setStatus(s) {
  const el = $("status");
  if (el) el.textContent = s;
  console.log("[status]", s);
}

(async function main() {
  try {
    setStatus(`booting…\nlegacy index.js loaded\nbuild=${BUILD}`);
    log("delegating to /js/boot.js");
    // Delegate to boot.js so base-path + cachebust stays centralized
    await import(`./boot.js?v=${Date.now()}`);
  } catch (e) {
    err("INDEX FAIL", e);
    setStatus(`INDEX FAIL ❌\n${e?.message || String(e)}`);
  }
})();
