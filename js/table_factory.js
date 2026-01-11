// /js/world.js — Scarlett VR Poker HybridWorld 1.1 (FULL, Quest-safe, modular)
// ✅ Exports: { HybridWorld }
// ✅ VR Panel is OFF by default (enable only if you want it)
// ✅ Never-black base scene
// ✅ Optional modules won't crash if missing
// ✅ Android/desktop nonvr controls supported (WASD + drag look) — touch is handled in index.js

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
      allowStream: true,
      safeMode: false,

      // ✅ NEW: VR panel toggle (OFF by default)
      enableVRPanel: false
    },

    // anchors
    spawn: null,
    facingTarget: null,

    // containers
    root: null,
    floor: null,

    // loaded modules + systems
    mods: {},
    systems: {},

    built: false
  };

  // -----------------------
  // helpers
  // -----------------------
  function safeLog(...a) { try { state.log?.(...a); } catch(e) {} }

  function initAnchorsIfNeeded() {
    const THREE = state.THREE;
    if (!state.spawn) state.spawn = new THREE.Vector3(0, 0, 26);
    if (!state.facingTarget) state.facingTarget = new THREE.Vector3(0, 1.5, 0);
  }

  function optsAllow(key) {
    if (state.OPTS?.safeMode) return false;
    return state.OPTS?.[key] !== false;
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

  function disposeObject3D(obj) {
    if (!obj) return;
    try {
      obj.traverse?.((o) => {
        if (o.geometry?.dispose) o.geometry.dispose();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach(m => m?.dispose?.());
          else o.material?.dispose?.();
        }
      });
    } catch(e) {}
  }

  // -----------------------
  // Base scene (never black)
  // -----------------------
  function makeBaseScene() {
    const THREE = state.THREE;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05060a);

    // lights
    scene.add(new THREE.HemisphereLight(0x9fb3ff, 0x0b0d14, 1.0));
    const dir = new THREE.DirectionalLight(0xffffff, 0.85);
    dir.position.set(4, 10, 3);
    scene.add(dir);

    // floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(140, 140),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.95, metalness: 0.0 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.name = "Floor";
    scene.add(floor);
    state.floor = floor;

    // landmark ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.2, 0.08, 12, 64),
      new THREE.MeshStandardMaterial({ color: 0x7fe7ff, roughness: 0.35, metalness: 0.25 })
    );
    ring.position.set(0, 1.4, 0);
    ring.name = "LobbyRing";
    scene.add(ring);

    return scene;
  }

  function setSpawnAndFacing() {
    initAnchorsIfNeeded();
    const { player, camera, THREE } = state;

    // HARD ground-safe spawn by default (prevents “I’m in the air”)
    player.position.set(state.spawn.x, 0.02, state.spawn.z);
    camera.position.set(0, 1.65, 0);

    // face target
    const target = state.facingTarget.clone();
    const camWorld = new THREE.Vector3();
    camera.getWorldPosition(camWorld);

    const look = target.sub(camWorld).normalize();
    const yaw = Math.atan2(look.x, look.z);
    player.rotation.set(0, yaw, 0);

    safeLog("[spawn] HARD ✅", `x=${player.position.x.toFixed(2)}`, `y=${player.position.y.toFixed(2)}`, `z=${player.position.z.toFixed(2)}`);
  }

  function ensureRoot() {
    const THREE = state.THREE;
    if (state.root && state.root.parent === state.scene) return state.root;

    const root = new THREE.Group();
    root.name = "HybridRoot";
    state.scene.add(root);
    state.root = root;
    return root;
  }

  // -----------------------
  // Streaming system (optional)
  // -----------------------
  const Stream = (() => {
    const CHANNELS = [
      { id: "groove", name: "Groove Salad", url: "https://hls.somafm.com/hls/groovesalad/128k/program.m3u8" },
      { id: "lush",   name: "Lush",         url: "https://hls.somafm.com/hls/lush/128k/program.m3u8" },
    ];

    const st = {
      enabled: true,
      url: CHANNELS[0].url,
      maxDist: 15,

      video: null,
      hls: null,
      texture: null,
      screen: null,

      audioStarted: false,
      lastVol: -1
    };

    function ensureVideoEl() {
      if (st.video) return st.video;
      const v = document.getElementById("streamSource") || document.createElement("video");
      v.id = v.id || "streamSource";
      v.crossOrigin = "anonymous";
      v.playsInline = true;
      v.loop = true;
      v.autoplay = false;
      v.muted = false;
      v.preload = "auto";
      st.video = v;
      return v;
    }

    function destroyHls() {
      try { st.hls?.destroy?.(); } catch(e) {}
      st.hls = null;
    }

    function load(url) {
      st.url = url;
      const video = ensureVideoEl();
      destroyHls();

      const HlsRef = window.Hls;
      if (HlsRef && typeof HlsRef.isSupported === "function" && HlsRef.isSupported()) {
        const hls = new HlsRef({ enableWorker: true, lowLatencyMode: false });
        hls.loadSource(url);
        hls.attachMedia(video);
        st.hls = hls;
        safeLog("[stream] Hls.js attached ✅", url);
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = url;
        safeLog("[stream] native HLS ✅", url);
      } else {
        safeLog("[stream] HLS not supported ❌");
      }
    }

    function buildScreen(THREE, root) {
      const video = ensureVideoEl();
      if (!st.texture) {
        st.texture = new THREE.VideoTexture(video);
        try { st.texture.colorSpace = THREE.SRGBColorSpace; } catch(e) {}
      }
      const geo = new THREE.PlaneGeometry(16, 9);
      const mat = new THREE.MeshBasicMaterial({ map: st.texture, color: 0xffffff });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = "LobbyScreen";
      mesh.position.set(0, 2.55, -6.25);
      root.add(mesh);
      st.screen = mesh;
      safeLog("[stream] screen built ✅");
    }

    async function startAudio() {
      if (!st.enabled) throw new Error("stream disabled");
      const video = ensureVideoEl();
      if ((!video.src || video.src === "") && !st.hls) load(st.url);
      await video.play();
      st.audioStarted = true;
      safeLog("[stream] play ✅");
    }

    function setChannel(url) {
      if (!st.enabled) return;
      load(url);
      safeLog("[stream] channel set", url);
    }

    function updateSpatial(listenerPos) {
      if (!st.enabled) return;
      if (!st.video || !st.screen) return;

      const dist = listenerPos.distanceTo(st.screen.position);
      const vol = st.audioStarted ? Math.max(0, 1 - (dist / st.maxDist)) : 0;

      if (Math.abs(vol - st.lastVol) > 0.01) {
        st.video.volume = vol;
        st.lastVol = vol;
      }
    }

    function dispose() {
      destroyHls();
      try { st.texture?.dispose?.(); } catch(e) {}
      st.texture = null;
      try { if (st.screen?.parent) st.screen.parent.remove(st.screen); } catch(e) {}
      st.screen = null;
      st.audioStarted = false;
      st.lastVol = -1;
    }

    return {
      CHANNELS,
      enable(v) { st.enabled = !!v; },
      init({ THREE, root }) {
        if (!st.enabled) return;
        load(st.url);
        buildScreen(THREE, root);
      },
      startAudio,
      setChannel,
      updateSpatial,
      dispose
    };
  })();

  async function startAudio() { return Stream.startAudio(); }

  // -----------------------
  // Optional module build
  // -----------------------
  async function buildModules() {
    const THREE = state.THREE;
    const root = ensureRoot();

    // wipe root children each build
    if (root.children.length) {
      for (let i = root.children.length - 1; i >= 0; i--) {
        const c = root.children[i];
        root.remove(c);
        disposeObject3D(c);
      }
    }

    // imports
    const spawnMod        = await tryImport("./spawn_points.js");
    const decorMod        = await tryImport("./lobby_decor.js");
    const wallsMod        = await tryImport("./solid_walls.js");
    const storeMod        = await tryImport("./store.js");
    const scorpionMod     = await tryImport("./scorpion_room.js");
    const bossTableMod    = await tryImport("./boss_table.js");
    const tableFactoryMod = await tryImport("./table_factory.js");
    const botsMod         = await tryImport("./bots.js");
    const pokerSimMod     = await tryImport("./poker_sim.js");
    const roomMgrMod      = await tryImport("./room_manager.js");
    const tpMachineMod    = await tryImport("./teleport_machine.js");
    const tpMod           = await tryImport("./teleport.js");

    state.mods = {
      spawnMod, decorMod, wallsMod, storeMod, scorpionMod,
      bossTableMod, tableFactoryMod, botsMod, pokerSimMod,
      roomMgrMod, tpMachineMod, tpMod
    };

    // spawn points
    try {
      const SP = spawnMod?.SpawnPoints || spawnMod?.default;
      if (SP?.apply) {
        SP.apply({ THREE, root, player: state.player, log: state.log });
        safeLog("[spawn] SpawnPoints applied ✅");
      }
    } catch (e) {
      safeLog("[spawn] SpawnPoints apply FAIL", e?.message || e);
    }

    // lobby decor
    try {
      const Decor = decorMod?.LobbyDecor || decorMod?.default;
      if (Decor?.init) {
        await Decor.init({ THREE, scene: state.scene, root, log: state.log });
        safeLog("[decor] LobbyDecor ✅");
      }
    } catch (e) {
      safeLog("[decor] FAIL", e?.message || e);
    }

    // solid walls / hallways (this is your missing “other rooms” hook)
    try {
      const SW =
        wallsMod?.SolidWalls ||
        wallsMod?.default ||
        (typeof wallsMod?.init === "function" ? wallsMod : null);

      const fn = SW?.init || SW?.build || SW?.create;
      if (fn) {
        await fn.call(SW, { THREE, scene: state.scene, root, log: state.log });
        safeLog("[walls] built ✅");
      } else {
        safeLog("[walls] missing SolidWalls.init ❌ (hallways won't appear)");
      }
    } catch (e) {
      safeLog("[walls] FAIL", e?.message || e);
    }

    // store
    try {
      const Store = storeMod?.StoreSystem || storeMod?.default;
      if (Store?.init) {
        state.systems.store = await Store.init({
          THREE, scene: state.scene, root,
          player: state.player, camera: state.camera, log: state.log
        });
        safeLog("[store] StoreSystem ✅");
      }
    } catch (e) {
      safeLog("[store] FAIL", e?.message || e);
    }

    // scorpion room
    try {
      const Sc = scorpionMod?.ScorpionRoom || scorpionMod?.default;
      if (Sc?.init) {
        state.systems.scorpion = await Sc.init({
          THREE, scene: state.scene, root,
          player: state.player, camera: state.camera, log: state.log
        });
        safeLog("[scorpion] ✅");
      }
    } catch (e) {
      safeLog("[scorpion] FAIL", e?.message || e);
    }

    // stream
    if (optsAllow("allowStream")) {
      try { Stream.enable(true); Stream.init({ THREE, root }); }
      catch(e){ safeLog("[stream] init FAIL", e?.message || e); }
    } else {
      Stream.enable(false);
      Stream.dispose();
    }

    // table
    let tableObj = null;
    const BossTableAPI =
      bossTableMod?.BossTable ||
      bossTableMod?.default ||
      (typeof bossTableMod?.init === "function" ? bossTableMod : null);

    if (BossTableAPI?.init) {
      try {
        tableObj = await BossTableAPI.init({ THREE, scene: state.scene, root, log: state.log });
        safeLog("[table] BossTable.init ✅");
      } catch (e) {
        safeLog("[table] BossTable.init FAIL", e?.message || e);
      }
    }

    if (!tableObj && tableFactoryMod?.TableFactory?.create) {
      try {
        tableObj = await tableFactoryMod.TableFactory.create({ THREE, root, log: state.log });
        safeLog("[table] TableFactory.create ✅");
      } catch (e) {
        safeLog("[table] TableFactory.create FAIL", e?.message || e);
      }
    }

    if (!tableObj) {
      const t = new THREE.Mesh(
        new THREE.CylinderGeometry(2.25, 2.25, 0.25, 40),
        new THREE.MeshStandardMaterial({ color: 0x102018, roughness: 0.9 })
      );
      t.position.set(0, 1.05, 0);
      t.name = "PlaceholderTable";
      root.add(t);
      safeLog("[table] fallback placeholder (missing BossTable/TableFactory)");
      tableObj = t;
    }

    // bots
    if (optsAllow("allowBots") && botsMod?.Bots?.init) {
      try {
        state.systems.bots = await botsMod.Bots.init({
          THREE, scene: state.scene, root,
          player: state.player, log: state.log
        });
        safeLog("[bots] ✅");
      } catch (e) {
        safeLog("[bots] FAIL", e?.message || e);
      }
    }

    // poker
    if (optsAllow("allowPoker") && pokerSimMod?.PokerSim?.init) {
      try {
        state.systems.poker = await pokerSimMod.PokerSim.init({
          THREE, scene: state.scene, root,
          table: tableObj, player: state.player, camera: state.camera, log: state.log
        });
        safeLog("[poker] ✅");
      } catch (e) {
        safeLog("[poker] FAIL", e?.message || e);
      }
    }

    // room manager
    if (roomMgrMod?.RoomManager?.init) {
      try {
        state.systems.room = await roomMgrMod.RoomManager.init({
          THREE, scene: state.scene, root,
          player: state.player, camera: state.camera,
          systems: state.systems, log: state.log
        });
        safeLog("[rm] ✅");
      } catch (e) {
        safeLog("[rm] FAIL", e?.message || e);
      }
    }

    // teleport
    if (optsAllow("allowTeleport")) {
      const tp = tpMachineMod?.TeleportMachine || tpMod?.Teleport || tpMod?.default;
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
          safeLog("[teleport] ✅");
        } catch (e) {
          safeLog("[teleport] FAIL", e?.message || e);
        }
      }
    }
  }

  // -----------------------
  // Non-VR controls (keyboard + drag)
  // -----------------------
  function installNonVRControls() {
    if (state.systems.nonvr?.__installed) return;

    const { camera, player } = state;
    const keys = new Set();
    let dragging = false;
    let lastX = 0, lastY = 0;
    let yaw = 0, pitch = 0;

    window.addEventListener("keydown", (e) => keys.add(e.code));
    window.addEventListener("keyup", (e) => keys.delete(e.code));

    window.addEventListener("pointerdown", (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; });
    window.addEventListener("pointerup", () => { dragging = false; });
    window.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      yaw -= dx * 0.003;
      pitch -= dy * 0.003;
      pitch = Math.max(-1.2, Math.min(1.2, pitch));
      player.rotation.y = yaw;
      camera.rotation.x = pitch;
    });

    state.systems.nonvr = {
      __installed: true,
      update(dt) {
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

    safeLog("[nonvr] controls ✅");
  }

  function attachHandsToRig() {
    try {
      const L = state.controllers?.handLeft;
      const R = state.controllers?.handRight;
      if (L && L.parent !== state.player) state.player.add(L);
      if (R && R.parent !== state.player) state.player.add(R);
    } catch(e) {}
  }

  // -----------------------
  // Public API
  // -----------------------
  return {
    startAudio,

    async build({ THREE, renderer, camera, player, controllers, log, OPTS }) {
      state.THREE = THREE;
      state.renderer = renderer;
      state.camera = camera;
      state.player = player;
      state.controllers = controllers;
      state.log = log || console.log;
      state.OPTS = { ...state.OPTS, ...(OPTS || {}) };

      state.clock = new THREE.Clock();
      initAnchorsIfNeeded();

      state.scene = makeBaseScene();
      if (!state.scene.children.includes(player)) state.scene.add(player);

      attachHandsToRig();
      setSpawnAndFacing();

      if (state.OPTS.nonvrControls !== false) installNonVRControls();

      // ✅ VR PANEL REMOVED (unless you explicitly enable it later)
      // if (state.OPTS.enableVRPanel) { ... }

      await buildModules();

      state.built = true;
      safeLog("[world] build complete ✅");
      safeLog("✅ HybridWorld.build ✅");
    },

    async rebuild(ctx) {
      state.built = false;

      try { state.systems.teleport?.dispose?.(); } catch(e) {}
      try { state.systems.bots?.dispose?.(); } catch(e) {}
      try { state.systems.poker?.dispose?.(); } catch(e) {}
      try { state.systems.room?.dispose?.(); } catch(e) {}

      Stream.dispose();

      try {
        if (state.root) {
          state.scene?.remove(state.root);
          disposeObject3D(state.root);
        }
      } catch(e) {}
      state.root = null;

      state.mods = {};
      state.systems = { nonvr: state.systems.nonvr };

      await this.build(ctx);
    },

    frame({ renderer, camera }) {
      if (!state.scene) return;
      const dt = state.clock ? state.clock.getDelta() : 0.016;

      try { state.systems.nonvr?.update?.(dt); } catch(e) {}
      try { state.systems.bots?.update?.(dt); } catch(e) {}
      try { state.systems.poker?.update?.(dt); } catch(e) {}
      try { state.systems.room?.update?.(dt); } catch(e) {}
      try { state.systems.teleport?.update?.(dt); } catch(e) {}

      try {
        const xrCam = renderer.xr.getCamera(camera);
        Stream.updateSpatial(xrCam.position);
      } catch(e) {}

      renderer.render(state.scene, camera);
    }
  };
})();
