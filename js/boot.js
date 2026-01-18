// SCARLETT PERMA BOOT (demo)
(() => {
  const BUILD = "SCARLETT_PERMA_DEMO_v1_0";
  const $ = (s) => document.querySelector(s);
  const diagEl = $("#diag");
  const toastEl = $("#toast");

  const now = () => new Date().toISOString().split('T')[1].replace('Z','');
  const dwrite = (msg) => {
    try {
      if (!diagEl) return;
      const line = `[${now()}] ${String(msg)}`;
      diagEl.textContent += (diagEl.textContent ? "\n" : "") + line;
    } catch (_) {}
  };
  window.__scarlettDiagWrite = dwrite;

  const toast = (msg, ms=1600) => {
    if (!toastEl) return;
    toastEl.textContent = String(msg);
    toastEl.hidden = false;
    clearTimeout(toastEl.__t);
    toastEl.__t = setTimeout(() => (toastEl.hidden = true), ms);
  };
  window.__scarlettToast = toast;

  // quick environment fingerprint
  dwrite(`booting… BUILD=${BUILD}`);
  dwrite(`href=${location.href}`);
  dwrite(`secureContext=${window.isSecureContext}`);
  dwrite(`ua=${navigator.userAgent}`);
  dwrite(`touch=${'ontouchstart' in window} maxTouchPoints=${navigator.maxTouchPoints||0}`);

  // HUD buttons wiring (engine will also bind, but boot ensures they exist)
  const btnHideHUD = $("#btnHideHUD");
  if (btnHideHUD) {
    btnHideHUD.addEventListener('click', () => {
      const hud = $("#hud");
      if (!hud) return;
      const hidden = hud.classList.toggle('hidden');
      toast(hidden ? 'HUD hidden' : 'HUD shown');
    });
  }

  const btnDiag = $("#btnDiag");
  if (btnDiag) {
    btnDiag.addEventListener('click', () => {
      if (!diagEl) return;
      diagEl.hidden = !diagEl.hidden;
      toast(diagEl.hidden ? 'Diagnostics hidden' : 'Diagnostics shown');
    });
  }

  // Load main runtime
  const s = document.createElement('script');
  s.type = 'module';
  s.src = `./js/scarlett1/index.js?v=${encodeURIComponent(BUILD)}_${Date.now()}`;
  s.onerror = () => dwrite('ERROR: failed to load ./js/scarlett1/index.js');
  document.head.appendChild(s);
})();
