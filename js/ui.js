// js/ui.js — HUD bindings
export const UI = (() => {
  function bind({ onEnterVR, onToggleHud, onToggleTeleport, onToggleDiag }) {
    const enterVrBtn = document.getElementById('enterVrBtn');
    const hideHudBtn = document.getElementById('hideHudBtn');
    const teleBtn = document.getElementById('teleBtn');
    const diagBtn = document.getElementById('diagBtn');
    const hud = document.getElementById('hud');

    if (enterVrBtn) enterVrBtn.onclick = () => onEnterVR && onEnterVR();
    if (hideHudBtn) hideHudBtn.onclick = () => {
      if (!hud) return;
      const visible = hud.style.display !== 'none';
      hud.style.display = visible ? 'none' : 'flex';
      onToggleHud && onToggleHud(!visible);
    };
    if (teleBtn) teleBtn.onclick = () => {
      const enabled = onToggleTeleport ? onToggleTeleport() : false;
      teleBtn.textContent = enabled ? 'Teleport: ON' : 'Teleport: OFF';
    };
    if (diagBtn) diagBtn.onclick = () => onToggleDiag && onToggleDiag();
  }

  function setTeleportButton(enabled) {
    const teleBtn = document.getElementById('teleBtn');
    if (teleBtn) teleBtn.textContent = enabled ? 'Teleport: ON' : 'Teleport: OFF';
  }

  return { bind, setTeleportButton };
})();
