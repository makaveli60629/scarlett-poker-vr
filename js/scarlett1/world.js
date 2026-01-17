// /js/scarlett1/world.js
// SCARLETT WORLD — Orchestrator (LOCKED) v4.14_23MODULES
// Loads 23-module suite safely + provides __scarlettRunModuleTest

export async function bootWorld({ THREE, scene, rig, camera, renderer, HUD, DIAG }) {
  const log = (s) => { try { window.__scarlettDiagWrite?.(String(s)); } catch (_) {} };

  // One-time guard (prevents double world → double bots / too fast / duplicated UI)
  if (window.__SCARLETT_BOOTWORLD_ONCE__) {
    log('[world] bootWorld blocked (already ran)');
    return window.__SCARLETT_BOOTWORLD_LAST__ || { update(){} };
  }
  window.__SCARLETT_BOOTWORLD_ONCE__ = true;

  log('[world] bootWorld… SCARLETT1_WORLD_FULL_v4_14_23MODULES');

  // anchors
  const anchors = {
    root: new THREE.Group(),
    room: new THREE.Group(),
    stage: new THREE.Group(),
    table: new THREE.Group(),
    avatars: new THREE.Group(),
    ui: new THREE.Group(),
    debug: new THREE.Group(),
  };
  anchors.root.name = 'ANCHORS_ROOT';
  Object.entries(anchors).forEach(([k,g]) => g.name = `ANCHOR_${k.toUpperCase()}`);

  scene.add(anchors.root);
  anchors.root.add(anchors.room, anchors.stage, anchors.ui, anchors.debug);
  anchors.stage.add(anchors.table, anchors.avatars);

  // floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(500, 500),
    new THREE.MeshStandardMaterial({ color: 0x14171c, roughness: 1, metalness: 0 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.name = 'SCARLETT_FLOOR';
  scene.add(floor);

  // room shell
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(28, 28, 10, 96, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x0c0f14, roughness: 0.95, side: THREE.DoubleSide })
  );
  wall.position.y = 5;
  anchors.room.add(wall);

  // Provide engine references for modules
  window.SCARLETT = window.SCARLETT || {};
  window.SCARLETT.engine = window.SCARLETT.engine || {};
  window.SCARLETT.engine.rig = rig;

  // Controller nodes (handedness-safe; do NOT assume index order)
  try {
    const grip0 = renderer.xr.getControllerGrip(0);
    const grip1 = renderer.xr.getControllerGrip(1);
    grip0.name = 'GRIP_0';
    grip1.name = 'GRIP_1';
    rig.add(grip0);
    rig.add(grip1);

    const ray0 = renderer.xr.getController(0);
    const ray1 = renderer.xr.getController(1);
    ray0.name = 'RAY_0';
    ray1.name = 'RAY_1';
    rig.add(ray0);
    rig.add(ray1);

    function tag(node, label) {
      node.userData.handedness = 'unknown';
      node.addEventListener('connected', (e) => {
        node.userData.handedness = e?.data?.handedness || 'unknown';
        log(`[world] ${label} connected handedness=${node.userData.handedness}`);
      });
      node.addEventListener('disconnected', () => {
        node.userData.handedness = 'unknown';
      });
    }
    tag(ray0, 'ray0');
    tag(ray1, 'ray1');

    function resolveHands() {
      const rightRay = (ray0.userData.handedness === 'right') ? ray0
                    : (ray1.userData.handedness === 'right') ? ray1
                    : ray0;

      const leftRay  = (ray0.userData.handedness === 'left') ? ray0
                    : (ray1.userData.handedness === 'left') ? ray1
                    : ray1;

      window.SCARLETT.engine.rightRay = rightRay;
      window.SCARLETT.engine.leftRay  = leftRay;
      window.SCARLETT.engine.grip0 = grip0;
      window.SCARLETT.engine.grip1 = grip1;
    }

    resolveHands();
    try { renderer.xr.addEventListener?.('sessionstart', resolveHands); } catch (_) {}

  } catch (_) {}

  // ---- module orchestrator ----
  const MODULE_MANIFEST = [
    '../modules/environmentLighting.module.js',
    '../modules/pokerTable.module.js',
    '../modules/tableArt.module.js',
    '../modules/lobbyStations.module.js',

    '../modules/audioLogic.js',
    '../modules/gestureControl.js',
    '../modules/pokerAudio.module.js',

    '../modules/avatars.module.js',
    '../modules/avatarUI.module.js',
    '../modules/avatarAnimation.module.js',
    '../modules/avatarCustomization.module.js',

    '../modules/localPlayer.module.js',
    '../modules/interactionHands.module.js',

    '../modules/cards.module.js',
    '../modules/chips.module.js',
    '../modules/rulesTexasHoldem.module.js',
    '../modules/pokerGameplay.module.js',

    '../modules/menuUI.module.js',
    '../modules/hud.module.js',
    '../modules/settings.module.js',

    '../modules/slotsNet.module.js',
    '../modules/netSync.module.js',
    '../modules/lobbyMatchmaking.module.js'
  ];

  const modules = [];
  const status = {};

  const getId = (p) => p.replace(/^.*\//, '').replace(/\?.*$/, '');
  const setStatus = (id, patch) => {
    status[id] = Object.assign(status[id] || { ok: false, stage: 'new', error: '' }, patch);
  };

  async function safeImport(path) {
    const url = `${path}${path.includes('?') ? '&' : '?'}v=${Date.now()}`;
    return import(url);
  }

  async function loadModule(path) {
    const id = getId(path);
    setStatus(id, { stage: 'importing', ok: false, error: '' });
    try {
      const m = await safeImport(path);
      const api = m?.default || m;
      const rec = { id: api.id || id, path, api };
      modules.push(rec);
      setStatus(rec.id, { stage: 'ready', ok: true });
      if (typeof api.init === 'function') {
        await api.init({ THREE, scene, rig, camera, renderer, anchors, HUD, DIAG, log });
      }
      return rec;
    } catch (e) {
      setStatus(id, { stage: 'failed', ok: false, error: e?.message || String(e) });
      return null;
    }
  }

  async function runAllModuleTests() {
    const report = {
      ok: true,
      build: 'SCARLETT1_WORLD_FULL_v4_14_23MODULES',
      time: new Date().toISOString(),
      manifest: MODULE_MANIFEST.slice(),
      modules: []
    };

    for (const rec of modules) {
      const st = status[rec.id] || {};
      let test = { ok: true, note: 'no test()' };
      try {
        if (typeof rec.api.test === 'function') test = await rec.api.test({ THREE, scene, rig, camera, renderer, anchors, HUD, DIAG });
      } catch (e) {
        test = { ok: false, error: e?.message || String(e) };
      }
      const ok = !!st.ok && (test.ok !== false);
      if (!ok) report.ok = false;
      report.modules.push({ id: rec.id, path: rec.path, ...st, test });
    }

    return report;
  }

  window.__scarlettWorld = { anchors, modules, status, manifest: MODULE_MANIFEST };
  window.__scarlettRunModuleTest = runAllModuleTests;

  log(`[world] world: loading modules (${MODULE_MANIFEST.length})`);
  for (const p of MODULE_MANIFEST) await loadModule(p);
  log('[world] world: modules loaded ✅');

  const worldAPI = {
    update(dt) {
      for (const rec of modules) {
        try { rec.api.update?.(dt, { THREE, scene, rig, camera, renderer, anchors, HUD, DIAG }); } catch (_) {}
      }
    }
  };

  window.__SCARLETT_BOOTWORLD_LAST__ = worldAPI;
  return worldAPI;
}
