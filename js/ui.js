export const UI = {
  create(APP_STATE, diag){
    const hud = document.getElementById('hud');
    const panel = document.getElementById('panel');

    const btnEnterVR = document.getElementById('btnEnterVR');
    const btnHUD = document.getElementById('btnHUD');
    const btnTeleport = document.getElementById('btnTeleport');
    const btnDiag = document.getElementById('btnDiag');

    let handlers = {};

    function bind(h){
      handlers = h || {};

      btnEnterVR.onclick = () => handlers.onEnterVR?.();
      btnHUD.onclick = () => handlers.onToggleHUD?.();
      btnTeleport.onclick = () => handlers.onToggleTeleport?.();
      btnDiag.onclick = () => handlers.onToggleDiag?.();
    }

    function refreshButtons(){
      btnTeleport.textContent = `Teleport: ${APP_STATE.teleportEnabled ? 'ON' : 'OFF'}`;
      btnHUD.textContent = hud.style.display === 'none' ? 'Show HUD' : 'Hide HUD';
    }

    function toggleHUD(){
      const isHidden = hud.style.display === 'none';
      hud.style.display = isHidden ? 'flex' : 'none';
      refreshButtons();
    }

    function toggleDiagPanel(){
      panel.style.display = (panel.style.display === 'none' || !panel.style.display) ? 'block' : 'none';
      if(panel.style.display === 'block') panel.textContent = diag.render();
    }

    function onSessionStart(){
      diag.log('[UI] XR started');
      refreshButtons();
    }
    function onSessionEnd(){
      diag.log('[UI] XR ended');
      refreshButtons();
    }

    return { bind, refreshButtons, toggleHUD, toggleDiagPanel, onSessionStart, onSessionEnd };
  }
};
