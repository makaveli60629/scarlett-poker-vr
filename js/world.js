// /js/world.js — Scarlett VR Poker HybridWorld 1.2 (FULL, Quest-safe, Android-dev friendly)
// ✅ Entry: HybridWorld.build(...), HybridWorld.frame(...)
// ✅ Never-black base scene always
// ✅ Optional core modules:
//    ./boss_table.js, ./table_factory.js, ./bots.js, ./poker_sim.js, ./room_manager.js,
//    ./teleport_machine.js OR ./teleport.js
// ✅ Added modules (optional):
//    ./touch_controls.js, ./lobby_decor.js, ./store_room.js, ./spectator.js, ./seating.js, ./chips.js
// ✅ Android: left joystick move, right drag look, buttons: DBG/HUD/TABLE/REBUILD/SAFE
// ✅ Debug overlay minimizable (adds CSS class 'min' / 'hide')
// ✅ VR: VRPanel left pinch toggle, right pinch click
// ✅ Seat rings: when VRPanel hidden, right pinch selects seat ring
// ✅ Demo chips bet loop (until PokerSim events wired)

import { TouchControls } from "./touch_controls.js";

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
      safeMode: false
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

    scene.add(new THREE.HemisphereLight(0x9fb3ff, 0x0b0d14, 1.0));
    const dir = new THREE.DirectionalLight(0xffffff, 0.85);
    dir.position.set(4, 10, 3);
    scene.add(dir);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(140, 140),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.95, metalness: 0.0 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.name = "Floor";
    scene.add(floor);
    state.floor = floor;

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

    player.position.set(state.spawn.x, 0, state.spawn.z);
    camera.position.set(0, 1.65, 0);

    const target = state.facingTarget.clone();
    const camWorld = new THREE.Vector3();
    camera.getWorldPosition(camWorld);

    const look = target.sub(camWorld).normalize();
    const yaw = Math.atan2(look.x, look.z);
    player.rotation.set(0, yaw, 0);

    safeLog("[world] Spawn ✅", `x=${state.spawn.x.toFixed(2)}`, `z=${state.spawn.z.toFixed(2)}`);
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
      await video.play(); // requires gesture
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
      dispose,
      get screen() { return st.screen; }
    };
  })();

  async function startAudio() {
    return Stream.startAudio();
  }

  // -----------------------
  // VR Panel (pinch toggle + pinch click)
  // -----------------------
  function makeVRPanel() {
    const THREE = state.THREE;
    const g = new THREE.Group();
    g.name = "VRPanel";
    g.visible = true;

    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(0.72, 0.48),
      new THREE.MeshBasicMaterial({ color: 0x0b0d14, transparent: true, opacity: 0.86 })
    );
    plate.position.set(0, 0, -0.85);
    g.add(plate);

    const mkBtn = (label, x, y) => {
      const btn = new THREE.Mesh(
        new THREE.PlaneGeometry(0.32, 0.09),
        new THREE.MeshBasicMaterial({ color: 0x182047, transparent: true, opacity: 0.98 })
      );
      btn.position.set(x, y, -0.84);
      btn.userData.label = label;
      g.add(btn);
      return btn;
    };

    const btnRebuild = mkBtn("Rebuild", -0.19,  0.13);
    const btnSafe    = mkBtn("Safe",     0.19,  0.13);
    const btnBots    = mkBtn("Bots",    -0.19,  0.02);
    const btnPoker   = mkBtn("Poker",    0.19,  0.02);
    const btnTP      = mkBtn("Teleport",-0.19, -0.09);
    const btnCh      = mkBtn("Channel+", 0.19, -0.09);
    const btnHide    = mkBtn("Hide",     0.00, -0.21);

    const buttons = [btnRebuild, btnSafe, btnBots, btnPoker, btnTP, btnCh, btnHide];

    const ray = new THREE.Raycaster();
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const tip = new THREE.Vector3();
    const dir = new THREE.Vector3();
    let cooldown = 0;
    let channelIndex = 0;

    function getJointWorldPos(hand, jointName, out) {
      const j = hand?.joints?.[jointName];
      if (!j) return false;
      j.getWorldPosition(out);
      return true;
    }

    function pinch(hand) {
      if (!getJointWorldPos(hand, "thumb-tip", a)) return false;
      if (!getJointWorldPos(hand, "index-finger-tip", b)) return false;
      return a.distanceTo(b) < 0.02;
    }

    async function handlePress(label) {
      safeLog("[vrpanel] press", label);

      if (label === "Hide") { g.visible = false; return; }

      if (label === "Safe") {
        state.OPTS.safeMode = true;
        state.OPTS.allowBots = false;
        state.OPTS.allowPoker = false;
        state.OPTS.allowTeleport = false;
        state.OPTS.allowStream = false;
        safeLog("[mode] SAFE MODE ✅ (press Rebuild)");
        return;
      }

      if (label === "Bots") {
        state.OPTS.allowBots = !state.OPTS.allowBots;
        safeLog("[opts] allowBots=", state.OPTS.allowBots);
        return;
      }

      if (label === "Poker") {
        state.OPTS.allowPoker = !state.OPTS.allowPoker;
        safeLog("[opts] allowPoker=", state.OPTS.allowPoker);
        return;
      }

      if (label === "Teleport") {
        state.OPTS.allowTeleport = !state.OPTS.allowTeleport;
        safeLog("[opts] allowTeleport=", state.OPTS.allowTeleport);
        return;
      }

      if (label === "Channel+") {
        channelIndex = (channelIndex + 1) % Stream.CHANNELS.length;
        Stream.setChannel(Stream.CHANNELS[channelIndex].url);
        safeLog("[stream] channel=", Stream.CHANNELS[channelIndex].name);
        return;
      }

      if (label === "Rebuild") {
        safeLog("[vrpanel] rebuild…");
        await api.rebuildFromPanel?.();
      }
    }

    const api = {
      group: g,
      rebuildFromPanel: null,
      update(dt) {
        if (!state.renderer?.xr?.isPresenting) return;

        cooldown = Math.max(0, cooldown - dt);

        // LEFT pinch toggles menu
        if (cooldown === 0 && pinch(state.controllers?.handLeft)) {
          g.visible = !g.visible;
          cooldown = 0.35;
          return;
        }

        if (!g.visible) return;

        // Aim with RIGHT index tip
        if (!getJointWorldPos(state.controllers?.handRight, "index-finger-tip", tip)) return;

        dir.set(0, 0, -1).applyQuaternion(state.camera.quaternion).normalize();
        ray.set(tip, dir);

        const hits = ray.intersectObjects(buttons, false);

        for (const btn of buttons) btn.material.color.set(0x182047);

        if (hits.length) {
          const hit = hits[0].object;
          hit.material.color.set(0x00aa66);

          // RIGHT pinch clicks
          if (cooldown === 0 && pinch(state.controllers?.handRight)) {
            cooldown = 0.25;
            handlePress(hit.userData.label);
          }
        }
      }
    };

    return api;
  }

  // -----------------------
  // Android/Non-VR controls (touch + keyboard)
  // -----------------------
  function installNonVRControls() {
    if (state.systems.nonvr?.__installed) return;

    const { camera, player } = state;
    const keys = new Set();

    // Desktop pointer look
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

    // Touch controls UI (Android)
    const isTouch = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
    const touchAPI = {
      toggleDebug: () => {
        const o = document.getElementById("overlay");
        if (!o) return;
        o.classList.toggle("min");
      },
      toggleHUD: () => {
        const hud = document.getElementById("hud");
        if (hud) hud.style.display = (hud.style.display === "none" ? "" : "none");
        else {
          const o = document.getElementById("overlay");
          if (o) o.classList.toggle("hide");
        }
      },
      gotoTable: () => {
        // Safe snap for debugging
        player.position.set(0, 0, 4.2);
        player.rotation.set(0, Math.PI, 0);
      },
      rebuild: async () => {
        try { await state.systems.vrpanel?.rebuildFromPanel?.(); }
        catch (e) { state.log?.("[touch] rebuild failed", e?.message || e); }
      },
      safeMode: () => {
        state.OPTS.safeMode = true;
        state.OPTS.allowBots = false;
        state.OPTS.allowPoker = false;
        state.OPTS.allowTeleport = false;
        state.OPTS.allowStream = false;
        state.log?.("[touch] SAFE MODE ✅ then press REBUILD");
      }
    };

    if (isTouch) {
      try {
        TouchControls.init({ THREE: state.THREE, player, camera, log: state.log, api: touchAPI });
        state.systems.__touch = TouchControls;
        safeLog("[touch] init ✅");
      } catch (e) {
        safeLog("[touch] init FAIL", e?.message || e);
      }
    }

    state.systems.nonvr = {
      __installed: true,
      update(dt) {
        if (state.renderer?.xr?.isPresenting) return;

        // Touch movement
        let moveX = 0, moveY = 0;
        try {
          const out = state.systems.__touch?.update?.(dt);
          if (out) { moveX = out.moveX || 0; moveY = out.moveY || 0; }
        } catch(e){}

        // Keyboard movement
        const fwdKB = (keys.has("KeyW") ? 1 : 0) + (keys.has("KeyS") ? -1 : 0);
        const strKB = (keys.has("KeyD") ? 1 : 0) + (keys.has("KeyA") ? -1 : 0);

        const fwd = moveY + fwdKB;
        const str = moveX + strKB;

        if (!fwd && !str) return;

        const speed = (keys.has("ShiftLeft") ? 6 : 3) * dt;

        const dir = new state.THREE.Vector3();
        player.getWorldDirection(dir);
        dir.y = 0; dir.normalize();

        const right = new state.THREE.Vector3(dir.z, 0, -dir.x);
        player.position.addScaledVector(dir, fwd * speed);
        player.position.addScaledVector(right, str * speed);
      }
    };

    safeLog("[nonvr] controls ✅ (touch+keyboard)");
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
  // Optional module build
  // -----------------------
  async function buildModules() {
    const THREE = state.THREE;
    const root = ensureRoot();

    // Clear root
    if (root.children.length) {
      for (let i = root.children.length - 1; i >= 0; i--) {
        const c = root.children[i];
        root.remove(c);
        disposeObject3D(c);
      }
    }

    // Core optional imports
    const bossTableMod    = await tryImport("./boss_table.js");
    const tableFactoryMod = await tryImport("./table_factory.js");
    const botsMod         = await tryImport("./bots.js");
    const pokerSimMod     = await tryImport("./poker_sim.js");
    const roomMgrMod      = await tryImport("./room_manager.js");
    const tpMachineMod    = await tryImport("./teleport_machine.js");
    const tpMod           = await tryImport("./teleport.js");

    // Added optional imports
    const decorMod        = await tryImport("./lobby_decor.js");
    const spectatorMod    = await tryImport("./spectator.js");
    const storeRoomMod    = await tryImport("./store_room.js");
    const seatingMod      = await tryImport("./seating.js");
    const chipsMod        = await tryImport("./chips.js");

    state.mods = {
      bossTableMod, tableFactoryMod, botsMod, pokerSimMod, roomMgrMod, tpMachineMod, tpMod,
      decorMod, spectatorMod, storeRoomMod, seatingMod, chipsMod
    };

    // STREAM
    if (optsAllow("allowStream")) {
      try { Stream.enable(true); Stream.init({ THREE, root }); }
      catch (e) { safeLog("[stream] init FAIL", e?.message || e); }
    } else {
      Stream.enable(false);
      Stream.dispose();
      safeLog("[stream] skipped by options");
    }

    // TABLE
    let tableObj = null;

    const BossTableAPI =
      bossTableMod?.BossTable ||
      bossTableMod?.default ||
      (typeof bossTableMod?.init === "function" ? bossTableMod : null);

    if (BossTableAPI?.init) {
      try {
        tableObj = await BossTableAPI.init({ THREE, scene: state.scene, root, log: state.log });
        safeLog("[table] BossTable.init ✅");
      } catch (e) { safeLog("[table] BossTable.init FAIL", e?.message || e); }
    }

    if (!tableObj && tableFactoryMod?.TableFactory?.create) {
      try {
        tableObj = await tableFactoryMod.TableFactory.create({ THREE, root, log: state.log });
        safeLog("[table] TableFactory.create ✅");
      } catch (e) { safeLog("[table] TableFactory.create FAIL", e?.message || e); }
    }

    if (!tableObj) {
      const t = new THREE.Mesh(
        new THREE.CylinderGeometry(2.25, 2.25, 0.25, 40),
        new THREE.MeshStandardMaterial({ color: 0x102018, roughness: 0.9 })
      );
      t.position.set(0, 1.05, 0);
      t.name = "PlaceholderTable";
      root.add(t);
      safeLog("[table] placeholder ✅");
      tableObj = t;
    }

    const tablePos = new THREE.Vector3(0,0,0);
    try { tableObj.getWorldPosition(tablePos); } catch(e) {}

    // DECOR / hallways vibe
    if (decorMod?.LobbyDecor?.init) {
      try { state.systems.decor = decorMod.LobbyDecor.init({ THREE, root, log: state.log }); safeLog("[decor] init ✅"); }
      catch (e) { safeLog("[decor] init FAIL", e?.message || e); }
    }

    // Spectator rail
    if (spectatorMod?.SpectatorRail?.init) {
      try { state.systems.spectator = spectatorMod.SpectatorRail.init({ THREE, root, log: state.log }); safeLog("[spectator] init ✅"); }
      catch (e) { safeLog("[spectator] init FAIL", e?.message || e); }
    }

    // Store room
    if (storeRoomMod?.StoreRoom?.init) {
      try { state.systems.store = storeRoomMod.StoreRoom.init({ THREE, root, log: state.log }); safeLog("[store] init ✅"); }
      catch (e) { safeLog("[store] init FAIL", e?.message || e); }
    }

    // Seating rings
    if (seatingMod?.SeatingSystem?.init) {
      try {
        state.systems.seating = seatingMod.SeatingSystem.init({
          THREE, scene: state.scene, root,
          camera: state.camera, player: state.player,
          log: state.log, tablePos, seatCount: 8
        });
        safeLog("[seat] init ✅");
      } catch (e) { safeLog("[seat] init FAIL", e?.message || e); }
    }

    // Chips
    if (chipsMod?.ChipSystem?.init) {
      try {
        const seatPositions = [];
        const count = 8;
        const radius = 3.35;
        for (let i=0; i<count; i++){
          const a = (i/count) * Math.PI*2;
          seatPositions.push(new THREE.Vector3(
            tablePos.x + Math.sin(a)*radius,
            0,
            tablePos.z + Math.cos(a)*radius
          ));
        }

        state.systems.chips = chipsMod.ChipSystem.init({
          THREE, root, log: state.log,
          seatPositions,
          potPos: new THREE.Vector3(tablePos.x, 0, tablePos.z)
        });

        state.systems.__betTimer = 0;
        safeLog("[chips] init ✅");
      } catch (e) { safeLog("[chips] init FAIL", e?.message || e); }
    }

    // BOTS
    if (optsAllow("allowBots") && botsMod?.Bots?.init) {
      try {
        state.systems.bots = await botsMod.Bots.init({
          THREE, scene: state.scene, root, player: state.player, log: state.log
        });
        safeLog("[bots] Bots.init ✅");
      } catch (e) { safeLog("[bots] Bots.init FAIL", e?.message || e); }
    } else safeLog("[bots] skipped");

    // POKER
    if (optsAllow("allowPoker") && pokerSimMod?.PokerSim?.init) {
      try {
        state.systems.poker = await pokerSimMod.PokerSim.init({
          THREE, scene: state.scene, root,
          table: tableObj, player: state.player, camera: state.camera, log: state.log
        });
        safeLog("[poker] PokerSim.init ✅");
      } catch (e) { safeLog("[poker] PokerSim.init FAIL", e?.message || e); }
    } else safeLog("[poker] skipped");

    // ROOM MANAGER
    if (roomMgrMod?.RoomManager?.init) {
      try {
        state.systems.room = await roomMgrMod.RoomManager.init({
          THREE, scene: state.scene, root,
          player: state.player, camera: state.camera,
          systems: state.systems, log: state.log
        });
        safeLog("[rm] init ✅");
      } catch (e) { safeLog("[rm] init FAIL", e?.message || e); }
    }

    // TELEPORT
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
          safeLog("[teleport] init ✅");
        } catch (e) { safeLog("[teleport] init FAIL", e?.message || e); }
      } else safeLog("[teleport] module missing — skipped");
    } else safeLog("[teleport] skipped");
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

      state.systems.vrpanel = makeVRPanel();
      state.camera.add(state.systems.vrpanel.group);

      state.systems.vrpanel.rebuildFromPanel = async () => {
        await this.rebuild({
          THREE: state.THREE,
          renderer: state.renderer,
          camera: state.camera,
          player: state.player,
          controllers: state.controllers,
          log: state.log,
          OPTS: state.OPTS
        });
      };

      await buildModules();

      state.built = true;
      safeLog("[world] HybridWorld built ✅");
      safeLog("[world] VR Panel: LEFT pinch toggle, RIGHT pinch click ✅");
    },

    async rebuild(ctx) {
      state.built = false;

      try { state.systems.teleport?.dispose?.(); } catch(e) {}
      try { state.systems.bots?.dispose?.(); } catch(e) {}
      try { state.systems.poker?.dispose?.(); } catch(e) {}
      try { state.systems.room?.dispose?.(); } catch(e) {}
      try { state.systems.decor?.dispose?.(); } catch(e) {}
      try { state.systems.spectator?.dispose?.(); } catch(e) {}
      try { state.systems.store?.dispose?.(); } catch(e) {}
      try { state.systems.chips?.dispose?.(); } catch(e) {}

      try {
        if (state.systems.vrpanel?.group?.parent) {
          state.systems.vrpanel.group.parent.remove(state.systems.vrpanel.group);
        }
      } catch(e) {}

      Stream.dispose();

      try {
        if (state.root) {
          state.scene?.remove(state.root);
          disposeObject3D(state.root);
        }
      } catch(e) {}
      state.root = null;

      const keepNonVR = state.systems.nonvr;
      state.mods = {};
      state.systems = {};
      if (keepNonVR?.__installed) state.systems.nonvr = keepNonVR;

      await this.build(ctx);
    },

    frame({ renderer, camera }) {
      if (!state.scene) return;

      const dt = state.clock ? state.clock.getDelta() : 0.016;

      // updates
      try { state.systems.vrpanel?.update?.(dt); } catch(e) {}
      try { state.systems.nonvr?.update?.(dt); } catch(e) {}

      try { state.systems.seating?.update?.(dt); } catch(e) {}
      try { state.systems.store?.update?.(dt); } catch(e) {}
      try { state.systems.chips?.update?.(dt); } catch(e) {}

      try { state.systems.bots?.update?.(dt); } catch(e) {}
      try { state.systems.poker?.update?.(dt); } catch(e) {}
      try { state.systems.room?.update?.(dt); } catch(e) {}
      try { state.systems.teleport?.update?.(dt); } catch(e) {}

      // demo bet loop
      try {
        if (state.systems.__betTimer !== undefined && state.systems.chips?.bet) {
          state.systems.__betTimer += dt;
          if (state.systems.__betTimer > 2.0) {
            state.systems.__betTimer = 0;
            const seatId = "P" + (1 + Math.floor(Math.random()*8));
            state.systems.chips.bet(seatId, 1 + Math.floor(Math.random()*3));
          }
        }
      } catch(e) {}

      // VR seat click (panel hidden)
      try {
        if (state.renderer?.xr?.isPresenting) {
          const panelVisible = !!state.systems.vrpanel?.group?.visible;
          if (!panelVisible && state.systems.seating?.click) {
            const hand = state.controllers?.handRight;
            const jt = hand?.joints?.["thumb-tip"];
            const ji = hand?.joints?.["index-finger-tip"];
            if (jt && ji) {
              const a = new state.THREE.Vector3();
              const b = new state.THREE.Vector3();
              jt.getWorldPosition(a);
              ji.getWorldPosition(b);
              if (a.distanceTo(b) < 0.02) state.systems.seating.click();
            }
          }
        }
      } catch(e) {}

      // spatial audio
      try {
        const xrCam = renderer.xr.getCamera(camera);
        Stream.updateSpatial(xrCam.position);
      } catch(e) {}

      renderer.render(state.scene, camera);
    }
  };
})();
