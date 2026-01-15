// Scarlett 1.0 — Permanent Spine Boot
const V = Date.now();
const ROOT = new URL("../", import.meta.url).toString(); // points to /js/
const log = (...a) => {
  const line = a.map(x => (typeof x === "string" ? x : JSON.stringify(x))).join(" ");
  window.__SCARLETT_LOGS__ = window.__SCARLETT_LOGS__ || [];
  window.__SCARLETT_LOGS__.push(line);
  console.log("[S1BOOT]", ...a);
  const box = document.getElementById("statusBox");
  if (box) box.textContent += (box.textContent ? "\n" : "") + line;
};

window.addEventListener("error", (e) => log("window.error:", e?.message || e));
window.addEventListener("unhandledrejection", (e) => log("unhandledrejection:", e?.reason?.message || String(e?.reason || e)));

log(`BOOT v=${V}`);
log(`href=${location.href}`);
log(`ua=${navigator.userAgent}`);
log(`secureContext=${window.isSecureContext}`);
log(`ROOT(js)=${ROOT}`);
log(`navigator.xr=${!!navigator.xr}`);

(async () => {
  try {
    const mod = await import(`./index.js?v=${V}`);
    await mod.start({ V, ROOT, log });
    log("Spine start ✅");
  } catch (e) {
    log("Spine FAILED ❌", e?.message || e);
  }
})();
