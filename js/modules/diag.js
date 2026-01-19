// SCARLETTVR Diagnostics HUD (overlay + copy report)
// Build: V8 FULL
export const BUILD = "SCARLETTVR_POKER_DEMO_V8_FULL";

const lines = [];
let statusEl, hintEl, diagPanelEl, diagTextEl;

export function initDiagUI() {
  statusEl = document.getElementById('hudStatus');
  hintEl = document.getElementById('hudHint');
  diagPanelEl = document.getElementById('diagPanel');
  diagTextEl = document.getElementById('diagText');

  const btnDiag = document.getElementById('btnDiag');
  const btnCopy = document.getElementById('btnCopyDiag');
  const btnHardReload = document.getElementById('btnHardReload');

  btnDiag?.addEventListener('click', () => {
    diagPanelEl?.classList.toggle('hidden');
  });

  btnCopy?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(getReport());
      write('[hud] copied report ✅');
    } catch (_) {
      write('[hud] copy failed (clipboard blocked)');
    }
  });

  btnHardReload?.addEventListener('click', () => location.reload());

  // Global error capture (prevents "booting…" mystery failures)
  window.addEventListener('error', (e) => {
    try {
      write(`[window.error] ${e.message || e.type}`);
      if (e.error?.stack) write(e.error.stack);
    } catch (_) {}
  });
  window.addEventListener('unhandledrejection', (e) => {
    try {
      write('[unhandledrejection] ' + String(e.reason?.message || e.reason || 'unknown'));
      if (e.reason?.stack) write(e.reason.stack);
    } catch (_) {}
  });

  write(`=== SCARLETT DIAG ===`);
  write(`build=${BUILD}`);
  write(`href=${location.href}`);
  write(`secureContext=${String(window.isSecureContext)}`);
  write(`ua=${navigator.userAgent}`);
  write(`touch=${('ontouchstart' in window)} maxTouchPoints=${navigator.maxTouchPoints || 0}`);
  write(`navigator.xr=${String(!!navigator.xr)}`);
  render();
}

export function setStatus(msg) {
  if (statusEl) statusEl.textContent = String(msg);
}

export function setHint(msg) {
  if (hintEl) hintEl.textContent = String(msg);
}

export function write(msg) {
  const s = String(msg);
  const t = new Date().toLocaleTimeString([], { hour12: false });
  lines.push(`[${t}] ${s}`);
  if (lines.length > 800) lines.shift();
  render();
}

export function getReport() {
  return lines.join('\n');
}

function render() {
  if (!diagTextEl) return;
  diagTextEl.textContent = getReport();
}

// Allow legacy hooks
window.__scarlettDiagWrite = (msg) => write(msg);
window.SCARLETT = window.SCARLETT || {};
window.SCARLETT.BUILD = BUILD;
window.SCARLETT.diag = { write, getReport };

// Common alias
export const log = write;

// Global error capture (prevents silent black screens)
window.addEventListener('error', (ev) => {
  try {
    const msg = ev?.message || 'unknown error';
    write(`[window.error] ${msg}`);
    if (ev?.error?.stack) write(String(ev.error.stack).slice(0, 1200));
  } catch (_) {}
});

window.addEventListener('unhandledrejection', (ev) => {
  try {
    const reason = ev?.reason;
    write('[unhandledrejection] ' + (reason?.message || String(reason)));
    if (reason?.stack) write(String(reason.stack).slice(0, 1200));
  } catch (_) {}
});

// Global error capture (prevents silent black screens)
window.addEventListener('error', (ev) => {
  try { write('[window.error] ' + (ev?.message || 'unknown')); } catch (_) {}
});
window.addEventListener('unhandledrejection', (ev) => {
  try { write('[unhandledrejection] ' + String(ev?.reason?.message || ev?.reason || 'unknown')); } catch (_) {}
});
