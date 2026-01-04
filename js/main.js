// js/main.js
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { World } from "./world.js";
import { Table } from "./table.js";
import { Leaderboard } from "./leaderboard.js";
import { EventChips } from "./event_chips.js";
import { UI } from "./ui.js";

/**
 * Main:
 * - FIX blackscreen: nothing attaches to camera; UI planes are safe; leaderboard never near face
 * - VR Controls:
 *    Left stick forward => teleport halo preview, release => jump
 *    Right stick left/right => snap turn 45°
 *    Right trigger => ACTION only on interactables
 * - Android: menu + buttons
 * - Solid walls/furniture: clamp + blockers
 * - Store membership => +1 event chip + spawn physical chip
 */

const App = {
  scene: null,
  camera: null,
  renderer: null,
  clock: new THREE.Clock(),

  player: { group: null },

  // collisions
  blockers: [],
  bounds: { minX: -14.2, maxX: 14.2, minZ: -14.2, maxZ: 14.2 },

  // teleport preview
  tp: { ring: null, disc: null, valid: false, target: new THREE.Vector3(), floorY: 0 },

  // interaction
  raycaster: new THREE.Raycaster(),
  interactables: [],
  explicitInteractables: [],

  // XR
  xr: {
    c0: null, c1: null,
    leftAxes: [0, 0],
    rightAxes: [0, 0],
    snapCooldown: 0,
    teleportDown: false,
    lastButtons: { left: [], right: [] }
  },

  // rooms + safe spawns (NO table spawn)
  rooms: {
    current: "lobby",
    spawns: {
      lobby: { pos: new THREE.Vector3(0, 0, 4), yaw: Math.PI },
      store: { pos: new THREE.Vector3(9.2, 0, 4.0), yaw: -Math.PI / 2 },
      poker: { pos: new THREE.Vector3(0, 0, -1.4), yaw: Math.PI } // NOT on table
    }
  },

  // audio
  audio: { listener: null, bg: null, url: "assets/audio/lobby_ambience.mp3", ready: false },

  // temp vectors
  v0: new THREE.Vector3(),
  v1: new THREE.Vector3(),
  v2: new THREE.Vector3(),

  init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05060c);

    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.xr.enabled = true;

    document.body.appendChild(this.renderer.domElement);
    document.body.appendChild(VRButton.createButton(this.renderer));

    // Player rig (camera ONLY here)
    this.player.group = new THREE.Group();
    this.player.group.name = "player_rig";
    this.scene.add(this.player.group);
    this.player.group.add(this.camera);

    this._addLights();
    this._buildTeleportHelpers();
    this._setupXRControllers();
    this._setupAudio();

    // UI overlay
    UI.init({
      onTeleport: (room) => this.teleportTo(room),
      onToggleAudio: () => this.toggleAudio(),
      onSpawnChip: () => this.spawnChipInFront(),
    });

    // Build world/table/board
    const worldInfo = World.build(this.scene, this.player.group);
    this.blockers = worldInfo?.blockers || [];
    this.tp.floorY = worldInfo?.floorY ?? 0.0;

    Table.build(this.scene);

    Leaderboard.build(this.scene);
    // Safe anchors per room
    Leaderboard.anchor.set(0, 1.55, -3.9);

    EventChips.init(this.scene, this.tp.floorY);

    // portals + store items
    this._makePortals();
    this._makeStoreItems();

    // Tag interactables
    this._autoTagInteractables();

    // Spawn lobby
    this.teleportTo("lobby");
    UI.notify("Welcome. Left stick = teleport halo. Right stick = snap-turn. Trigger = action only on pads/items/chips.");

    window.addEventListener("resize", () => this._onResize());
    this._onResize();

    this.renderer.setAnimationLoop(() => this._animate());
  },

  /* ---------------- Lighting ---------------- */
  _addLights() {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 0.82);
    this.scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 1.15);
    dir.position.set(6, 10, 6);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    dir.shadow.camera.near = 0.5;
    dir.shadow.camera.far = 60;
    dir.shadow.camera.left = -18;
    dir.shadow.camera.right = 18;
    dir.shadow.camera.top = 18;
    dir.shadow.camera.bottom = -18;
    this.scene.add(dir);

    // extra soft point lights around table
    const p1 = new THREE.PointLight(0x00ffaa, 0.75, 18);
    p1.position.set(-5, 2.6, -5);
    this.scene.add(p1);

    const p2 = new THREE.PointLight(0xff3c78, 0.65, 18);
    p2.position.set(5, 2.6, -5);
    this.scene.add(p2);
  },

  /* ---------------- Teleport visuals ---------------- */
  _buildTeleportHelpers() {
    const ringGeo = new THREE.RingGeometry(0.18, 0.32, 36);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.78, side: THREE.DoubleSide });
    this.tp.ring = new THREE.Mesh(ringGeo, ringMat);
    this.tp.ring.rotation.x = -Math.PI / 2;
    this.tp.ring.visible = false;
    this.scene.add(this.tp.ring);

    const discGeo = new THREE.CircleGeometry(0.16, 36);
    const discMat = new THREE.MeshBasicMaterial({ color: 0xff3c78, transparent: true, opacity: 0.26, side: THREE.DoubleSide });
    this.tp.disc = new THREE.Mesh(discGeo, discMat);
    this.tp.disc.rotation.x = -Math.PI / 2;
    this.tp.disc.visible = false;
    this.scene.add(this.tp.disc);
  },

  _tpVisible(v) {
    this.tp.ring.visible = v;
    this.tp.disc.visible = v;
  },

  _updateTeleportPreview(fromObj) {
    const origin = this.v0;
    const dir = this.v1;

    fromObj.getWorldPosition(origin);
    fromObj.getWorldDirection(dir);

    // down-bias for floor hit
    dir.y -= 0.35;
    dir.normalize();

    const t = (this.tp.floorY - origin.y) / dir.y;
    if (!isFinite(t) || t <= 0) {
      this.tp.valid = false;
      this._tpVisible(false);
      return;
    }

    const hit = origin.clone().add(dir.multiplyScalar(t));

    // bounds clamp
    hit.x = THREE.MathUtils.clamp(hit.x, this.bounds.minX, this.bounds.maxX);
    hit.z = THREE.MathUtils.clamp(hit.z, this.bounds.minZ, this.bounds.maxZ);
    hit.y = this.tp.floorY;

    this.tp.target.copy(hit);
    this.tp.valid = true;

    this.tp.ring.position.copy(hit);
    this.tp.disc.position.copy(hit);
    this._tpVisible(true);
  },

  _commitTeleport() {
    if (!this.tp.valid) return;
    const yaw = this.player.group.rotation.y;
    this.player.group.position.copy(this.tp.target);
    this.player.group.rotation.y = yaw;
    this._resolveCollisions();
  },

  /* ---------------- XR Controllers ---------------- */
  _setupXRControllers() {
    this.xr.c0 = this.renderer.xr.getController(0);
    this.xr.c1 = this.renderer.xr.getController(1);
    this.scene.add(this.xr.c0);
    this.scene.add(this.xr.c1);

    const makeRay = (color) => {
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
      const mat = new THREE.LineBasicMaterial({ color });
      const line = new THREE.Line(geo, mat);
      line.scale.z = 8;
      return line;
    };
    this.xr.c0.add(makeRay(0x00ffaa));
    this.xr.c1.add(makeRay(0xff3c78));

    this.xr.c0.addEventListener("selectstart", () => this._onSelect(this.xr.c0, "left"));
    this.xr.c1.addEventListener("selectstart", () => this._onSelect(this.xr.c1, "right"));
  },

  _readXRGamepads() {
    const session = this.renderer.xr.getSession();
    if (!session) return;

    for (const source of session.inputSources) {
      if (!source.gamepad) continue;

      const axes = source.gamepad.axes || [0, 0, 0, 0];
      const x = axes[2] ?? axes[0] ?? 0;
      const y = axes[3] ?? axes[1] ?? 0;

      if (source.handedness === "left") {
        this.xr.leftAxes[0] = x;
        this.xr.leftAxes[1] = y;
        this._handleButtons("left", source.gamepad.buttons || []);
      } else if (source.handedness === "right") {
        this.xr.rightAxes[0] = x;
        this.xr.rightAxes[1] = y;
        this._handleButtons("right", source.gamepad.buttons || []);
      }
    }
  },

  _handleButtons(hand, buttons) {
    // Toggle menu on Y (left controller button[3] commonly)
    const last = this.xr.lastButtons[hand] || [];
    const pressed = (i) => !!buttons[i]?.pressed;
    const was = (i) => !!last[i]?.pressed;

    if (hand === "left") {
      // Y / X toggles menu (robust)
      if ((pressed(3) && !was(3)) || (pressed(4) && !was(4))) {
        UI.setMenu(!UI.menuOpen);
        UI.toast(UI.menuOpen ? "Menu OPEN" : "Menu CLOSED");
      }
    }
    this.xr.lastButtons[hand] = buttons.map(b => ({ pressed: !!b.pressed }));
  },

  _applySnapTurn(dt) {
    this.xr.snapCooldown = Math.max(0, this.xr.snapCooldown - dt);
    if (this.xr.snapCooldown > 0) return;

    const x = this.xr.rightAxes[0] || 0;
    const dead = 0.55;

    if (x > dead) { // right
      this.player.group.rotation.y -= Math.PI / 4;
      this.xr.snapCooldown = 0.22;
    } else if (x < -dead) { // left
      this.player.group.rotation.y += Math.PI / 4;
      this.xr.snapCooldown = 0.22;
    }
  },

  _applyTeleportInput() {
    const y = this.xr.leftAxes[1] || 0;
    const active = y < -0.55; // push forward

    if (active) {
      this._updateTeleportPreview(this.xr.c0 || this.camera);
      this.xr.teleportDown = true;
    } else {
      if (this.xr.teleportDown) this._commitTeleport();
      this.xr.teleportDown = false;
      this.tp.valid = false;
      this._tpVisible(false);
    }
  },

  /* ---------------- Interaction ---------------- */
  _autoTagInteractables() {
    this.interactables = [];

    const push = (obj) => {
      if (!obj || !obj.isObject3D) return;
      if (!obj.userData) obj.userData = {};
      this.interactables.push(obj);
    };

    // explicit list first
    for (const e of this.explicitInteractables) push(e);

    // also include event chips
    this.scene.traverse((obj) => {
      if (!obj.isObject3D) return;
      if (obj.userData?.isEventChip) push(obj);
      if (obj.userData?.interactive) push(obj);
    });

    UI.toast(`Interactables: ${this.interactables.length}`);
  },

  _raycastFrom(fromObj) {
    fromObj.getWorldPosition(this.v0);
    fromObj.getWorldDirection(this.v1);
    this.raycaster.set(this.v0, this.v1);
    const hits = this.raycaster.intersectObjects(this.interactables, true);
    return hits[0] || null;
  },

  _onSelect(controllerObj, hand) {
    const hit = this._raycastFrom(controllerObj);
    if (!hit) { UI.toast("No hit"); return; }

    let obj = hit.object;
    while (obj && obj.parent && obj !== obj.parent && !obj.userData?.interactive && !obj.userData?.isEventChip) obj = obj.parent;

    const ud = obj.userData || {};
    UI.toast(`Hit: ${obj.name || "object"} tp=${ud.teleportTarget || "-"} item=${ud.itemId || "-"} join=${ud.joinSeat ? "Y" : "-"}`);

    // chips pickup/drop
    if (ud.isEventChip) {
      EventChips.tryPickupOrDrop((m) => UI.toast(m), controllerObj, this.camera, { object: obj }, hand);
      return;
    }

    // Teleport pads
    if (ud.teleportTarget) {
      this.teleportTo(ud.teleportTarget);
      return;
    }

    // Join seat (stub)
    if (ud.joinSeat) {
      UI.notify("Join seat detected. (Seat-locking is next step; current build = spectate + observe gameplay.)");
      return;
    }

    // Store items
    if (ud.itemId) {
      const id = String(ud.itemId).toLowerCase();
      if (id.includes("membership") || id.includes("lux") || id.includes("pass")) {
        EventChips.purchaseMembership((m) => UI.toast(m));
        this.spawnChipInFront();
        return;
      }
      UI.notify(`Store item clicked: ${ud.itemId} (store purchase logic stubbed; membership is live).`);
      return;
    }
  },

  /* ---------------- Rooms / Portals / Store ---------------- */
  teleportTo(roomName) {
    const s = this.rooms.spawns[roomName];
    if (!s) return;

    this.rooms.current = roomName;

    this.player.group.position.copy(s.pos);
    this.player.group.rotation.set(0, s.yaw, 0);

    // leaderboard anchor per room
    if (roomName === "poker") Leaderboard.anchor.set(0, 1.55, -3.9);
    if (roomName === "lobby") Leaderboard.anchor.set(0, 1.55, 1.2);
    if (roomName === "store") Leaderboard.anchor.set(9.2, 1.55, 1.2);

    if (Leaderboard.group) {
      Leaderboard.group.position.copy(Leaderboard.anchor);
      Leaderboard.group.rotation.y = Math.PI;
    }

    this._resolveCollisions();
    UI.notify(`Entered: ${roomName.toUpperCase()}`);
  },

  _makePortals() {
    const makePad = (pos, label, target) => {
      const g = new THREE.Group();
      g.position.copy(pos);

      const disc = new THREE.Mesh(
        new THREE.CircleGeometry(0.42, 40),
        new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.28, side: THREE.DoubleSide })
      );
      disc.rotation.x = -Math.PI / 2;
      g.add(disc);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.44, 0.62, 56),
        new THREE.MeshBasicMaterial({ color: 0xff3c78, transparent: true, opacity: 0.88, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.01;
      g.add(ring);

      // invisible hit volume
      const hit = new THREE.Mesh(
        new THREE.CylinderGeometry(0.65, 0.65, 1.35, 10),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0 })
      );
      hit.position.y = 0.67;
      hit.name = `portal_${target}`;
      hit.userData.interactive = true;
      hit.userData.teleportTarget = target;
      g.add(hit);

      // label
      const c = document.createElement("canvas");
      c.width = 512; c.height = 256;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(0, 0, 512, 256);
      ctx.strokeStyle = "rgba(0,255,170,0.85)";
      ctx.lineWidth = 10;
      ctx.strokeRect(14, 14, 484, 228);
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.font = "bold 64px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(label, 256, 150);

      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;

      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(0.95, 0.48),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false })
      );
      plane.position.set(0, 1.1, 0);
      plane.renderOrder = 900;
      g.add(plane);

      this.scene.add(g);
      this.explicitInteractables.push(hit);
    };

    makePad(new THREE.Vector3(0, 0.01, 3.2), "POKER", "poker");
    makePad(new THREE.Vector3(2.2, 0.01, 3.2), "STORE", "store");
    makePad(new THREE.Vector3(-2.2, 0.01, 3.2), "LOBBY", "lobby");
  },

  _makeStoreItems() {
    // membership kiosk item (interactive)
    const mat = new THREE.MeshStandardMaterial({ color: 0x0a0b10, roughness: 0.85, metalness: 0.05, emissive: 0x101018, emissiveIntensity: 0.25 });
    const g = new THREE.Group();
    g.position.set(9.2, 0, 4.0);

    const kiosk = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.2, 0.6), mat);
    kiosk.position.set(0, 0.6, -2.0);
    kiosk.castShadow = true;
    kiosk.receiveShadow = true;
    kiosk.name = "item_membership_pass";
    kiosk.userData.interactive = true;
    kiosk.userData.itemId = "item_membership_pass";
    g.add(kiosk);

    const sign = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.25, 0.06), mat);
    sign.position.set(0, 1.25, -2.0);
    sign.name = "shop_sign";
    g.add(sign);

    this.scene.add(g);
    this.explicitInteractables.push(kiosk);
  },

  spawnChipInFront() {
    const p = new THREE.Vector3();
    this.camera.getWorldPosition(p);
    const fwd = new THREE.Vector3();
    this.camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();
    p.add(fwd.multiplyScalar(0.65));
    p.y = this.tp.floorY + 0.08;

    EventChips.spawnPhysicalEventChip(p, this.player.group.rotation.y, new THREE.Vector3(0, 0.28, -0.65));
    this._autoTagInteractables();
    UI.toast("Spawned Event Chip.");
  },

  /* ---------------- Audio ---------------- */
  _setupAudio() {
    this.audio.listener = new THREE.AudioListener();
    this.camera.add(this.audio.listener);

    this.audio.bg = new THREE.Audio(this.audio.listener);

    const loader = new THREE.AudioLoader();
    loader.load(
      this.audio.url,
      (buffer) => {
        this.audio.bg.setBuffer(buffer);
        this.audio.bg.setLoop(true);
        this.audio.bg.setVolume(0.45);
        this.audio.ready = true;
        UI.toast("Audio loaded ✅");
      },
      undefined,
      () => {
        this.audio.ready = false;
        UI.notify("Audio missing: assets/audio/lobby_ambience.mp3");
      }
    );
  },

  toggleAudio() {
    if (!this.audio.bg || !this.audio.ready) { UI.toast("Audio not ready"); return; }
    if (this.audio.bg.isPlaying) { this.audio.bg.stop(); UI.toast("Audio OFF"); }
    else { this.audio.bg.play(); UI.toast("Audio ON"); }
  },

  /* ---------------- Collision resolution ---------------- */
  _resolveCollisions() {
    // clamp to bounds
    const p = this.player.group.position;
    p.x = THREE.MathUtils.clamp(p.x, this.bounds.minX, this.bounds.maxX);
    p.z = THREE.MathUtils.clamp(p.z, this.bounds.minZ, this.bounds.maxZ);

    // push out of blockers (simple AABB)
    for (const b of this.blockers) {
      if (!b?.min || !b?.max) continue;
      if (p.x > b.min.x && p.x < b.max.x && p.z > b.min.z && p.z < b.max.z && p.y >= b.min.y && p.y <= b.max.y + 1.7) {
        // push to nearest edge
        const dxMin = Math.abs(p.x - b.min.x);
        const dxMax = Math.abs(b.max.x - p.x);
        const dzMin = Math.abs(p.z - b.min.z);
        const dzMax = Math.abs(b.max.z - p.z);

        const m = Math.min(dxMin, dxMax, dzMin, dzMax);
        if (m === dxMin) p.x = b.min.x - 0.25;
        else if (m === dxMax) p.x = b.max.x + 0.25;
        else if (m === dzMin) p.z = b.min.z - 0.25;
        else p.z = b.max.z + 0.25;
      }
    }
  },

  /* ---------------- Main loop ---------------- */
  _animate() {
    const dt = Math.min(this.clock.getDelta(), 0.033);

    if (this.renderer.xr.isPresenting) {
      this._readXRGamepads();
      this._applySnapTurn(dt);
      this._applyTeleportInput();
    } else {
      // non-VR: keep halo off
      this.tp.valid = false;
      this._tpVisible(false);
    }

    // Update game modules
    Table.update(dt, this.camera);
    Leaderboard.update(dt, this.camera, Table.getLeaderboardData());

    EventChips.update(dt, this.xr.c0, this.xr.c1, this.camera);

    // hard safety: never allow leaderboard to block view
    if (Leaderboard.group) {
      const camPos = new THREE.Vector3();
      this.camera.getWorldPosition(camPos);
      const boardPos = new THREE.Vector3();
      Leaderboard.group.getWorldPosition(boardPos);
      if (camPos.distanceTo(boardPos) < 1.25) {
        Leaderboard.group.position.copy(Leaderboard.anchor);
        Leaderboard.group.rotation.y = Math.PI;
      }
    }

    this.renderer.render(this.scene, this.camera);
  },

  _onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  },
};

window.addEventListener("DOMContentLoaded", () => App.init());
