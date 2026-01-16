// /js/index.js — Router (FULL) -> loads Scarlett1 PROBE first

const o = document.getElementById("overlay");
const log = (...a)=> o && (o.textContent += "\n[LOG] " + a.join(" "));
const err = (...a)=> o && (o.textContent += "\n[ERR] " + a.join(" "));

const entry = "./scarlett1/probe.js?v=probe_full_1";

log("router -> importing:", entry);

try {
  await import(entry);
  log("probe import OK ✅");
} catch (e) {
  err("probe import FAILED ❌");
  err(e?.message || String(e));
}
