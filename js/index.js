// /js/index.js — Scarlett Router (FULL REAL)

const o = document.getElementById("overlay");
const log = (...a)=> o && (o.textContent += "\n[LOG] " + a.join(" "));
const err = (...a)=> o && (o.textContent += "\n[ERR] " + a.join(" "));

const entry = "./scarlett1/index.js?v=U4_2_REAL_BOOT";

log("router -> importing:", entry);

try {
  await import(entry);
  log("scarlett1 import OK ✅");
} catch (e) {
  err("scarlett1 import FAILED ❌");
  err(e?.message || String(e));
}
