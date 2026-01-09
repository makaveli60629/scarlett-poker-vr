// /js/world.js — Scarlett World v11.2 (YOUR CASINO RESTORED + STORE DISPLAY + 2 NPCs + AVATAR 4.0)
//
// Keeps your: room textures, table, rail, pillars/plants, doors, chairs/seats fix, Bots.js
// Adds:
// - Store outside display: 4 mannequins + second pillar/rail showcase (near STORE door area)
// - Two floor bots only: Guard (idle) + Walker (patrol loop)
// - Exports CyberAvatar (Update 4.0 hands-only rig) for main.js to use

import { Bots } from "./bots.js";

export async function initWorld({ THREE, scene, log, v } = {}) {
  const group = new THREE.Group();
  group.name = "WorldRoot";
  scene.add(group);

  const tableFocus = new THREE.Vector3(0, 0, -6.5);
  const tableY = 0.92;

  // ---------- TEXTURES ----------
  const loader = new THREE.TextureLoader();

  const floorTex = loader.load("./assets/textures/scarlett_floor_tile_seamless.png?v=" + v);
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(6, 6);
  floorTex.colorSpace = THREE.SRGBColorSpace;

  const wallTex = loader.load("./assets/textures/1767279790736.jpg?v=" + v);
  wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
  wallTex.repeat.set(5, 2);
  wallTex.colorSpace = THREE.SRGBColorSpace;

  const doorTex = loader.load("./assets/textures/scarlett_door.png?v=" + v);
  doorTex.colorSpace = THREE.SRGBColorSpace;

  // ---------- ROOM ----------
  const roomW = 28, roomD = 28, roomH = 6.8;

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(roomW, roomD),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.92, metalness: 0.0 })
  );
  floor.name = "Floor";
  floor.rotation.x = -Math.PI / 2;
  group.add(floor);

  function wall(x, z, ry, w = roomW, h = roomH) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.88, metalness: 0.0 })
    );
    m.position.set(x, h / 2, z);
    m.rotation.y = ry;
    group.add(m);
    return m;
  }
  wall(0, -roomD / 2, 0, roomW, roomH);
  wall(0,  roomD / 2, Math.PI, roomW, roomH);
  wall(-roomW / 2, 0, Math.PI / 2, roomD, roomH);
  wall( roomW / 2, 0, -Math.PI / 2, roomD, roomH);

  // ---------- LIGHTS ----------
  const ceil = new THREE.Group();
  ceil.name = "CeilingLights";
  group.add(ceil);

  function addCeilLight(x, z, color, intensity) {
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 16, 12),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.0, roughness: 0.2 })
    );
    bulb.position.set(x, roomH - 0.35, z);
    ceil.add(bulb);

    const L = new THREE.PointLight(color, intensity, 14);
    L.position.copy(bulb.position);
    ceil.add(L);
  }

  addCeilLight(0, tableFocus.z, 0x7fe7ff, 0.85);
  addCeilLight(2.8, tableFocus.z - 1.5, 0xff2d7a, 0.65);
  addCeilLight(-2.8, tableFocus.z - 1.5, 0xff2d7a, 0.65);
  addCeilLight(0, tableFocus.z + 2.2, 0xffffff, 0.7);

  addCeilLight(roomW/2 - 2.5, roomD/2 - 2.5, 0x7fe7ff, 0.35);
  addCeilLight(-roomW/2 + 2.5, roomD/2 - 2.5, 0xff2d7a, 0.35);
  addCeilLight(roomW/2 - 2.5, -roomD/2 + 2.5, 0xff2d7a, 0.35);
  addCeilLight(-roomW/2 + 2.5, -roomD/2 + 2.5, 0x7fe7ff, 0.35);

  // ---------- TABLE ----------
  function feltTexture() {
    const c = document.createElement("canvas");
    c.width = 1024; c.height = 1024;
    const ctx = c.getContext("2d");

    ctx.fillStyle = "#0a3a2c";
    ctx.fillRect(0,0,1024,1024);

    for (let i = 0; i < 1400; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random()*0.02})`;
      ctx.fillRect(Math.random()*1024, Math.random()*1024, 2, 2);
    }

    ctx.strokeStyle = "rgba(255,255,255,0.92)";
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.ellipse(512, 512, 440, 330, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(127,231,255,0.88)";
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.ellipse(512, 512, 365, 270, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.font = "bold 90px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SCARLETT VR POKER", 512, 512);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  const tableTop = new THREE.Mesh(
    new THREE.CylinderGeometry(1.95, 2.25, 0.18, 64),
    new THREE.MeshStandardMaterial({ map: feltTexture(), roughness: 0.88, metalness: 0.05 })
  );
  tableTop.name = "TableTop";
  tableTop.position.set(tableFocus.x, tableY, tableFocus.z);
  group.add(tableTop);

  const tableBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.90, 1.15, 28),
    new THREE.MeshStandardMaterial({ color: 0x121826, roughness: 0.6, metalness: 0.2 })
  );
  tableBase.name = "TableBase";
  tableBase.position.set(tableFocus.x, tableY - 0.68, tableFocus.z);
  group.add(tableBase);

  // ---------- RAIL ----------
  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(3.85, 0.10, 12, 90),
    new THREE.MeshStandardMaterial({
      color: 0x0b0d14, roughness: 0.45, metalness: 0.25,
      emissive: 0x101020, emissiveIntensity: 0.25
    })
  );
  rail.name = "Rail";
  rail.position.set(tableFocus.x, 0.95, tableFocus.z);
  rail.rotation.x = Math.PI / 2;
  group.add(rail);

  const railGlow = new THREE.Mesh(
    new THREE.TorusGeometry(3.85, 0.03, 10, 120),
    new THREE.MeshStandardMaterial({
      color: 0x7fe7ff, emissive: 0x7fe7ff, emissiveIntensity: 0.52,
      roughness: 0.2, metalness: 0.0
    })
  );
  railGlow.position.copy(rail.position);
  railGlow.rotation.copy(rail.rotation);
  group.add(railGlow);

  // ---------- DECOR ----------
  function pillar(x, z) {
    const p = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.28, 3.8, 18),
      new THREE.MeshStandardMaterial({ color: 0x0f121a, roughness: 0.55, metalness: 0.25 })
    );
    p.position.set(x, 1.9, z);
    group.add(p);
  }
  pillar(-roomW/2 + 1.8, tableFocus.z - 6);
  pillar(roomW/2 - 1.8, tableFocus.z - 6);
  pillar(-roomW/2 + 1.8, tableFocus.z + 6);
  pillar(roomW/2 - 1.8, tableFocus.z + 6);

  function plant(x, z) {
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.26, 0.32, 16),
      new THREE.MeshStandardMaterial({ color: 0x1a1f2a, roughness: 0.7, metalness: 0.05 })
    );
    pot.position.set(x, 0.16, z);
    group.add(pot);

    const leaves = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 18, 14),
      new THREE.MeshStandardMaterial({
        color: 0x2f7a4e, roughness: 0.9, metalness: 0.0,
        emissive: 0x102010, emissiveIntensity: 0.15
      })
    );
    leaves.position.set(x, 0.75, z);
    group.add(leaves);
  }
  plant(-roomW/2 + 2.6, tableFocus.z);
  plant(roomW/2 - 2.6, tableFocus.z);

  // ---------- CHAIRS + SEATS (FIXED FACING) ----------
  const seats = [];
  function makeChair(angle, idx) {
    const chair = new THREE.Group();
    chair.name = "Chair_" + idx;

    const r = 2.75;
    chair.position.set(
      tableFocus.x + Math.cos(angle) * r,
      0,
      tableFocus.z + Math.sin(angle) * r
    );

    chair.lookAt(tableFocus.x, 0, tableFocus.z);

    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.10, 0.55),
      new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.65, metalness: 0.1 })
    );
    seat.position.y = 0.48;
    chair.add(seat);

    const back = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.58, 0.10),
      new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.65, metalness: 0.1 })
    );
    back.position.set(0, 0.78, 0.23);
    chair.add(back);

    const anchor = new THREE.Object3D();
    anchor.name = "SeatAnchor";
    anchor.position.set(0, 0.42, -0.10);
    chair.add(anchor);

    group.add(chair);
    seats[idx] = { anchor, yaw: chair.rotation.y };
  }

  const angles = [-0.2, 0.55, 1.35, 2.25, 3.05, 3.85];
  angles.forEach((a, i) => makeChair(a, i + 1));
  function getSeats() { return seats; }

  // ---------- GUARD HUMANOID (kept) ----------
  function makeHumanoid(color = 0x1a1f2a, skin = 0xd2b48c) {
    const g = new THREE.Group();
    const suit = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.12 });
    const skinM = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.65 });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.55, 8, 16), suit);
    torso.position.y = 1.05;
    g.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 14), skinM);
    head.position.y = 1.55;
    g.add(head);

    const armGeo = new THREE.CapsuleGeometry(0.05, 0.30, 8, 12);
    const armL = new THREE.Mesh(armGeo, suit);
    const armR = new THREE.Mesh(armGeo, suit);
    armL.position.set(-0.26, 1.15, 0);
    armR.position.set( 0.26, 1.15, 0);
    g.add(armL, armR);

    const legGeo = new THREE.CapsuleGeometry(0.06, 0.40, 8, 12);
    const legL = new THREE.Mesh(legGeo, suit);
    const legR = new THREE.Mesh(legGeo, suit);
    legL.position.set(-0.10, 0.45, 0);
    legR.position.set( 0.10, 0.45, 0);
    g.add(legL, legR);

    return g;
  }

  const guard = makeHumanoid(0x121826, 0xd2b48c);
  guard.name = "GuardNPC";
  guard.position.set(tableFocus.x, 0, tableFocus.z + 4.9);
  guard.lookAt(tableFocus.x, 1.0, tableFocus.z);
  group.add(guard);

  // ---------- DOORS LEFT/RIGHT ----------
  function makeDoor(signText, x, z, yaw) {
    const door = new THREE.Group();
    door.position.set(x, 0, z);
    door.rotation.y = yaw;

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 3.2, 0.18),
      new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.45, metalness: 0.25 })
    );
    frame.position.set(0, 1.6, 0);
    door.add(frame);

    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(2.0, 3.0),
      new THREE.MeshStandardMaterial({
        map: doorTex,
        transparent: true,
        alphaTest: 0.02,
        roughness: 0.35,
        metalness: 0.1,
        emissive: 0x111111,
        emissiveIntensity: 0.25
      })
    );
    panel.position.set(0, 1.55, 0.10);
    door.add(panel);

    const signCanvas = document.createElement("canvas");
    signCanvas.width = 1024; signCanvas.height = 256;
    const ctx = signCanvas.getContext("2d");
    ctx.clearRect(0,0,1024,256);
    ctx.font = "bold 120px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#7fe7ff";
    ctx.fillText(signText, 512, 130);
    const signTex = new THREE.CanvasTexture(signCanvas);
    signTex.colorSpace = THREE.SRGBColorSpace;

    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 0.65),
      new THREE.MeshStandardMaterial({
        map: signTex, transparent: true, emissive: 0x7fe7ff, emissiveIntensity: 0.65
      })
    );
    sign.position.set(0, 3.25, 0.12);
    door.add(sign);

    const pad = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.52, 48),
      new THREE.MeshStandardMaterial({
        color: 0xff2d7a, emissive: 0xff2d7a, emissiveIntensity: 0.60,
        transparent: true, opacity: 0.85, side: THREE.DoubleSide
      })
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(0, 0.02, 1.25);
    pad.name = signText === "STORE" ? "PadStore" : "PadPoker";
    door.add(pad);

    group.add(door);
    return { door, pad };
  }

  const storeDoor = makeDoor("STORE", -roomW / 2 + 0.25, tableFocus.z, Math.PI / 2);
  makeDoor("POKER",  roomW / 2 - 0.25, tableFocus.z, -Math.PI / 2);

  // ---------- SPAWN PAD ----------
  const spawnPad = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.85, 64),
    new THREE.MeshStandardMaterial({
      color: 0x7fe7ff, emissive: 0x7fe7ff, emissiveIntensity: 0.50,
      transparent: true, opacity: 0.85, side: THREE.DoubleSide
    })
  );
  spawnPad.rotation.x = -Math.PI / 2;
  spawnPad.position.set(0, 0.02, 3.6);
  spawnPad.name = "SpawnPad";
  group.add(spawnPad);

  // ---------- STORE OUTSIDE DISPLAY (4 mannequins + 2 pillars/rail) ----------
  // Place it outside the STORE door side, in front of that wall.
  const displayRoot = new THREE.Group();
  displayRoot.name = "StoreDisplay";

  // anchor near STORE pad world position
  const storeAnchor = new THREE.Vector3(-roomW/2 + 2.9, 0, tableFocus.z + 2.2);
  displayRoot.position.copy(storeAnchor);
  displayRoot.rotation.y = Math.PI / 2; // face into the room
  group.add(displayRoot);

  const dispMat = new THREE.MeshStandardMaterial({
    color: 0x0c1622, roughness: 0.55, metalness: 0.35,
    emissive: 0x06121c, emissiveIntensity: 0.35
  });

  const platform = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.08, 2.0), dispMat);
  platform.position.set(0.0, 0.04, 0.0);
  displayRoot.add(platform);

  function addDisplayPillar(x) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.2, 18), dispMat);
    p.position.set(x, 1.1, -0.1);
    displayRoot.add(p);
    return p;
  }

  const pA = addDisplayPillar(-1.55);
  const pB = addDisplayPillar( 1.55);

  const railBar = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.08, 0.08), dispMat);
  railBar.position.set(0, 1.75, -0.1);
  displayRoot.add(railBar);

  const neon = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 0.05, 0.06),
    new THREE.MeshStandardMaterial({
      color: 0x0a141f,
      emissive: 0x00ffff,
      emissiveIntensity: 2.0,
      roughness: 0.2,
      metalness: 0.4
    })
  );
  neon.position.set(0, 1.92, -0.1);
  displayRoot.add(neon);

  const neonLight = new THREE.PointLight(0x7fe7ff, 0.95, 6.5, 2);
  neonLight.position.set(0, 1.85, -0.2);
  displayRoot.add(neonLight);

  function makeMannequin() {
    const m = new THREE.Group();
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x0d1420, roughness: 0.75, metalness: 0.25 });
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x7fe7ff, emissive: 0x00ffff, emissiveIntensity: 0.55,
      roughness: 0.35, metalness: 0.35
    });

    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.10, 24), baseMat);
    ped.position.y = 0.05;
    m.add(ped);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.46, 8, 18), bodyMat);
    torso.position.y = 0.95;
    m.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 18), bodyMat);
    head.position.y = 1.40;
    m.add(head);

    return m;
  }

  const slots = [
    new THREE.Vector3(-1.25, 0, -0.65),
    new THREE.Vector3( 1.25, 0, -0.65),
    new THREE.Vector3(-1.25, 0,  0.20),
    new THREE.Vector3( 1.25, 0,  0.20),
  ];
  for (const s of slots) {
    const man = makeMannequin();
    man.position.copy(s);
    displayRoot.add(man);
  }

  // ---------- NPC WALKER (one moving bot only) ----------
  const walker = makeHumanoid(0x1a1f2a, 0xd2b48c);
  walker.name = "WalkerNPC";
  walker.position.set(storeAnchor.x + 0.4, 0, storeAnchor.z - 1.8);
  group.add(walker);

  const walkPath = [
    new THREE.Vector3(storeAnchor.x + 0.4, 0, storeAnchor.z - 1.8),
    new THREE.Vector3(storeAnchor.x + 0.4, 0, storeAnchor.z + 1.2),
    new THREE.Vector3(storeAnchor.x + 2.8, 0, storeAnchor.z + 1.2),
    new THREE.Vector3(storeAnchor.x + 2.8, 0, storeAnchor.z - 1.8),
  ];
  let walkIdx = 0;
  let walkT = 0;

  // ---------- BOTS (table bots via bots.js) ----------
  try {
    Bots.init({ THREE, scene, getSeats, tableFocus, metrics: { tableY, seatY: 0.42 } });
  } catch (e) {
    console.error(e);
    log?.("[world] bots init failed ❌ " + (e?.message || e));
  }

  log?.("[world] ready ✅");

  const api = {
    group,
    floor,
    tableFocus,
    tableY,
    spawn: new THREE.Vector3(0, 0, 3.6),
    spawnYaw: 0,
    getSeats,

    connect({ playerRig, camera }) {
      try { Bots.setPlayerRig(playerRig, camera); } catch {}
      api.playerRigRef = playerRig;
      api.cameraRef = camera;
    },

    tick(dt) {
      spawnPad.material.opacity = 0.65 + Math.sin(performance.now() * 0.004) * 0.18;
      railGlow.material.emissiveIntensity = 0.40 + Math.sin(performance.now() * 0.003) * 0.22;

      // Walker patrol
      if (walkPath.length >= 2) {
        const a = walkPath[walkIdx];
        const b = walkPath[(walkIdx + 1) % walkPath.length];
        const dist = Math.max(0.001, a.distanceTo(b));
        walkT += (dt * 0.75) / dist;
        if (walkT >= 1) { walkT = 0; walkIdx = (walkIdx + 1) % walkPath.length; }
        const p = a.clone().lerp(b, walkT);
        walker.position.x = p.x;
        walker.position.z = p.z;

        const dir = b.clone().sub(a);
        walker.rotation.y = Math.atan2(dir.x, dir.z);
      }

      // bots
      try { Bots.update(dt); } catch (e) { console.error(e); }
    }
  };

  return api;
}

/* -------------------- Update 4.0 CyberAvatar export -------------------- */
export class CyberAvatar {
  constructor({ THREE, scene, camera, textureURL = "assets/textures/cyber_suit_atlas.png", log = console.log }) {
    this.THREE = THREE;
    this.scene = scene;
    this.camera = camera;
    this.log = log;

    this.meshGroup = new THREE.Group();
    this.parts = { helmet: null, torso: null, leftHand: null, rightHand: null };
    this._yawOnly = new THREE.Euler(0, 0, 0, "YXZ");
    this._handsEnabled = true;

    // NOTE: your atlas will only look right once we have a UV’d body mesh.
    // For now: emissive cyber material to prove rig works.
    const mat = new THREE.MeshStandardMaterial({
      color: 0x1a2332,
      emissive: 0x00ffff,
      emissiveIntensity: 1.7,
      roughness: 0.25,
      metalness: 0.45,
    });

    this.parts.helmet = new THREE.Mesh(new THREE.SphereGeometry(0.15, 32, 32), mat);

    this.parts.torso = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.75, 0.25), mat);

    const gloveGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.45, 16);
    this.parts.leftHand = new THREE.Mesh(gloveGeo, mat);
    this.parts.rightHand = new THREE.Mesh(gloveGeo, mat);
    this.parts.leftHand.rotation.x = Math.PI / 2;
    this.parts.rightHand.rotation.x = Math.PI / 2;

    this.parts.leftHand.visible = false;
    this.parts.rightHand.visible = false;

    this.meshGroup.add(this.parts.helmet, this.parts.torso, this.parts.leftHand, this.parts.rightHand);
    scene.add(this.meshGroup);

    this.log("[avatar] Update 4.0 CyberAvatar ready ✅");
  }

  setHandsVisible(v) {
    this._handsEnabled = !!v;
    if (!this._handsEnabled) {
      this.parts.leftHand.visible = false;
      this.parts.rightHand.visible = false;
    }
  }

  update(frame, refSpace, camera = this.camera) {
    if (!frame || !refSpace || !camera) return;

    // Helmet follows HMD
    this.parts.helmet.position.copy(camera.position);
    this.parts.helmet.quaternion.copy(camera.quaternion);

    // Torso yaw-lock to head
    this.parts.torso.position.copy(camera.position);
    this.parts.torso.position.y -= 0.55;
    this._yawOnly.setFromQuaternion(camera.quaternion, "YXZ");
    this._yawOnly.x = 0;
    this._yawOnly.z = 0;
    this.parts.torso.quaternion.setFromEuler(this._yawOnly);

    if (!this._handsEnabled) return;

    // Wrist joint tracking (hands-only, no controllers rendered)
    const session = frame.session;
    if (!session?.inputSources) return;

    let leftSeen = false, rightSeen = false;

    for (const src of session.inputSources) {
      if (!src?.hand) continue;
      const wrist = src.hand.get("wrist");
      const pose = frame.getJointPose(wrist, refSpace);
      if (!pose) continue;

      const mesh = (src.handedness === "left") ? this.parts.leftHand : this.parts.rightHand;
      mesh.position.set(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);
      mesh.quaternion.set(
        pose.transform.orientation.x,
        pose.transform.orientation.y,
        pose.transform.orientation.z,
        pose.transform.orientation.w
      );
      mesh.visible = true;

      if (src.handedness === "left") leftSeen = true;
      if (src.handedness === "right") rightSeen = true;
    }

    if (!leftSeen) this.parts.leftHand.visible = false;
    if (!rightSeen) this.parts.rightHand.visible = false;
  }
      }
