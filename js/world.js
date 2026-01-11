// /js/world.js — Scarlett VR Poker HybridWorld 1.0 (FULL + STREAMING)
// ✅ Hybrid modules optional (boss_table/bots/poker/teleport/room_manager)
// ✅ HLS streaming to a lobby screen (VideoTexture)
// ✅ Spatial volume based on distance to screen
// ✅ Quest-safe: no XR calls here
// ✅ In-VR “buttons”: pinch-driven VR panel (LEFT pinch toggle, RIGHT pinch click)
// ✅ StartAudio() exported on HybridWorld (must be triggered by user gesture)

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

    mods: {},
    systems: {},

    root: null,
    floor: null,
    spawn: null,
    facingTarget: null,

    built: false
  };

  function safeLog(...a) { try { state.log?.(...a); } catch (e) {} }

  function initAnchorsIfNeeded() {
    if (!state.spawn) state.spawn = new state.THREE.Vector3(0, 0, 26);
    if (!state.facingTarget) state.facingTarget = new state.THREE.Vector3(0, 1.5, 0);
  }

  function optsAllow(key) {
    if (state.OPTS?.safeMode) return false;
    return state.OPTS?.[key] !== false;
  }

  // -----------------------
  // STREAMING SYSTEM
  // -----------------------
  const Stream = (() => {
    const CHANNELS = [
      { id: "groove", name: "Groove Salad", url: "https://hls.somafm.com/hls/groovesalad/128k/program.m3u8" },
      { id: "lush", name: "Lush", url: "https://hls.somafm.com/hls/lush/128k/program.m3u8" },
    ];

    const st = {
      enabled: true,
      video: null,
      hls: null,
      screen: null,
      tex: null,
      url: CHANNELS[0].url,
      audioStarted: false,
      maxDist: 15
    };

    function ensureVideoEl() {
      if (st.video) return st.video;
      const v = document.getElementById("streamSource") || document.createElement("video");
      v.id = v.id || "streamSource";
      v.crossOrigin = "anonymous";
      v.playsInline = true;
      v.muted = false;          // we want audio, but it will still be blocked until user gesture play()
      v.loop = true;
      v.autoplay = false;
      v.preload = "auto";
      st.video = v;
      return v;
    }

    function loadHLS(url) {
      st.url = url;
      const video = ensureVideoEl();

      // cleanup previous hls
      try { st.hls?.destroy?.(); } catch (e) {}
      st.hls = null;

      // If Hls.js exists, use it; else fallback to native HLS if supported
      const HlsRef = window.Hls;
      if (HlsRef && HlsRef.isSupported && HlsRef.isSupported()) {
        const hls = new HlsRef({ enableWorker: true, lowLatencyMode: false });
        hls.loadSource(url);
        hls.attachMedia(video);
        st.hls = hls;
        safeLog("[stream] Hls.js attached ✅", url);
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = url;
        safeLog("[stream] native HLS set ✅", url);
      } else {
        safeLog("[stream] HLS not supported on this browser ❌");
      }
    }

    function buildScreen(THREE, root) {
      ensureVideoEl();

      st.tex = new THREE.VideoTexture(st.video);
      st.tex.colorSpace = THREE.SRGBColorSpace || undefined;

      const geo = new THREE.PlaneGeometry(16, 9);
      const mat = new THREE.MeshBasicMaterial({ map: st.tex });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = "LobbyScreen";
      mesh.position.set(0, 2.5, -6);
      root.add(mesh);

      st.screen = mesh;
      safeLog("[stream] screen built ✅");
    }

    async function startAudio() {
      const v = ensureVideoEl();
      if (!v.src && !st.hls) loadHLS(st.url);

      // MUST be called from user gesture
      await v.play();
      st.audioStarted = true;
      safeLog("[stream] audio/video play ✅");
    }

    function setChannel(url) {
      loadHLS(url);
      safeLog("[stream] setChannel", url);
    }

    function updateSpatial(listenerPos) {
      if (!st.video || !st.screen) return;
      const dist = listenerPos.distanceTo(st.screen.position);
      const vol = Math.max(0, 1 - (dist / st.maxDist));
      st.video.volume = st.audioStarted ? vol : 0;
    }

    function dispose() {
      try { st.hls?.destroy?.(); } catch (e) {}
      st.hls = null;
      try { st.tex?.dispose?.(); } catch (e) {}
      st.tex = null;
      try {
        if (st.screen?.parent) st.screen.parent.remove(st.screen);
      } catch (e) {}
      st.screen = null;
    }

    return {
      CHANNELS,
      enable(v) { st.enabled = !!v; },
      init({ THREE, root }) {
        if (!st.enabled) return;
        loadHLS(st.url);
        buildScreen(THREE, root);
      },
      startAudio,
      setChannel,
      updateSpatial,
      dispose,
      get screen() { return st.screen; }
    };
  })();

  // -----------------------
  // WORLD BASE
  // -----------------------
  function makeBaseScene() {
    const THREE = state.THREE;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05060a);

    scene.add(new THREE.HemisphereLight(0x9fb3ff, 0x0b0d14, 1.0));
    const dir = new THREE.DirectionalLight(0xffffff, 0.7);
    dir.position.set(4, 10, 3);
    scene.add(dir);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.95, metalness: 0 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.name = "Floor";
    scene.add(floor);
    state.floor = floor;

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.2, 0.08, 12, 64),
      new THREE.MeshStandardMaterial({ color: 0x7fe7ff, roughness: 0.35, metalness: 0.35 })
    );
    ring.position.set(0, 1.4, 0);
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
    player.position.set(state.spawn.x, 0, state.spawn.z);
    camera.position.set(0, 1.65, 0);

    const target = state.facingTarget.clone();
    const camWorld = new state.THREE.Vector3();
    camera.getWorldPosition(camWorld);

    const look = target.sub(camWorld).normalize();
    const yaw = Math.atan2(look.x, look.z);
    player.rotation.set(0, yaw, 0);

    safeLog("[world] Spawn ✅", `x=${state.spawn.x.toFixed(2)}`, `z=${state.spawn.z.toFixed(2)}`);
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

  // -----------------------
  // VR DEBUG PANEL (pinch click)
  // -----------------------
  function makeVRDebugPanel() {
    const THREE = state.THREE;

    const g = new THREE.Group();
    g.name = "VRDebugPanel";
    g.visible = true;

    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.66, 0.44),
      new THREE.MeshBasicMaterial({ color: 0x0b0d14, transparent: true, opacity: 0.86 })
    );
    panel.position.set(0, 0, -0.82);
    g.add(panel);

    const mkBtn = (label, x, y) => {
      const btn = new THREE.Mesh(
        new THREE.PlaneGeometry(0.29, 0.085),
        new THREE.MeshBasicMaterial({ color: 0x182047, transparent: true, opacity: 0.96 })
      );
      btn.position.set(x, y, -0.81);
      btn.userData.label = label;
      g.add(btn);
      return btn;
    };

    const btnRebuild = mkBtn("Rebuild", -0.17,  0.11);
    const btnSafe    = mkBtn("Safe",     0.17,  0.11);
    const btnBots    = mkBtn("Bots",    -0.17,  0.00);
    const btnPoker   = mkBtn("Poker",    0.17,  0.00);
    const btnTP      = mkBtn("Teleport",-0.17, -0.11);
    const btnCh      = mkBtn("Channel+", 0.17, -0.11);
    const btnHide    = mkBtn("Hide",     0.00, -0.205);

    const buttons = [btnRebuild, btnSafe, btnBots, btnPoker, btnTP, btnCh, btnHide];

    const ray = new THREE.Raycaster();
    const tmp = new THREE.Vector3();
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const dir = new THREE.Vector3();

    function getJointWorldPos(hand, jointName, out) {
      const j = hand?.joints?.[jointName];
      if (!j) return false;
      j.getWorldPosition(out);
      return true;
    }

    function pinchApprox(hand) {
      if (!getJointWorldPos(hand, "thumb-tip", a)) return false;
      if (!getJointWorldPos(hand, "index-finger-tip", b)) return false;
      return a.distanceTo(b) < 0.02;
    }

    let cooldown = 0;

    const api = {
      group: g,
      onPress: null,
      update(dt) {
        if (!state.renderer?.xr?.isPresenting) return;
        cooldown = Math.max(0, cooldown - dt);

        // LEFT pinch toggles panel
        if (cooldown === 0 && pinchApprox(state.controllers?.handLeft)) {
          g.visible = !g.visible;
          cooldown = 0.35;
          return;
        }

        if (!g.visible) return;

        // Aim with RIGHT index tip
        if (!getJointWorldPos(state.controllers?.handRight, "index-finger-tip", tmp)) return;

        dir.set(0, 0, -1).applyQuaternion(state.camera.quaternion).normalize();
        ray.set(tmp, dir);

        const hits = ray.intersectObjects(buttons, false);

        // reset
        for (const btt of buttons) btt.material.color.set(0x182047);

        if (hits.length) {
          const hit = hits[0].object;
          hit.material.color.set(0x00aa66);

          if (cooldown === 0 && pinchApprox(state.controllers?.handRight)) {
            cooldown = 0.25;
            api.onPress?.(hit.userData.label);
          }
        }
      }
    };

    return api;
  }

  // -----------------------
  // OPTIONAL MODULE SYSTEMS
  // -----------------------
  async function buildRealSystems() {
    const THREE = state.THREE;

    const bossTableMod = await tryImport("./boss_table.js");
    const botsMod = await tryImport("./bots.js");
    const pokerSimMod = await tryImport("./poker_sim.js");
    const roomMgrMod = await tryImport("./room_manager.js");
    const teleportMachineMod = await tryImport("./teleport_machine.js");
    const teleportMod = await tryImport("./teleport.js");

    state.mods = { bossTableMod, botsMod, pokerSimMod, roomMgrMod, teleportMachineMod, teleportMod };

    disposeRoot();
    const root = new THREE.Group();
    root.name = "HybridRoot";
    state.scene.add(root);
    state.root = root;

    // STREAM SCREEN (optional)
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
      bossTableMod?.BossTable || bossTableMod?.default ||
      (bossTableMod?.createBossTable ? { init: bossTableMod.createBossTable } : null);

    if (BossTableAPI?.init) {
      try {
        tableObj = await BossTableAPI.init({ THREE, scene: state.scene, root, log: state.log });
        safeLog("[table] BossTable.init ✅");
      } catch (e) {
        safeLog("[table] BossTable.init FAIL", e?.message || e);
      }
    }

    if (!tableObj) {
      const t = new THREE.Mesh(
        new THREE.CylinderGeometry(2.2, 2.2, 0.25, 32),
        new THREE.MeshStandardMaterial({ color: 0x102018, roughness: 0.9 })
      );
      t.position.set(0, 1.05, 0);
      root.add(t);
      safeLog("[table] placeholder ✅");
      tableObj = t;
    }

    // BOTS
    if (!optsAllow("allowBots")) safeLog("[bots] skipped by options");
    else if (botsMod?.Bots?.init) {
      try {
        state.systems.bots = await botsMod.Bots.init({ THREE, scene: state.scene, root, player: state.player, log: state.log });
        safeLog("[bots] Bots.init ✅");
      } catch (e) {
        safeLog("[bots] Bots.init FAIL", e?.message || e);
      }
    }

    // POKER
    if (!optsAllow("allowPoker")) safeLog("[poker] skipped by options");
    else if (pokerSimMod?.PokerSim?.init) {
      try {
        state.systems.poker = await pokerSimMod.PokerSim.init({
          THREE, scene: state.scene, root,
          table: tableObj, player: state.player, camera: state.camera, log: state.log
        });
        safeLog("[poker] PokerSim.init ✅ spectate");
      } catch (e) {
        safeLog("[poker] PokerSim.init FAIL", e?.message || e);
      }
    }

    // ROOM MANAGER
    if (roomMgrMod?.RoomManager?.init) {
      try {
        state.systems.room = await roomMgrMod.RoomManager.init({
          THREE, scene: state.scene, root,
          player: state.player, camera: state.camera,
          systems: state.systems, log: state.log
        });
        safeLog("[rm] init ✅");
      } catch (e) {
        safeLog("[rm] init FAIL", e?.message || e);
      }
    }

    // TELEPORT
    if (!optsAllow("allowTeleport")) safeLog("[teleport] skipped by options");
    else {
      const tp = teleportMachineMod?.TeleportMachine || teleportMod?.Teleport;
      if (tp?.init) {
        try {
          state.systems.teleport = await tp.init({
            THREE, scene: state.scene, renderer: state.renderer,
            camera: state.camera, player: state.player, controllers: state.controllers,
            log: state.log, world: { floor: state.floor, root }
          });
          safeLog("[teleport] init ✅");
        } catch (e) {
          safeLog("[teleport] init FAIL", e?.message || e);
        }
      }
    }
  }

  // NON-VR CONTROLS
  function installNonVRControls() {
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

  function attachHandsSafely() {
    try {
      const L = state.controllers?.handLeft;
      const R = state.controllers?.handRight;
      if (L && L.parent !== state.player) state.player.add(L);
      if (R && R.parent !== state.player) state.player.add(R);
    } catch (e) {}
  }

  // PUBLIC API
  return {
    // Must be called from user gesture (Start Audio button)
    async startAudio() {
      return Stream.startAudio();
    },

    // Build / Rebuild / Frame
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

      attachHandsSafely();
      setSpawnAndFacing();

      if (state.OPTS.nonvrControls !== false) installNonVRControls();

      // VR Panel (Quest buttons)
      state.systems.vrpanel = makeVRDebugPanel();
      state.camera.add(state.systems.vrpanel.group);

      await buildRealSystems();

      // VR panel actions (includes streaming channel cycle)
      let chIndex = 0;
      state.systems.vrpanel.onPress = async (label) => {
        safeLog("[vrpanel] press", label);

        if (label === "Hide") {
          state.systems.vrpanel.group.visible = false;
          return;
        }

        if (label === "Safe") {
          state.OPTS.safeMode = true;
          state.OPTS.allowBots = false;
          state.OPTS.allowPoker = false;
          state.OPTS.allowTeleport = false;
          state.OPTS.allowStream = false;
          safeLog("[mode] SAFE MODE via VR panel ✅");
          return;
        }

        if (label === "Bots") { state.OPTS.allowBots = !state.OPTS.allowBots; safeLog("[opts] allowBots=", state.OPTS.allowBots); return; }
        if (label === "Poker") { state.OPTS.allowPoker = !state.OPTS.allowPoker; safeLog("[opts] allowPoker=", state.OPTS.allowPoker); return; }
        if (label === "Teleport") { state.OPTS.allowTeleport = !state.OPTS.allowTeleport; safeLog("[opts] allowTeleport=", state.OPTS.allowTeleport); return; }

        if (label === "Channel+") {
          chIndex = (chIndex + 1) % Stream.CHANNELS.length;
          Stream.setChannel(Stream.CHANNELS[chIndex].url);
          safeLog("[stream] channel=", Stream.CHANNELS[chIndex].name);
          return;
        }

        if (label === "Rebuild") {
          safeLog("[vrpanel] rebuilding…");
          await HybridWorld.rebuild({
            THREE: state.THREE,
            renderer: state.renderer,
            camera: state.camera,
            player: state.player,
            controllers: state.controllers,
            log: state.log,
            OPTS: state.OPTS
          });
        }
      };

      state.built = true;
      safeLog("[world] Hybrid 1.0 built ✅ (full+stream)");
      safeLog("[world] VR panel: LEFT pinch toggle, RIGHT pinch click ✅");
    },

    async rebuild(ctx) {
      state.built = false;

      try { state.systems.teleport?.dispose?.(); } catch (e) {}
      try { state.systems.bots?.dispose?.(); } catch (e) {}
      try { state.systems.poker?.dispose?.(); } catch (e) {}
      try { state.systems.room?.dispose?.(); } catch (e) {}

      try {
        if (state.systems.vrpanel?.group?.parent) {
          state.systems.vrpanel.group.parent.remove(state.systems.vrpanel.group);
        }
      } catch (e) {}

      Stream.dispose();

      state.mods = {};
      state.systems = {};
      disposeRoot();

      await this.build(ctx);
    },

    frame({ renderer, camera }) {
      if (!state.scene) return;

      const dt = state.clock ? state.clock.getDelta() : 0.016;

      // VR panel
      try { state.systems.vrpanel?.update?.(dt); } catch (e) {}

      // Systems
      try { state.systems.nonvr?.update?.(dt); } catch (e) {}
      try { state.systems.bots?.update?.(dt); } catch (e) {}
      try { state.systems.poker?.update?.(dt); } catch (e) {}
      try { state.systems.room?.update?.(dt); } catch (e) {}
      try { state.systems.teleport?.update?.(dt); } catch (e) {}

      // Spatial audio (based on XR camera position)
      try {
        const xrCam = renderer.xr.getCamera(camera);
        Stream.updateSpatial(xrCam.position);
      } catch (e) {}

      renderer.render(state.scene, camera);
    }
  };
})();
