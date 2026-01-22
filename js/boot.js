// js/boot.js
// Scarlett boot + HUD + Diagnostics. (A-Frame)
(function(){
  const t0 = performance.now();

  const diag = {
    lines: [],
    enabled: false,
    log(msg){
      const dt = ((performance.now()-t0)/1000).toFixed(3);
      const line = `[${dt}] ${msg}`;
      this.lines.push(line);
      const panel = document.getElementById('diagPanel');
      if (panel && this.enabled) panel.textContent = this.lines.join('\n');
      // Always mirror to console for remote debugging
      try { console.log(line); } catch(_){/*noop*/}
    },
    toggle(){
      this.enabled = !this.enabled;
      const panel = document.getElementById('diagPanel');
      if (!panel) return;
      panel.style.display = this.enabled ? 'block' : 'none';
      if (this.enabled) panel.textContent = this.lines.join('\n');
    }
  };
  window.SCARLETT_DIAG = diag;

  function $(id){ return document.getElementById(id); }

  function setPressed(btn, pressed){
    if (!btn) return;
    btn.setAttribute('aria-pressed', pressed ? 'true' : 'false');
  }

  function enterVR(){
    // A-Frame WebXR: enter-vr works when supported
    const scene = $('scene');
    if (!scene) return;
    try {
      scene.enterVR();
    } catch(e){
      diag.log('[vr] enterVR failed: ' + (e && e.message ? e.message : e));
    }
  }

  function resetToSpawn(){
    const rig = $('rig');
    if (!rig) return;
    rig.setAttribute('position', '0 0 26');
    rig.setAttribute('rotation', '0 180 0');
  }

  function toggleHUD(){
    const hud = $('hud');
    if (!hud) return;
    hud.style.display = (hud.style.display === 'none') ? 'block' : 'none';
  }

  function buildWorld(){
    try {
      if (window.SCARLETT_WORLD && typeof window.SCARLETT_WORLD.build === 'function') {
        window.SCARLETT_WORLD.build();
        const scene = $('scene');
        if (scene) scene.emit('scarlett-world-built');
        diag.log('[boot] world built ✅');
      } else {
        diag.log('[boot] SCARLETT_WORLD.build missing ❌');
      }
    } catch(e){
      diag.log('[boot] world build error ❌ ' + (e && e.stack ? e.stack : e));
    }
  }

  function init(){
    diag.log('=== SCARLETT DIAGNOSTICS ===');
    diag.log('booting…');
    diag.log('href=' + location.href);
    diag.log('secureContext=' + (window.isSecureContext === true));
    diag.log('ua=' + navigator.userAgent);
    diag.log('touch=' + ('ontouchstart' in window) + ' maxTouchPoints=' + (navigator.maxTouchPoints || 0));
    diag.log('xr=' + (!!navigator.xr));

    // Buttons
    const btnEnterVR = $('btnEnterVR');
    const btnTeleport = $('btnTeleport');
    const btnReset = $('btnReset');
    const btnHideHUD = $('btnHideHUD');
    const btnDiag = $('btnDiag');
    const btnDemo = $('btnDemo');

    if (btnEnterVR) btnEnterVR.addEventListener('click', enterVR);
    if (btnReset) btnReset.addEventListener('click', resetToSpawn);
    if (btnHideHUD) btnHideHUD.addEventListener('click', toggleHUD);
    if (btnDiag) btnDiag.addEventListener('click', ()=>diag.toggle());

    // Teleport flag consumed by other modules
    window.SCARLETT_FLAGS = window.SCARLETT_FLAGS || {};
    window.SCARLETT_FLAGS.teleport = true;
    setPressed(btnTeleport, true);
    if (btnTeleport) btnTeleport.addEventListener('click', ()=>{
      window.SCARLETT_FLAGS.teleport = !window.SCARLETT_FLAGS.teleport;
      setPressed(btnTeleport, window.SCARLETT_FLAGS.teleport);
      btnTeleport.textContent = 'Teleport: ' + (window.SCARLETT_FLAGS.teleport ? 'ON' : 'OFF');
    });

    window.SCARLETT_FLAGS.demo = true;
    setPressed(btnDemo, true);
    if (btnDemo) btnDemo.addEventListener('click', ()=>{
      window.SCARLETT_FLAGS.demo = !window.SCARLETT_FLAGS.demo;
      setPressed(btnDemo, window.SCARLETT_FLAGS.demo);
      btnDemo.textContent = 'Demo: ' + (window.SCARLETT_FLAGS.demo ? 'ON' : 'OFF');
      const scene = $('scene');
      if (scene) scene.emit('scarlett-demo-toggle', { enabled: window.SCARLETT_FLAGS.demo });
    });

    // Build world once scene is ready
    const scene = $('scene');
    if (!scene) return;
    if (scene.hasLoaded) {
      buildWorld();
    } else {
      scene.addEventListener('loaded', buildWorld, { once: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
