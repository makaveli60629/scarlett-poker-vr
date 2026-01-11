// /boot.js — Scarlett VR Poker Boot (FULL)
(() => {
  const now = () => new Date().toTimeString().slice(0, 8);
  const logEl = document.getElementById("log");
  const xrEl = document.getElementById("xrstat");
  const modeEl = document.getElementById("modestat");

  const log = (msg) => {
    console.log(msg);
    if (!logEl) return;
    logEl.textContent += `${msg}\n`;
    logEl.scrollTop = logEl.scrollHeight;
  };

  const safe = (fn) => {
    try { fn(); } catch (e) { console.error(e); log(`[${now()}] [ERR] ${e?.message || e}`); }
  };

  safe(() => {
    log(`[${now()}] [BOOT] boot.js loaded ✅`);

    const xrOk = !!navigator.xr;
    if (xrEl) xrEl.textContent = `XR: ${xrOk ? "supported" : "not found"}`;
    if (modeEl) modeEl.textContent = `Mode: running`;

    const btnCopy = document.getElementById("copyBtn");
    const btnClear = document.getElementById("clearBtn");

    if (btnCopy) {
      btnCopy.onclick = async () => {
        try {
          await navigator.clipboard.writeText(logEl?.textContent || "");
        } catch (e) {
          console.warn(e);
        }
      };
    }

    if (btnClear) {
      btnClear.onclick = () => { if (logEl) logEl.textContent = ""; };
    }

    log(`[${now()}] [BOOT] importing ./js/index.js …`);
    import("./js/index.js").then(() => {
      log(`[${now()}] [BOOT] index.js imported ✅`);
    }).catch((e) => {
      console.error(e);
      log(`[${now()}] [BOOT] index.js import FAILED ❌ ${e?.message || e}`);
    });
  });
})();
