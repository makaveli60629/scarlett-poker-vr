export function makeHUD({ log }) {
  // If your index.html already has these elements, we reuse them.
  // If it doesn’t, we create them.

  let app = document.getElementById("app");
  if (!app) {
    app = document.createElement("div");
    app.id = "app";
    document.body.appendChild(app);
  }

  let hud = document.getElementById("hud");
  let showBtn = document.getElementById("showHudBtn");
  if (!hud) {
    const css = document.createElement("style");
    css.textContent = `
      #hud{position:fixed;left:10px;top:10px;z-index:10;background:rgba(0,0,0,.72);color:#fff;border:1px solid rgba(255,255,255,.15);border-radius:12px;padding:10px;max-width:min(520px,calc(100vw - 20px));backdrop-filter:blur(6px)}
      #hud.hidden{display:none}
      #hud button{border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);color:#fff;padding:8px 10px;border-radius:10px;font-weight:700;margin-right:6px;margin-bottom:6px}
      #statusBox{white-space:pre-wrap;font-size:12px;line-height:1.35;border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:8px;background:rgba(0,0,0,.35);max-height:38vh;overflow:auto}
      #showHudBtn{position:fixed;left:10px;top:10px;z-index:11;display:none;border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.55);color:#fff;padding:10px 12px;border-radius:12px;font-weight:800}
    `;
    document.head.appendChild(css);

    hud = document.createElement("div");
    hud.id = "hud";
    hud.innerHTML = `
      <div style="font-weight:800;margin-bottom:6px;">Scarlett 1.0 — Diagnostics</div>
      <div>
        <button id="btnHideHUD">Hide HUD</button>
        <button id="btnCopyLogs">Copy Logs</button>
        <button id="btnReload">Reload</button>
      </div>
      <div id="statusBox">Booting…</div>
    `;
    document.body.appendChild(hud);

    showBtn = document.createElement("button");
    showBtn.id = "showHudBtn";
    showBtn.textContent = "Show HUD";
    document.body.appendChild(showBtn);
  }

  const statusBox = document.getElementById("statusBox");
  const btnHide = document.getElementById("btnHideHUD");
  const btnCopy = document.getElementById("btnCopyLogs");
  const btnReload = document.getElementById("btnReload");

  btnHide.onclick = () => {
    hud.classList.add("hidden");
    showBtn.style.display = "block";
  };

  showBtn.onclick = () => {
    hud.classList.remove("hidden");
    showBtn.style.display = "none";
  };

  btnReload.onclick = () => location.reload();

  btnCopy.onclick = async () => {
    const text = (window.__SCARLETT_LOGS__ || []).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      log("Logs copied ✅");
    } catch (e) {
      log("Copy blocked ❌ (printing logs below)");
      log(text);
    }
  };

  // Important: keep HUD from blocking touch movement too much
  // If you want HUD to be “click-only” and otherwise let touches pass:
  hud.style.pointerEvents = "auto";
  if (statusBox) statusBox.style.pointerEvents = "auto";
}
