// /js/scarlett1/modules/ui/hud_module.js
// UI HUD Module (FULL)
// - Adds a top-right HUD toggle (HUD: ON/OFF)
// - Hides/shows: #hud, #log, .hud, .touch-controls, [data-hud], etc.

export function createHUDModule({
  startOn = true,
  buttonTextOn = "HUD: ON",
  buttonTextOff = "HUD: OFF",
} = {}) {
  let visible = !!startOn;
  let btn = null;

  function setVisible(v) {
    visible = !!v;

    // Common hud targets
    const selectors = [
      "#hud",
      "#log",
      ".hud",
      ".HUD",
      ".touch-controls",
      ".touchControls",
      ".debug",
      ".diagnostic",
      "[data-hud]",
      "[data-debug]",
      "[data-overlay]",
      ".overlay",
      ".bootlog",
    ];

    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach(el => {
        el.style.display = visible ? "" : "none";
      });
    }

    if (btn) btn.textContent = visible ? buttonTextOn : buttonTextOff;
  }

  function ensureButton() {
    if (btn) return;

    btn = document.createElement("button");
    btn.textContent = visible ? buttonTextOn : buttonTextOff;

    btn.style.position = "fixed";
    btn.style.top = "12px";
    btn.style.right = "12px";
    btn.style.zIndex = "999999";
    btn.style.padding = "10px 14px";
    btn.style.borderRadius = "12px";
    btn.style.border = "1px solid rgba(255,255,255,0.18)";
    btn.style.background = "rgba(0,0,0,0.55)";
    btn.style.color = "white";
    btn.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Arial";
    btn.style.fontSize = "14px";
    btn.style.backdropFilter = "blur(6px)";
    btn.style.webkitBackdropFilter = "blur(6px)";

    btn.addEventListener("click", () => setVisible(!visible));
    document.body.appendChild(btn);

    // Apply initial state
    setVisible(visible);
  }

  return {
    name: "ui_hud",
    onEnable() {
      // DOM can load slightly after modules; retry once if needed
      ensureButton();
      setTimeout(ensureButton, 250);
      setTimeout(ensureButton, 1000);
    },
    setHUD(v) { setVisible(v); },
    isHUDOn() { return visible; },
  };
}
