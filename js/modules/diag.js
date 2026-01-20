export function createDiag() {
  const lines = [];
  const maxLines = 320;
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
  const btnCopy = document.getElementById("btnCopyDiag");

  const togglePanel = (show) => panel && panel.classList.toggle("hidden", !show);
  btnDiag?.addEventListener("click", () => togglePanel(true));
  btnDiagClose?.addEventListener("click", () => togglePanel(false));

  btnHideHUD?.addEventListener("click", () => {
    const hud = document.getElementById("hud");
    if (!hud) return;
    hud.style.display = (hud.style.display === "none") ? "" : "none";
  });

  btnCopy?.addEventListener("click", async () => {
    try {
      const text = (diag.lines || []).join("\n");
      await navigator.clipboard.writeText(text);
      diag.write("[diag] copied to clipboard ✅");
    } catch (e) {
      diag.write("[diag] copy failed ❌ " + (e?.message || e));
      // fallback select
      const el = document.getElementById("diagText");
      if (el) {
        const r = document.createRange();
        r.selectNodeContents(el);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(r);
      }
    }
  });

  diag.write("[diag] UI hooked ✅");
}
