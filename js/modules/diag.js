// js/modules/diag.js
export function createDiag() {
  const lines = [];
  const maxLines = 240;

  const diagText = document.getElementById("diagText");
  const vrDiagText = document.getElementById("vrDiagText");

  const write = (msg) => {
    const s = String(msg);
    lines.push(s);
    while (lines.length > maxLines) lines.shift();
    const out = lines.join("\n");
    if (diagText) diagText.textContent = out;
    if (vrDiagText) vrDiagText.setAttribute("value", out);
    try { console.log(s); } catch (_) {}
  };

  window.__scarlettDiagWrite = write;
  return { write, lines };
}

export function hookDiagUI(diag) {
  const panel = document.getElementById("diagPanel");
  const btnDiag = document.getElementById("btnDiag");
  const btnDiagClose = document.getElementById("btnDiagClose");
  const btnHideHUD = document.getElementById("btnHideHUD");

  const togglePanel = (show) => {
    if (!panel) return;
    panel.classList.toggle("hidden", !show);
  };

  btnDiag?.addEventListener("click", () => togglePanel(true));
  btnDiagClose?.addEventListener("click", () => togglePanel(false));
  btnHideHUD?.addEventListener("click", () => {
    const hud = document.getElementById("hud");
    if (!hud) return;
    const hidden = hud.style.display === "none";
    hud.style.display = hidden ? "" : "none";
  });

  // If user holds on screen, open diag
  let pressT = 0;
  window.addEventListener("touchstart", () => { pressT = performance.now(); }, {passive:true});
  window.addEventListener("touchend", () => {
    if (performance.now() - pressT > 700) togglePanel(true);
  }, {passive:true});

  diag.write("[diag] UI hooked ✅");
}
