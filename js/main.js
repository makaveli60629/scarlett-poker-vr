// js/main.js
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

// Your modules (keep filenames exactly as in your repo)
import { World } from "./world.js";
import { Table } from "./table.js";

// You said leaderboard is done:
import { Leaderboard } from "./leaderboard.js";

/**
 * Scarlett Poker VR - Main Bootstrap (Quest + Android)
 * Goals:
 * - XR rig ALWAYS follows player
 * - Right stick = snap-turn (45 degrees)
 * - Left stick = teleport with halo preview
 * - Right trigger = action/select
 * - Android gets on-screen joystick + buttons
 * - Stable per-room spawn (Lobby/Store/Poker)
 */

const App = {
  // three core
  scene: null,
  camera: null,
  renderer: null,

  // player rig
  player: {
    group: null,      // master rig
    head: null,       // camera
    velocity: new THREE.Vector3(),
    grounded: true,
  },

  // time
  clock: new THREE.Clock(),

  // interaction
  raycaster: new THREE.Raycaster(),
  tmpV3: new THREE.Vector3(),
  tmpV3b: new THREE.Vector3(),

  // XR controllers
  xr: {
    enabled: true,
    c0: null,
    c1: null,
    grip0: null,
    grip1: null,
    left: null,
    right: null,
    leftRay: null,
    rightRay: null,
    leftAxes: [0, 0],
    rightAxes: [0, 0],
    snapCooldown: 0,
    teleportDown: false,
  },

  // teleport visuals
  teleport: {
    reticle: null,
    ring: null,
    valid: false,
    target: new THREE.Vector3(),
    floorY: 0,
    bounds: { minX: -10, maxX: 10, minZ: -16, maxZ: 8 }, // clamp movement
  },

  // rooms
  rooms: {
    current: "lobby",
    spawns: {
      lobby: { pos: new THREE.Vector3(0, 0, 4), yaw: Math.PI },
      store: { pos: new THREE.Vector3(8, 0, 2), yaw: -Math.PI / 2 },
      poker: { pos: new THREE.Vector3(0, 0, -2), yaw: Math.PI },
    },
  },

  // audio
  audio: {
    listener: null,
    bg: null,
    bgUrl: "assets/audio/lobby_ambience.mp3",
    enabled: false,
    ready: false,
  },

  // Android overlay UI
  mobileUI: {
    root: null,
    joystick: { active: false, id: null, base: null, knob: null, start: { x: 0, y: 0 }, vec: { x: 0, y: 0 } },
    btnAudio: null,
    btnMenu: null,
    btnReset: null,
    btnLobby: null,
    btnStore: null,
    btnPoker: null,
    menuOpen: false,
  },

  // misc interactables
  interactables: [],

  init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x07080f);

    // Camera
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 200);
    this.camera.position.set(0, 1.6, 6);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.xr.enabled = true;

    document.body.appendChild(this.renderer.domElement);

    // VR button (Quest)
    document.body.appendChild(VRButton.createButton(this.renderer));

    // Player rig (THE IMPORTANT PART: camera is inside group)
    this.player.group = new THREE.Group();
    this.player.group.position.copy(this.rooms.spawns.lobby.pos);
    this.scene.add(this.player.group);

    this.player.group.add(this.camera);

    // Lights baseline (World should add more)
    this._addBaseLights();

    // Build world + table
    try { World?.build?.(this.scene, this.player.group); } catch (e) { console.warn("World.build() failed:", e); }
    try { Table?.build?.(this.scene); } catch (e) { console.warn("Table.build() failed:", e); }

    // Leaderboard
    try { Leaderboard?.build?.(this.scene); } catch (e) { console.warn("Leaderboard.build() failed:", e); }

    // Teleport visuals
    this._buildTeleportHelpers();

    // XR controllers setup
    this._setupXRControllers();

    // Audio
    this._setupAudio();

    // Android overlay controls
    this._setupMobileOverlay();

    // Basic teleport pads (if your World already has pads, these won’t hurt)
    this._makeRoomPortals();

    // Start loop
    this.renderer.setAnimationLoop(this._animate.bind(this));

    window.addEventListener("resize", this._onResize.bind(this));
    this._onResize();

    // Spawn into lobby correctly
    this.teleportTo("lobby", true);
  },

  /* ------------------ WORLD / LIGHTING ------------------ */

  _addBaseLights() {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 0.75);
    this.scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(6, 10, 6);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    dir.shadow.camera.near = 0.5;
    dir.shadow.camera.far = 50;
    dir.shadow.camera.left = -15;
    dir.shadow.camera.right = 15;
    dir.shadow.camera.top = 15;
    dir.shadow.camera.bottom = -15;
    this.scene.add(dir);
  },

  /* ------------------ TELEPORT ------------------ */

  _buildTeleportHelpers() {
    // reticle
    const ringGeo = new THREE.RingGeometry(0.18, 0.28, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.75, side: THREE.DoubleSide });
    this.teleport.ring = new THREE.Mesh(ringGeo, ringMat);
    this.teleport.ring.rotation.x = -Math.PI / 2;
    this.teleport.ring.visible = false;
    this.scene.add(this.teleport.ring);

    // halo disc
    const discGeo = new THREE.CircleGeometry(0.16, 32);
    const discMat = new THREE.MeshBasicMaterial({ color: 0xff3c78, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
    this.teleport.reticle = new THREE.Mesh(discGeo, discMat);
    this.teleport.reticle.rotation.x = -Math.PI / 2;
    this.teleport.reticle.visible = false;
    this.scene.add(this.teleport.reticle);
  },

  _updateTeleportPreview(fromObj) {
    // Ray to floor plane y = this.teleport.floorY
    const origin = this.tmpV3;
    const dir = this.tmpV3b;

    fromObj.getWorldPosition(origin);
    fromObj.getWorldDirection(dir);

    // Aim slightly downward by default
    dir.y -= 0.35;
    dir.normalize();

    const t = (this.teleport.floorY - origin.y) / dir.y;
    if (!isFinite(t) || t <= 0) {
      this._setTeleportVisible(false);
      this.teleport.valid = false;
      return;
    }

    const hit = origin.clone().add(dir.multiplyScalar(t));
    // clamp within bounds
    hit.x = THREE.MathUtils.clamp(hit.x, this.teleport.bounds.minX, this.teleport.bounds.maxX);
    hit.z = THREE.MathUtils.clamp(hit.z, this.teleport.bounds.minZ, this.teleport.bounds.maxZ);
    hit.y = this.teleport.floorY;

    this.teleport.target.copy(hit);
    this.teleport.valid = true;

    this.teleport.ring.position.copy(hit);
    this.teleport.reticle.position.copy(hit);
    this._setTeleportVisible(true);
  },

  _setTeleportVisible(v) {
    this.teleport.ring.visible = v;
    this.teleport.reticle.visible = v;
  },

  _commitTeleport() {
    if (!this.teleport.valid) return;
    // keep current yaw
    const yaw = this._getPlayerYaw();
    this.player.group.position.set(this.teleport.target.x, this.teleport.target.y, this.teleport.target.z);
    this._setPlayerYaw(yaw);
  },

  /* ------------------ XR CONTROLLERS ------------------ */

  _setupXRControllers() {
    const controller0 = this.renderer.xr.getController(0);
    const controller1 = this.renderer.xr.getController(1);
    this.scene.add(controller0);
    this.scene.add(controller1);

    this.xr.c0 = controller0;
    this.xr.c1 = controller1;

    // rays
    this.xr.leftRay = this._makeRayLine(0x00ffaa);
    this.xr.rightRay = this._makeRayLine(0xff3c78);

    controller0.add(this.xr.leftRay);
    controller1.add(this.xr.rightRay);

    // Controller event handlers
    controller0.addEventListener("selectstart", () => this._onSelectStart(controller0));
    controller1.addEventListener("selectstart", () => this._onSelectStart(controller1));

    controller0.addEventListener("selectend", () => this._onSelectEnd(controller0));
    controller1.addEventListener("selectend", () => this._onSelectEnd(controller1));

    // Identify left/right by gamepad handedness during update
  },

  _makeRayLine(color) {
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
    const mat = new THREE.LineBasicMaterial({ color });
    const line = new THREE.Line(geo, mat);
    line.scale.z = 8;
    return line;
  },

  _readXRGamepads() {
    const session = this.renderer.xr.getSession();
    if (!session) return;

    for (const source of session.inputSources) {
      if (!source.gamepad) continue;
      const handed = source.handedness; // "left" / "right"
      const axes = source.gamepad.axes || [0, 0, 0, 0];

      // Common mapping: axes[2], axes[3] for thumbstick on Quest controllers
      const x = axes[2] ?? axes[0] ?? 0;
      const y = axes[3] ?? axes[1] ?? 0;

      if (handed === "left") {
        this.xr.left = source;
        this.xr.leftAxes[0] = x;
        this.xr.leftAxes[1] = y;
      } else if (handed === "right") {
        this.xr.right = source;
        this.xr.rightAxes[0] = x;
        this.xr.rightAxes[1] = y;
      }
    }
  },

  _applyXRSnapTurn(dt) {
    // Right stick snap turn 45 degrees; fix inverted by using sign as-is
    this.xr.snapCooldown = Math.max(0, this.xr.snapCooldown - dt);

    const x = this.xr.rightAxes[0] || 0;
    const dead = 0.55;

    if (this.xr.snapCooldown > 0) return;

    if (x > dead) {
      this._yawTurn(-Math.PI / 4); // right -> turn right
      this.xr.snapCooldown = 0.22;
    } else if (x < -dead) {
      this._yawTurn(Math.PI / 4); // left -> turn left
      this.xr.snapCooldown = 0.22;
    }
  },

  _applyXRTeleportPreview() {
    // Left stick forward/back activates teleport preview
    const y = this.xr.leftAxes[1] || 0;
    const active = y < -0.55; // pushing forward on Quest = negative y

    if (active) {
      // Use left controller object for aiming if available, else camera
      const aim = this.xr.c0 || this.camera;
      this._updateTeleportPreview(aim);
      this.xr.teleportDown = true;
    } else {
      if (this.xr.teleportDown) {
        // release to teleport
        this._commitTeleport();
      }
      this.xr.teleportDown = false;
      this._setTeleportVisible(false);
      this.teleport.valid = false;
    }
  },

  _onSelectStart(controllerObj) {
    // Right trigger = action/select. We will raycast and activate only if hit interactable
    const hit = this._raycastFrom(controllerObj);
    if (hit) {
      this._activateObject(hit.object);
    }
  },

  _onSelectEnd(controllerObj) {
    // no-op for now
  },

  _raycastFrom(fromObj) {
    const origin = this.tmpV3;
    const dir = this.tmpV3b;
    fromObj.getWorldPosition(origin);
    fromObj.getWorldDirection(dir);

    this.raycaster.set(origin, dir);
    const hits = this.raycaster.intersectObjects(this.interactables, true);
    if (hits.length > 0) return hits[0];
    return null;
  },

  _activateObject(obj) {
    // Only trigger action on objects that opt-in
    const ud = obj.userData || {};
    if (!ud.interactive && !ud.teleportTarget && !ud.joinSeat) return;

    // Teleport pads
    if (ud.teleportTarget) {
      this.teleportTo(ud.teleportTarget);
      return;
    }

    // Join seat
    if (ud.joinSeat) {
      try { Table?.sitPlayer?.(); } catch (e) {}
      // Optional: hide leaderboard later when seated, but you can change:
      // Leaderboard.setVisible(false);
      return;
    }

    // Other interactive
    if (typeof ud.onActivate === "function") {
      try { ud.onActivate(); } catch (e) {}
    }
  },

  /* ------------------ ROOMS / PORTALS ------------------ */

  teleportTo(roomName, force = false) {
    if (!this.rooms.spawns[roomName]) return;

    this.rooms.current = roomName;
    const s = this.rooms.spawns[roomName];

    // Move rig to spawn; keep camera inside rig so controllers follow
    this.player.group.position.copy(s.pos);
    this._setPlayerYaw(s.yaw);

    // clamp in bounds
    this.player.group.position.x = THREE.MathUtils.clamp(this.player.group.position.x, this.teleport.bounds.minX, this.teleport.bounds.maxX);
    this.player.group.position.z = THREE.MathUtils.clamp(this.player.group.position.z, this.teleport.bounds.minZ, this.teleport.bounds.maxZ);

    // Place leaderboard near table, or change per room if you want
    if (Leaderboard?.board) {
      if (roomName === "poker") Leaderboard.anchor.set(0, 1.55, -3.9);
      if (roomName === "lobby") Leaderboard.anchor.set(0, 1.55, 1.2);
      if (roomName === "store") Leaderboard.anchor.set(8, 1.55, 1.2);
      if (Leaderboard.board) Leaderboard.board.position.copy(Leaderboard.anchor);
      if (Leaderboard.group) Leaderboard.group.position.set(0, 0, 0);
    }
  },

  _makeRoomPortals() {
    // Neon teleport pads for Lobby/Store/Poker
    const makePad = (pos, label, target) => {
      const g = new THREE.Group();
      g.position.copy(pos);

      const disc = new THREE.Mesh(
        new THREE.CircleGeometry(0.42, 40),
        new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
      );
      disc.rotation.x = -Math.PI / 2;
      g.add(disc);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.44, 0.58, 48),
        new THREE.MeshBasicMaterial({ color: 0xff3c78, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.01;
      g.add(ring);

      // label
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(0, 0, 512, 256);
      ctx.strokeStyle = "rgba(0,255,170,0.85)";
      ctx.lineWidth = 10;
      ctx.strokeRect(14, 14, 484, 228);
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.font = "bold 64px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(label, 256, 150);

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(0.95, 0.48),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true })
      );
      plane.position.set(0, 1.1, 0);
      g.add(plane);

      // Interactable collider (invisible)
      const hit = new THREE.Mesh(
        new THREE.CylinderGeometry(0.6, 0.6, 1.3, 10),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0 })
      );
      hit.position.y = 0.65;
      hit.userData.interactive = true;
      hit.userData.teleportTarget = target;
      g.add(hit);

      this.scene.add(g);
      this.interactables.push(hit);

      return g;
    };

    // Place pads in reasonable locations
    makePad(new THREE.Vector3(0, 0.01, 3.2), "POKER", "poker");
    makePad(new THREE.Vector3(2.2, 0.01, 3.2), "STORE", "store");
    makePad(new THREE.Vector3(-2.2, 0.01, 3.2), "LOBBY", "lobby");
  },

  /* ------------------ AUDIO ------------------ */

  _setupAudio() {
    this.audio.listener = new THREE.AudioListener();
    this.camera.add(this.audio.listener);

    this.audio.bg = new THREE.Audio(this.audio.listener);

    const loader = new THREE.AudioLoader();
    loader.load(
      this.audio.bgUrl,
      (buffer) => {
        this.audio.bg.setBuffer(buffer);
        this.audio.bg.setLoop(true);
        this.audio.bg.setVolume(0.45);
        this.audio.ready = true;
        // Do not autoplay (mobile/Quest policy). User must tap/click.
        console.log("Audio loaded:", this.audio.bgUrl);
      },
      undefined,
      (err) => {
        console.warn("Audio missing or failed:", this.audio.bgUrl, err);
        this.audio.ready = false;
      }
    );
  },

  toggleAudio() {
    // must be called from a user gesture to work reliably
    if (!this.audio.bg) return;

    if (!this.audio.ready) {
      console.warn("Audio not ready yet:", this.audio.bgUrl);
      return;
    }

    if (this.audio.bg.isPlaying) {
      this.audio.bg.stop();
      this.audio.enabled = false;
    } else {
      this.audio.bg.play();
      this.audio.enabled = true;
    }
  },

  /* ------------------ MOBILE UI (Android) ------------------ */

  _setupMobileOverlay() {
    // Always create; harmless on Quest too
    const root = document.createElement("div");
    root.style.position = "fixed";
    root.style.left = "0";
    root.style.top = "0";
    root.style.width = "100%";
    root.style.height = "100%";
    root.style.pointerEvents = "none";
    root.style.zIndex = "9999";
    document.body.appendChild(root);
    this.mobileUI.root = root;

    // joystick base
    const base = document.createElement("div");
    base.style.position = "absolute";
    base.style.left = "18px";
    base.style.bottom = "18px";
    base.style.width = "140px";
    base.style.height = "140px";
    base.style.borderRadius = "999px";
    base.style.background = "rgba(0,0,0,0.35)";
    base.style.border = "2px solid rgba(0,255,170,0.55)";
    base.style.boxShadow = "0 0 18px rgba(0,255,170,0.25)";
    base.style.pointerEvents = "auto";

    const knob = document.createElement("div");
    knob.style.position = "absolute";
    knob.style.left = "50%";
    knob.style.top = "50%";
    knob.style.transform = "translate(-50%,-50%)";
    knob.style.width = "68px";
    knob.style.height = "68px";
    knob.style.borderRadius = "999px";
    knob.style.background = "rgba(255,60,120,0.35)";
    knob.style.border = "2px solid rgba(255,60,120,0.85)";
    knob.style.boxShadow = "0 0 18px rgba(255,60,120,0.25)";
    base.appendChild(knob);

    root.appendChild(base);
    this.mobileUI.joystick.base = base;
    this.mobileUI.joystick.knob = knob;

    // Buttons (top-right)
    const makeBtn = (text, topPx) => {
      const b = document.createElement("button");
      b.textContent = text;
      b.style.position = "absolute";
      b.style.right = "14px";
      b.style.top = `${topPx}px`;
      b.style.padding = "10px 12px";
      b.style.borderRadius = "12px";
      b.style.border = "1px solid rgba(0,255,170,0.55)";
      b.style.background = "rgba(0,0,0,0.45)";
      b.style.color = "white";
      b.style.fontWeight = "700";
      b.style.pointerEvents = "auto";
      b.style.boxShadow = "0 0 14px rgba(0,255,170,0.15)";
      return b;
    };

    const btnAudio = makeBtn("AUDIO", 14);
    const btnMenu = makeBtn("MENU", 64);
    const btnReset = makeBtn("RESET", 114);

    root.appendChild(btnAudio);
    root.appendChild(btnMenu);
    root.appendChild(btnReset);

    this.mobileUI.btnAudio = btnAudio;
    this.mobileUI.btnMenu = btnMenu;
    this.mobileUI.btnReset = btnReset;

    btnAudio.addEventListener("click", (e) => {
      e.preventDefault();
      this.toggleAudio();
    });

    btnReset.addEventListener("click", (e) => {
      e.preventDefault();
      this.teleportTo(this.rooms.current, true);
    });

    btnMenu.addEventListener("click", (e) => {
      e.preventDefault();
      this.mobileUI.menuOpen = !this.mobileUI.menuOpen;
      this._setMenuButtonsVisible(this.mobileUI.menuOpen);
    });

    // Menu buttons
    const btnLobby = makeBtn("LOBBY", 170);
    const btnStore = makeBtn("STORE", 220);
    const btnPoker = makeBtn("POKER", 270);
    root.appendChild(btnLobby);
    root.appendChild(btnStore);
    root.appendChild(btnPoker);
    this.mobileUI.btnLobby = btnLobby;
    this.mobileUI.btnStore = btnStore;
    this.mobileUI.btnPoker = btnPoker;

    btnLobby.addEventListener("click", (e) => { e.preventDefault(); this.teleportTo("lobby"); });
    btnStore.addEventListener("click", (e) => { e.preventDefault(); this.teleportTo("store"); });
    btnPoker.addEventListener("click", (e) => { e.preventDefault(); this.teleportTo("poker"); });

    this._setMenuButtonsVisible(false);

    // Joystick touch handlers
    const joy = this.mobileUI.joystick;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    base.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      joy.active = true;
      joy.id = e.pointerId;
      joy.start.x = e.clientX;
      joy.start.y = e.clientY;
      joy.vec.x = 0;
      joy.vec.y = 0;
      base.setPointerCapture(e.pointerId);
    });

    base.addEventListener("pointermove", (e) => {
      if (!joy.active || e.pointerId !== joy.id) return;
      const dx = e.clientX - joy.start.x;
      const dy = e.clientY - joy.start.y;

      // joystick radius
      const r = 48;
      const nx = clamp(dx / r, -1, 1);
      const ny = clamp(dy / r, -1, 1);

      joy.vec.x = nx;
      joy.vec.y = ny;

      // move knob
      joy.knob.style.transform = `translate(-50%,-50%) translate(${nx * r}px, ${ny * r}px)`;
    });

    const endJoy = (e) => {
      if (!joy.active || e.pointerId !== joy.id) return;
      joy.active = false;
      joy.id = null;
      joy.vec.x = 0;
      joy.vec.y = 0;
      joy.knob.style.transform = "translate(-50%,-50%)";
    };

    base.addEventListener("pointerup", endJoy);
    base.addEventListener("pointercancel", endJoy);
    base.addEventListener("pointerleave", endJoy);
  },

  _setMenuButtonsVisible(v) {
    const show = (el) => { if (!el) return; el.style.display = v ? "block" : "none"; };
    show(this.mobileUI.btnLobby);
    show(this.mobileUI.btnStore);
    show(this.mobileUI.btnPoker);
  },

  /* ------------------ PLAYER YAW / MOVE ------------------ */

  _getPlayerYaw() {
    return this.player.group.rotation.y;
  },

  _setPlayerYaw(yaw) {
    this.player.group.rotation.set(0, yaw, 0);
  },

  _yawTurn(delta) {
    this.player.group.rotation.y += delta;
  },

  _applyMobileMovement(dt) {
    const joy = this.mobileUI.joystick;
    if (!joy) return;

    // If XR session is running, do not apply mobile joystick
    if (this.renderer.xr.isPresenting) return;

    // Joystick: forward/back on -Y, strafe on X
    const x = joy.vec.x || 0;
    const y = joy.vec.y || 0;

    const dead = 0.12;
    const sx = Math.abs(x) < dead ? 0 : x;
    const sy = Math.abs(y) < dead ? 0 : y;

    const speed = 2.2; // meters/sec
    const yaw = this._getPlayerYaw();

    // forward vector (camera relative to yaw)
    const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);

    const move = new THREE.Vector3();
    move.addScaledVector(right, sx * speed * dt);
    move.addScaledVector(forward, -sy * speed * dt); // joystick down = forward

    this.player.group.position.add(move);

    // clamp bounds
    this.player.group.position.x = THREE.MathUtils.clamp(this.player.group.position.x, this.teleport.bounds.minX, this.teleport.bounds.maxX);
    this.player.group.position.z = THREE.MathUtils.clamp(this.player.group.position.z, this.teleport.bounds.minZ, this.teleport.bounds.maxZ);
  },

  /* ------------------ LOOP ------------------ */

  _animate() {
    const dt = Math.min(this.clock.getDelta(), 0.033);

    // XR input
    this._readXRGamepads();

    if (this.renderer.xr.isPresenting) {
      this._applyXRSnapTurn(dt);
      this._applyXRTeleportPreview();
    } else {
      // mobile movement (Android browser)
      this._applyMobileMovement(dt);
      // hide teleport visuals outside XR
      this._setTeleportVisible(false);
      this.teleport.valid = false;
    }

    // Update game systems
    try { Table?.update?.(dt, this.camera); } catch (e) {}

    // Update leaderboard with table snapshot
    try {
      const data = Table?.getLeaderboardData?.() || null;
      Leaderboard?.update?.(dt, this.camera, data);
    } catch (e) {}

    // Render
    this.renderer.render(this.scene, this.camera);
  },

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  },
};

// Boot
window.addEventListener("DOMContentLoaded", () => App.init());
