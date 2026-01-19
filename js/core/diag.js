// SCARLETTVR Diagnostics HUD (overlay + copy report)
export const BUILD = "SCARLETTVR_DEMO_MODULES_v1_0";

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
    } catch (e) {
      write('[hud] copy failed (clipboard blocked)');
    }
  });

  btnHardReload?.addEventListener('click', () => {
    location.reload();
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
  const ts = new Date();
  const t = ts.toLocaleTimeString([], { hour12: false });
  lines.push(`[${t}] ${s}`);
  if (lines.length > 600) lines.shift();
  render();
}

export function getReport() {
  return lines.join('\n');
}

function render() {
  if (!diagTextEl) return;
  diagTextEl.textContent = getReport();
}

// Allow legacy hooks some of your earlier builds used
window.__scarlettDiagWrite = (msg) => write(msg);
window.SCARLETT = window.SCARLETT || {};
window.SCARLETT.BUILD = BUILD;
window.SCARLETT.diag = { write, getReport };

// Common alias
export const log = write;

