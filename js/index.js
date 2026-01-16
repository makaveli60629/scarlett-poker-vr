// /js/index.js — Scarlett Router FINAL (no probe)

const o = document.getElementById("overlay");
const log = (...a)=> o && (o.textContent += "\n[LOG] " + a.join(" "));
const err = (...a)=> o && (o.textContent += "\n[ERR] " + a.join(" "));

log("router booting…");

const entry = "./scarlett1/index.js?v=SCARLETT1_REAL_V1";

log("router -> importing:", entry);

try {
  await import(entry);
  log("scarlett1 runtime LOADED ✅");
} catch (e) {
  err("scarlett1 runtime FAILED ❌");
  err(e?.message || String(e));
}
