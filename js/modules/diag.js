export function createDiag() {
  const lines = [];
  const maxLines = 260;
  const diagText = document.getElementById("diagText");

  const write = (msg) => {
    const s = String(msg);
    lines.push(s);
    while (lines.length > maxLines) lines.shift();
    const out = lines.join("\n");
    if (diagText) diagText.textContent = out;
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

  const togglePanel = (show) => panel && panel.classList.toggle("hidden", !show);

  btnDiag?.addEventListener("click", () => togglePanel(true));
  btnDiagClose?.addEventListener("click", () => togglePanel(false));

  btnHideHUD?.addEventListener("click", () => {
    const hud = document.getElementById("hud");
    if (!hud) return;
    const hidden = hud.style.display === "none";
    hud.style.display = hidden ? "" : "none";
  });

  diag.write("[diag] UI hooked ✅");
}
