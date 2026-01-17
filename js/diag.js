// js/diag.js — Scarlett Diagnostics v4.6
export const Diag = (() => {
  const panel = document.getElementById('diag');
  const logs = [];
  const maxLogs = 80;

  function ts() {
    const d = new Date();
    return d.toTimeString().slice(0,8);
  }

  function log(msg) {
    logs.push(`[${ts()}] ${msg}`);
    if (logs.length > maxLogs) logs.shift();
    if (panel && panel.style.display !== 'none') panel.textContent = render();
  }

  function render(state) {
    const s = state || window.APP_STATE || {};
    const header =
`MODULE TEST ✅
three=${!!s.three}
xr=${!!s.xr}
renderer=${!!s.renderer}
world=${!!s.world}
floors=${s.floors ?? 0}
inXR=${!!s.inXR}
touch=${!!s.touchOn}
build=${s.build || 'SCARLETT1_RUNTIME_ORCHESTRATED_v4_6'}

XR ORCHESTRATED (v4.6)
----------------------
BUILD=${s.build || 'SCARLETT1_RUNTIME_ORCHESTRATED_v4_6'}
inXR=${!!s.inXR}
teleportEnabled=${!!s.teleportEnabled}
touchOn=${!!s.touchOn}
floors=${s.floors ?? 0}

[LEFT]  connected=${!!(s.left && s.left.connected)} gamepad=${!!(s.left && s.left.gamepad)}
[RIGHT] connected=${!!(s.right && s.right.connected)} gamepad=${!!(s.right && s.right.gamepad)}

FPS=${s.fps ?? 0}

Logs
`;
    return header + logs.slice(-50).join('\n');
  }

  function tick(state) {
    if (panel && panel.style.display !== 'none') panel.textContent = render(state);
  }

  function toggle() {
    if (!panel) return;
    panel.style.display = (panel.style.display === 'none' || !panel.style.display) ? 'block' : 'none';
    if (panel.style.display !== 'none') panel.textContent = render();
  }

  return { log, tick, toggle };
})();
