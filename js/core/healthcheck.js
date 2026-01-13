// /js/core/healthcheck.js — Prime 10.0 (FULL)
// Emits DEBUG_DUMP output: base path, flags, xr support, and important DOM/HUD checks.

export const Healthcheck = (() => {
  function init({ Signals, manifest, log }) {
    Signals.on("DEBUG_DUMP", () => {
      const info = {
        base: window.SCARLETT_BASE || "/",
        secure: window.isSecureContext,
        xr: !!navigator.xr,
        ua: navigator.userAgent,
        flags: manifest.get("flags"),
        textures: {
          cardBack: manifest.resolve("textures.cardBack"),
          chip: manifest.resolve("textures.chip"),
          tableTop: manifest.resolve("textures.tableTop")
        },
        hud: {
          hud: !!document.getElementById("hud"),
          hudLog: !!document.getElementById("hud-log"),
          enterVrBtn: !!document.getElementById("enterVrBtn")
        }
      };
      log?.(`[health] ${JSON.stringify(info)}`);
      Signals.emit("UI_MESSAGE", { text: "Healthcheck dumped to log", level: "info" });
    });

    // dump once at start
    Signals.emit("DEBUG_DUMP", {});
    log?.("[health] init ✅");
  }

  return { init };
})();
