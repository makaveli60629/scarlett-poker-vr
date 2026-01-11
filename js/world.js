// /js/world.js — Scarlett VR Poker HybridWorld 1.0 (FULL, Quest-safe loader)
// ✅ No XR calls here (XR stays in index.js)
// ✅ Dynamic imports (modules optional; failures won’t break XR)
// ✅ Options supported (from FULL index): safeMode, allowBots, allowPoker, allowTeleport, nonvrControls
// ✅ Safe rebuild + root cleanup + prevents double-parenting hands
// ✅ Android/Desktop fallback controls (WASD + drag-look) auto-disabled in XR

export const HybridWorld = (() => {
  const state = {
    THREE: null,
    renderer: null,
    camera: null,
    player: null,
    controllers: null,
    log: console.log,

    scene: null,
    clock: null,

    OPTS: {
      autobuild: true,
      nonvrControls: true,
      allowTeleport: true,
      allowBots: true,
      allowPoker: true,
      safeMode: false
    },

    // loaded modules
    mods: {},
    systems: {},

    // anchors / refs
    root: null,
    floor: null,
    spawn: null,
    facingTarget: null,

    built: false
  };

  function safeLog(...a) {
    try { state.log?.(...a); } catch (e) {}
  }

  function initAnchorsIfNeeded() {
    if (!state.spawn) state.spawn = new state.THREE.Vector3(0, 0, 26);
    if (!state.facingTarget) state.facingTarget = new state.THREE.Vector3(0, 1.5, 0);
  }

  function optsAllow(key) {
    if (state.OPTS?.safeMode) return false;
    return state.OPTS?.[key] !== false;
  }

  function makeBaseScene() {
    const THREE = state.THREE;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05060a);

    // Lighting (never black)
    scene.add(new THREE.HemisphereLight(0x9fb3ff, 0x0b0d14, 1.0));
    const dir = new THREE.DirectionalLight(0xffffff, 0.7);
    dir.position.set(4, 10, 3);
    scene.add(dir);

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120),
      new THREE.MeshStandardMaterial({
        color: 0x0b0d14,
        roughness: 0.95,
        metalness: 0
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.name = "Floor";
    scene.add(floor);
    state.floor = floor;

    // Landmark ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.2, 0.08, 12, 64),
      new THREE.MeshStandardMaterial({
        color: 0x7fe7ff,
        roughness: 0.35,
        metalness: 0.35
      })
    );
    ring.position.set(0, 1.4, 0);
    ring.name = "LandmarkRing";
    scene.add(ring);

    return scene;
  }

  async function tryImport(path) {
    try {
      const mod = await import(path);
      safeLog("[world] import ok:", path);
      return mod;
    } catch (e) {
      safeLog("[world] import FAIL:", path, e?.message || e);
      return null;
    }
  }

  function setSpawnAndFacing() {
    initAnchorsIfNeeded();

    const { player, camera } = state;

    // player rig spawn
    player.position.set(state.spawn.x, 0, state.spawn.z);
    camera.position.set(0, 1.65, 0);

    // Face target
    const target = state.facingTarget.clone();
    const camWorld = new state.THREE.Vector3();
    camera.getWorldPosition(camWorld);

    const look = target.sub(camWorld).normalize();
    const yaw = Math.atan2(look.x, look.z);
    player.rotation.set(0, yaw, 0);

    safeLog("[world] Spawn ✅", `x=${state.spawn.x.toFixed(2)}`, `z=${state.spawn.z.toFixed(2)}`);
    safeLog("[world] Facing target ✅ (BossTable)");
  }

  function disposeRoot() {
    if (!state.root) return;

    try {
      state.scene?.remove(state.root);
      state.root.traverse?.((obj) => {
        if (obj.geometry?.dispose) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m?.dispose?.());
          else obj.material?.dispose?.();
        }
      });
    } catch (e) {}

    state.root = null;
  }

  async function buildRealSystems() {
    const THREE = state.THREE;

    // IMPORTANT: Never import "./world.js" from inside world.js (recursion risk)
    // (intentionally not doing that)

    const bossTableMod = await tryImport("./boss_table.js");
    const tableFactoryMod = await tryImport("./table_factory.js"); // optional, kept for compatibility
    const botsMod = await tryImport("./bots.js");
    const pokerSimMod = await tryImport("./poker_sim.js");
    const roomMgrMod = await tryImport("./room_manager.js");

    // Teleport: support both file names used across versions
    const teleportMachineMod = await tryImport("./teleport_machine.js");
    const teleportMod = await tryImport("./teleport.js");

    state.mods = {
      bossTableMod,
      tableFactoryMod,
      botsMod,
      pokerSimMod,
      roomMgrMod,
      teleportMachineMod,
      teleportMod
    };

    // Root container for everything
    disposeRoot();
    const root = new THREE.Group();
    root.name = "HybridRoot";
    state.scene.add(root);
    state.root = root;

    // ===== Table =====
    let tableObj = null;

    // BossTable export compatibility:
    // - export const BossTable = { init(){} }
    // - export default { init(){} }
    // - export function createBossTable(ctx) {}  (treated like init)
    const BossTableAPI =
      bossTableMod?.BossTable ||
      bossTableMod?.default ||
      (bossTableMod?.createBossTable ? { init: bossTableMod.createBossTable } : null);

    if (BossTableAPI?.init) {
      try {
        tableObj = await BossTableAPI.init({
          THREE,
          scene: state.scene,
          root,
          log: state.log
        });
        safeLog("[table] BossTable.init ✅");
      } catch (e) {
        safeLog("[table] BossTable.init FAIL", e?.message || e);
      }
    }

    // Fallback placeholder table if missing
    if (!tableObj) {
      const t = new THREE.Mesh(
        new THREE.CylinderGeometry(2.2, 2.2, 0.25, 32),
        new THREE.MeshStandardMaterial({ color: 0x102018, roughness: 0.9 })
      );
      t.position.set(0, 1.05, 0);
      t.name = "PlaceholderTable";
      root.add(t);
      safeLog("[table] placeholder ✅");
      tableObj = t;
    }

    // ===== Bots =====
    if (!optsAllow("allowBots")) {
      safeLog("[bots] skipped by options");
    } else if (botsMod?.Bots?.init) {
      try {
        state.systems.bots = await botsMod.Bots.init({
          THREE,
          scene: state.scene,
          root,
          player: state.player,
          log: state.log
        });
        safeLog("[bots] Bots.init ✅");
      } catch (e) {
        safeLog("[bots] Bots.init FAIL", e?.message || e);
      }
    } else {
      safeLog("[bots] module missing — skipping");
    }

    // ===== PokerSim =====
    if (!optsAllow("allowPoker")) {
      safeLog("[poker] skipped by options");
    } else if (pokerSimMod?.PokerSim?.init) {
      try {
        state.systems.poker = await pokerSimMod.PokerSim.init({
          THREE,
          scene: state.scene,
          root,
          table: tableObj,
          player: state.player,
          camera: state.camera,
          log: state.log
        });
        safeLog("[poker] PokerSim.init ✅ spectate");
      } catch (e) {
        safeLog("[poker] PokerSim.init FAIL", e?.message || e);
      }
    } else {
      safeLog("[poker] module missing — skipping");
    }

    // ===== RoomManager =====
    if (roomMgrMod?.RoomManager?.init) {
      try {
        state.systems.room = await roomMgrMod.RoomManager.init({
          THREE,
          scene: state.scene,
          root,
          player: state.player,
          camera: state.camera,
          systems: state.systems,
          log: state.log
        });
        safeLog("[rm] init ✅ room=lobby");
      } catch (e) {
        safeLog("[rm] init FAIL", e?.message || e);
      }
    } else {
      safeLog("[rm] module missing — skipping");
    }

    // ===== Teleport =====
    if (!optsAllow("allowTeleport")) {
      safeLog("[teleport] skipped by options");
    } else {
      const tp = teleportMachineMod?.TeleportMachine || teleportMod?.Teleport;
      if (tp?.init) {
        try {
          state.systems.teleport = await tp.init({
            THREE,
            scene: state.scene,
            renderer: state.renderer,
            camera: state.camera,
            player: state.player,
            controllers: state.controllers,
            log: state.log,
            world: { floor: state.floor, root }
          });
          safeLog("[teleport] init ✅");
        } catch (e) {
          safeLog("[teleport] init FAIL", e?.message || e);
        }
      } else {
        safeLog("[teleport] module missing — skipping");
      }
    }
  }

  // Android / non-VR fallback movement (WASD + drag-look)
  function installNonVRControls() {
    // Install only once
    if (state.systems.nonvr?.__installed) return;

    const { camera, player } = state;
    const keys = new Set();
    let dragging = false;
    let lastX = 0, lastY = 0;
    let yaw = 0, pitch = 0;

    const onKeyDown = (e) => keys.add(e.code);
    const onKeyUp = (e) => keys.delete(e.code);
    const onDown = (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; };
    const onUp = () => { dragging = false; };
    const onMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      yaw -= dx * 0.003;
      pitch -= dy * 0.003;
      pitch = Math.max(-1.2, Math.min(1.2, pitch));
      player.rotation.y = yaw;
      camera.rotation.x = pitch;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointermove", onMove);

    state.systems.nonvr = {
      __installed: true,
      __keys: keys,
      update(dt) {
        // only apply when NOT in XR
        if (state.renderer?.xr?.isPresenting) return;

        const speed = (keys.has("ShiftLeft") ? 6 : 3) * dt;
        const fwd = (keys.has("KeyW") ? 1 : 0) + (keys.has("KeyS") ? -1 : 0);
        const str = (keys.has("KeyD") ? 1 : 0) + (keys.has("KeyA") ? -1 : 0);

        if (!fwd && !str) return;

        const dir = new state.THREE.Vector3();
        player.getWorldDirection(dir);
        dir.y = 0; dir.normalize();

        const right = new state.THREE.Vector3(dir.z, 0, -dir.x);

        player.position.addScaledVector(dir, fwd * speed);
        player.position.addScaledVector(right, str * speed);
      }
    };

    safeLog("[nonvr] controls ✅ (WASD + drag look)");
  }

  return {
    async build({ THREE, renderer, camera, player, controllers, log, OPTS }) {
      state.THREE = THREE;
      state.renderer = renderer;
      state.camera = camera;
      state.player = player;
      state.controllers = controllers;
      state.log = log || console.log;

      // options passed from FULL index.js
      state.OPTS = { ...state.OPTS, ...(OPTS || {}) };

      state.clock = new THREE.Clock();
      initAnchorsIfNeeded();

      // fresh scene every build
      state.scene = makeBaseScene();

      // ensure player is in scene
      if (!state.scene.children.includes(player)) state.scene.add(player);

      // hands: avoid double-parenting on rebuild
      try {
        if (controllers?.handLeft && controllers.handLeft.parent !== player) player.add(controllers.handLeft);
        if (controllers?.handRight && controllers.handRight.parent !== player) player.add(controllers.handRight);
      } catch (e) {}

      setSpawnAndFacing();

      if (state.OPTS.nonvrControls !== false) installNonVRControls();
      else safeLog("[nonvr] controls disabled by options");

      await buildRealSystems();

      state.built = true;
      safeLog("[world] Hybrid 1.0 built ✅");
      safeLog("[world] opts=", state.OPTS);
    },

    async rebuild(ctx) {
      state.built = false;

      // attempt to call destroy hooks if systems provide them
      try { state.systems.teleport?.dispose?.(); } catch (e) {}
      try { state.systems.bots?.dispose?.(); } catch (e) {}
      try { state.systems.poker?.dispose?.(); } catch (e) {}
      try { state.systems.room?.dispose?.(); } catch (e) {}

      state.mods = {};
      state.systems = {};
      disposeRoot();

      await this.build(ctx);
    },

    frame({ renderer, camera }) {
      if (!state.scene) return;

      const dt = state.clock ? state.clock.getDelta() : 0.016;

      // update optional systems (guarded)
      try { state.systems.nonvr?.update?.(dt); } catch (e) {}
      try { state.systems.bots?.update?.(dt); } catch (e) {}
      try { state.systems.poker?.update?.(dt); } catch (e) {}
      try { state.systems.room?.update?.(dt); } catch (e) {}
      try { state.systems.teleport?.update?.(dt); } catch (e) {}

      renderer.render(state.scene, camera);
    }
  };
})();
