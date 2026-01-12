// /js/boot.js — Scarlett Poker VR Boot (FULL + fail-safe)
// - Detects base path for GitHub Pages
// - Imports /js/index.js with cache-bust
// - Shows readable errors in #dbg

const $dbg = document.getElementById("dbg");
const log = (m, cls="") => {
  const line = document.createElement("div");
  if (cls) line.className = cls;
  line.textContent = m;
  $dbg?.appendChild(line);
  $dbg && ($dbg.scrollTop = $dbg.scrollHeight);
  console.log(m);
};

(function main(){
  try {
    log(`[BOOT] href=${location.href}`);
    log(`[BOOT] secureContext=${window.isSecureContext}`);
    log(`[BOOT] ua=${navigator.userAgent}`);

    // Base path for GitHub Pages repo: /scarlett-poker-vr/
    // If you ever rename repo, this still works.
    const parts = location.pathname.split("/").filter(Boolean);
    const repo = parts.length ? parts[0] : "";
    const base = repo ? `/${repo}/` : "/";
    window.__BASE_PATH__ = base;
    log(`[BOOT] path=${base}`);

    const v = Date.now();
    const entry = `${base}js/index.js?v=${v}`;
    log(`[BOOT] importing ${entry} …`);

    import(entry).then(() => {
      log(`[BOOT] index.js imported ✅`, "ok");
    }).catch((err) => {
      log(`[BOOT] index.js import FAILED ❌ ${err?.message || err}`, "bad");
      if (err?.stack) log(err.stack, "bad");
    });

  } catch (e) {
    log(`[BOOT] fatal ❌ ${e?.message || e}`, "bad");
    if (e?.stack) log(e.stack, "bad");
  }
})();
