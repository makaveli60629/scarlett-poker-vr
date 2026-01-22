
// js/boot.js
// Scarlett boot + HUD + Diagnostics. (A-Frame)
// HARDENED: ensures init always runs + buttons respond on Android (pointer/touch/click).
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
      try { console.log(line); } catch(_){}
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

  function onPress(el, fn){
    if (!el) return;
    const handler = (ev)=>{ 
      try { ev.preventDefault?.(); } catch(_){}
      try { fn(ev); } catch(e){ diag.log('[ui] handler error: ' + (e && e.message ? e.message : e)); }
    };
    // Pointer first (covers mouse + touch on modern browsers)
    el.addEventListener('pointerup', handler, { passive:false });
    // Touch fallback
    el.addEventListener('touchend', handler, { passive:false });
    // Click fallback
    el.addEventListener('click', handler, { passive:false });
  }

  function setPressed(btn, pressed){
    if (!btn) return;
    btn.setAttribute('aria-pressed', pressed ? 'true' : 'false');
  }

  function enterVR(){
    const scene = $('scene');
    if (!scene) return;
    try { scene.enterVR(); }
    catch(e){ diag.log('[vr] enterVR failed: ' + (e && e.message ? e.message : e)); }
  }

  function resetToSpawn(){
    const rig = $('rig');
    if (!rig) return;
    rig.setAttribute('position', '0 0 26');
    rig.setAttribute('rotation', '0 180 0');
    diag.log('[ui] reset spawn');
  }

  function toggleHUD(){
    const hud = $('hud');
    if (!hud) return;
    hud.style.display = (hud.style.display === 'none') ? 'block' : 'none';
    diag.log('[ui] toggle hud -> ' + hud.style.display);
  }

  function openJumboButtons(){
    // Emit event consumed by jumbotron module or show a simple alert fallback
    const scene = $('scene');
    if (scene) scene.emit('scarlett-jumbo-buttons');
    else alert('Jumbotron buttons not ready');
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

  let inited = false;
  function init(){
    if (inited) return;
    inited = true;

    diag.log('=== SCARLETT DIAGNOSTICS ===');
    diag.log('booting…');
    diag.log('href=' + location.href);
    diag.log('secureContext=' + (window.isSecureContext === true));
    diag.log('ua=' + navigator.userAgent);
    diag.log('touch=' + ('ontouchstart' in window) + ' maxTouchPoints=' + (navigator.maxTouchPoints || 0));
    diag.log('xr=' + (!!navigator.xr));

    const btnEnterVR = $('btnEnterVR');
    const btnTeleport = $('btnTeleport');
    const btnReset = $('btnReset');
    const btnHideHUD = $('btnHideHUD');
    const btnDiag = $('btnDiag');
    const btnDemo = $('btnDemo');
    const btnJumbo = $('btnJumbo');

    onPress(btnEnterVR, enterVR);
    onPress(btnReset, resetToSpawn);
    onPress(btnHideHUD, toggleHUD);
    onPress(btnDiag, ()=>diag.toggle());
    onPress(btnJumbo, openJumboButtons);

    // Teleport flag consumed by other modules
    window.SCARLETT_FLAGS = window.SCARLETT_FLAGS || {};
    window.SCARLETT_FLAGS.teleport = true;
    setPressed(btnTeleport, true);
    if (btnTeleport) btnTeleport.textContent = 'Teleport: ON';
    onPress(btnTeleport, ()=>{
      window.SCARLETT_FLAGS.teleport = !window.SCARLETT_FLAGS.teleport;
      setPressed(btnTeleport, window.SCARLETT_FLAGS.teleport);
      btnTeleport.textContent = 'Teleport: ' + (window.SCARLETT_FLAGS.teleport ? 'ON' : 'OFF');
      diag.log('[ui] teleport -> ' + (window.SCARLETT_FLAGS.teleport ? 'ON' : 'OFF'));
    });

    window.SCARLETT_FLAGS.demo = true;
    setPressed(btnDemo, true);
    if (btnDemo) btnDemo.textContent = 'Demo: ON';
    onPress(btnDemo, ()=>{
      window.SCARLETT_FLAGS.demo = !window.SCARLETT_FLAGS.demo;
      setPressed(btnDemo, window.SCARLETT_FLAGS.demo);
      btnDemo.textContent = 'Demo: ' + (window.SCARLETT_FLAGS.demo ? 'ON' : 'OFF');
      const scene = $('scene');
      if (scene) scene.emit('scarlett-demo-toggle', { enabled: window.SCARLETT_FLAGS.demo });
      diag.log('[ui] demo -> ' + (window.SCARLETT_FLAGS.demo ? 'ON' : 'OFF'));
    });

    const scene = $('scene');
    if (!scene) { diag.log('[boot] scene missing ❌'); return; }
    if (scene.hasLoaded) buildWorld();
    else scene.addEventListener('loaded', buildWorld, { once:true });

    // Quick visual marker: add attribute so you can verify JS ran
    document.documentElement.setAttribute('data-scarlett-boot', '1');
  }

  // Run init ASAP + multiple fallbacks (covers weird mobile timing)
  try { queueMicrotask(init); } catch(_){}
  try { setTimeout(init, 0); } catch(_){}
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else {
    init();
  }
})();
