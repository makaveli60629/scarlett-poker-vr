// /js/world.js — Scarlett World v1.2 (FULL LOBBY FIXTURES + LEFT/RIGHT DOORS + SOLID ROOM)
// Exports: initWorld({THREE, scene, log, v})
// Includes:
// - big room (solid walls + collision list)
// - floor texture (tile) + wall texture (your JPG path)
// - poker table + chairs + rail ring
// - mannequin guard + store mannequin
// - LEFT wall = STORE door + teleport pad
// - RIGHT wall = POKER door + teleport pad
// - plants + pillars + lounge props
// - seats anchors for bots
//
// IMPORTANT: put these textures in repo paths:
// - Floor: /assets/textures/scarlett_floor_tile_seamless.png  (or your tile)
// - Wall:  /assets/textures/1767279790736.jpg                 (your wall jpg)
// - Doors: /assets/textures/scarlett_door_store.png
//          /assets/textures/scarlett_door_poker.png

import { Bots } from "./bots.js";

export async function initWorld({ THREE, scene, log, v } = {}) {
  const L = (...a)=>{ try{ log?.(...a); } catch { console.log(...a); } };

  const group = new THREE.Group();
  group.name = "WorldRoot";
  scene.add(group);

  const colliders = [];
  const seats = [];

  const tableFocus = new THREE.Vector3(0, 0, -6.5);
  const metrics = { tableY: 0.92, seatY: 0.52 };

  // ---------- TEXTURES ----------
  const texLoader = new THREE.TextureLoader();

  function loadTex(url){
    try {
      const t = texLoader.load(url);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      return t;
    } catch {
      return null;
    }
  }

  const floorTex = loadTex("./assets/textures/scarlett_floor_tile_seamless.png");
  if (floorTex) floorTex.repeat.set(10, 10);

  // user requested wall JPG path
  const wallTex = loadTex("./assets/textures/1767279790736.jpg");
  if (wallTex) wallTex.repeat.set(6, 2);

  const storeDoorTex = loadTex("./assets/textures/scarlett_door_store.png");
  const pokerDoorTex = loadTex("./assets/textures/scarlett_door_poker.png");

  // ---------- LIGHTING ----------
  group.add(new THREE.HemisphereLight(0xffffff, 0x1b2a33, 1.25));

  const key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(8, 14, 6);
  key.castShadow = false;
  group.add(key);

  const glowA = new THREE.PointLight(0x7fe7ff, 1.2, 18, 2.0);
  glowA.position.set(-6, 3.4, -6);
  group.add(glowA);

  const glowB = new THREE.PointLight(0xff2d7a, 1.1, 18, 2.0);
  glowB.position.set(6, 3.4, -6);
  group.add(glowB);

  // ---------- ROOM (TWICE AS BIG) ----------
  const ROOM_W = 34;
  const ROOM_D = 34;
  const ROOM_H = 8;

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_W, ROOM_D),
    new THREE.MeshStandardMaterial({
      map: floorTex || null,
      color: floorTex ? 0xffffff : 0x555555,
      roughness: 0.95,
      metalness: 0.0
    })
  );
  floor.name = "Floor";
  floor.rotation.x = -Math.PI/2;
  floor.position.y = 0;
  group.add(floor);
  colliders.push(floor);

  const wallMat = new THREE.MeshStandardMaterial({
    map: wallTex || null,
    color: wallTex ? 0xffffff : 0x2a2f3a,
    roughness: 0.95,
    metalness: 0.0
  });

  function makeWall(w, h, pos, rotY){
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
    m.position.copy(pos);
    m.rotation.y = rotY;
    m.name = "Wall";
    group.add(m);
    // collider as invisible box
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, 0.3),
      new THREE.MeshBasicMaterial({ visible:false })
    );
    box.position.copy(pos);
    box.rotation.y = rotY;
    group.add(box);
    colliders.push(box);
    return m;
  }

  // walls (centered)
  makeWall(ROOM_W, ROOM_H, new THREE.Vector3(0, ROOM_H/2, -ROOM_D/2), 0);
  makeWall(ROOM_W, ROOM_H, new THREE.Vector3(0, ROOM_H/2,  ROOM_D/2), Math.PI);
  makeWall(ROOM_D, ROOM_H, new THREE.Vector3(-ROOM_W/2, ROOM_H/2, 0), Math.PI/2);
  makeWall(ROOM_D, ROOM_H, new THREE.Vector3( ROOM_W/2, ROOM_H/2, 0), -Math.PI/2);

  // ---------- TABLE ----------
  const tableTopY = metrics.tableY;

  const table = new THREE.Group();
  table.name = "PokerTable";
  table.position.set(tableFocus.x, tableTopY, tableFocus.z);
  group.add(table);

  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(1.45, 1.55, 0.16, 48),
    new THREE.MeshStandardMaterial({ color: 0x0f3b2a, roughness: 0.85 })
  );
  top.position.y = 0;
  table.add(top);

  // stand
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.32, 0.9, 22),
    new THREE.MeshStandardMaterial({ color: 0x151822, roughness: 0.8 })
  );
  stem.position.y = -0.55;
  table.add(stem);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 1.05, 0.18, 28),
    new THREE.MeshStandardMaterial({ color: 0x10131a, roughness: 0.9 })
  );
  base.position.y = -1.05;
  table.add(base);

  // table collider
  const tableCol = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.6, 1.3, 24),
    new THREE.MeshBasicMaterial({ visible:false })
  );
  tableCol.position.copy(table.position).add(new THREE.Vector3(0, -0.4, 0));
  group.add(tableCol);
  colliders.push(tableCol);

  // ---------- RAIL RING (SOLID) ----------
  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(3.85, 0.08, 10, 64),
    new THREE.MeshStandardMaterial({
      color: 0x10131a,
      emissive: 0x220010,
      emissiveIntensity: 0.25,
      roughness: 0.6
    })
  );
  rail.rotation.x = Math.PI/2;
  rail.position.set(tableFocus.x, 0.95, tableFocus.z);
  group.add(rail);

  const railCol = new THREE.Mesh(
    new THREE.TorusGeometry(3.85, 0.22, 10, 32),
    new THREE.MeshBasicMaterial({ visible:false })
  );
  railCol.rotation.x = Math.PI/2;
  railCol.position.copy(rail.position);
  group.add(railCol);
  colliders.push(railCol);

  // ---------- CHAIRS + SEATS ----------
  function makeChair(angle, i) {
    const c = new THREE.Group();
    c.name = "Chair_" + i;

    const r = 2.6;
    const x = tableFocus.x + Math.cos(angle) * r;
    const z = tableFocus.z + Math.sin(angle) * r;

    c.position.set(x, 0, z);
    c.rotation.y = -angle + Math.PI/2;

    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.10, 0.55),
      new THREE.MeshStandardMaterial({ color: 0x1a1f2a, roughness: 0.85 })
    );
    seat.position.y = metrics.seatY;
    c.add(seat);

    const back = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.60, 0.10),
      new THREE.MeshStandardMaterial({ color: 0x171b24, roughness: 0.9 })
    );
    back.position.set(0, metrics.seatY + 0.32, -0.24);
    c.add(back);

    // seat anchor (for Bots)
    const anchor = new THREE.Object3D();
    anchor.name = "SeatAnchor_" + i;
    anchor.position.set(0, metrics.seatY + 0.02, 0.08);
    c.add(anchor);

    // collider
    const col = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.0, 0.7),
      new THREE.MeshBasicMaterial({ visible:false })
    );
    col.position.set(0, 0.5, 0);
    c.add(col);
    colliders.push(col);

    group.add(c);

    seats.push({ index:i, anchor, yaw: c.rotation.y });
    return c;
  }

  // 6-max chairs + one extra “player” chair near you
  for (let i=0;i<6;i++){
    const a = (i/6)*Math.PI*2 + Math.PI/6;
    makeChair(a, i);
  }

  // extra join chair (slightly outside rail)
  makeChair(Math.PI/2, 7);

  function getSeats(){ return seats; }

  // ---------- MANNEQUINS (GUARD + STORE) ----------
  function makeMannequin(color=0x222833) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.55, 8, 16), mat);
    body.position.y = 1.0;
    g.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 14), mat);
    head.position.y = 1.55;
    g.add(head);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.20,0.24,0.06,18), mat);
    base.position.y = 0.03;
    g.add(base);

    return g;
  }

  const guard = makeMannequin(0x1b2130);
  guard.position.set(tableFocus.x - 3.2, 0, tableFocus.z - 0.8);
  guard.name = "RailGuard";
  group.add(guard);

  // ---------- DECOR (PILLARS + PLANTS + LOUNGE) ----------
  function makePillar(x,z) {
    const p = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.45, 5.8, 22),
      new THREE.MeshStandardMaterial({ color: 0x121622, roughness: 0.95 })
    );
    p.position.set(x, 2.9, z);
    group.add(p);
    colliders.push(new THREE.Mesh(
      new THREE.CylinderGeometry(0.55,0.55,6.0,16),
      new THREE.MeshBasicMaterial({ visible:false })
    ));
    const last = group.children[group.children.length-1];
    last.position.copy(p.position);
    group.add(last);
    colliders.push(last);
  }

  makePillar(-10, -10);
  makePillar( 10, -10);
  makePillar(-10,  10);
  makePillar( 10,  10);

  function makePlant(x,z) {
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.26, 0.28, 18),
      new THREE.MeshStandardMaterial({ color: 0x2a2f3a, roughness: 0.9 })
    );
    pot.position.set(x, 0.14, z);
    group.add(pot);

    const leaves = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 18, 14),
      new THREE.MeshStandardMaterial({ color: 0x1e6b44, roughness: 0.9 })
    );
    leaves.position.set(x, 0.75, z);
    group.add(leaves);

    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45,0.45,1.8,12),
      new THREE.MeshBasicMaterial({ visible:false })
    );
    col.position.set(x, 0.9, z);
    group.add(col);
    colliders.push(col);
  }

  makePlant(-14, -6);
  makePlant( 14, -6);
  makePlant(-14,  6);
  makePlant( 14,  6);

  // ---------- DOORS LEFT/RIGHT WALLS ----------
  function makeDoorway({ tex, x, z, label }) {
    const doorGroup = new THREE.Group();
    doorGroup.name = label + "_Doorway";

    // arch frame
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 4.6, 0.22),
      new THREE.MeshStandardMaterial({
        color: 0x10131a,
        emissive: 0x220010,
        emissiveIntensity: 0.15,
        roughness: 0.7
      })
    );
    frame.position.set(x, 2.3, z);
    frame.rotation.y = (x < 0) ? Math.PI/2 : -Math.PI/2;
    group.add(frame);
    colliders.push(frame);

    // door plane (alpha)
    const mat = new THREE.MeshBasicMaterial({
      map: tex || null,
      transparent: true,
      opacity: 1,
      depthWrite: false
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 4.0), mat);
    plane.position.set(x + (x < 0 ? 0.13 : -0.13), 2.1, z);
    plane.rotation.y = (x < 0) ? Math.PI/2 : -Math.PI/2;
    plane.renderOrder = 60;
    group.add(plane);

    // teleport pad in front
    const pad = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.62, 48),
      new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent:true, opacity:0.75, side:THREE.DoubleSide })
    );
    pad.rotation.x = -Math.PI/2;
    pad.position.set(x + (x < 0 ? 1.2 : -1.2), 0.03, z);
    pad.name = label + "_TeleportPad";
    group.add(pad);

    // pad collider (for future “step-to-activate”)
    const padCol = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.75, 0.2, 18),
      new THREE.MeshBasicMaterial({ visible:false })
    );
    padCol.position.set(pad.position.x, 0.1, pad.position.z);
    padCol.name = pad.name + "_COL";
    group.add(padCol);
    colliders.push(padCol);

    return { pad, frame, plane };
  }

  // place them on LEFT and RIGHT walls near middle
  const storeDoor = makeDoorway({ tex: storeDoorTex, x: -ROOM_W/2 + 0.2, z: 0, label: "STORE" });
  const pokerDoor = makeDoorway({ tex: pokerDoorTex, x:  ROOM_W/2 - 0.2, z: 0, label: "POKER" });

  // mannequin by store entrance (per request)
  const storeMan = makeMannequin(0x222a3a);
  storeMan.position.set(storeDoor.pad.position.x + 1.2, 0, storeDoor.pad.position.z - 1.1);
  storeMan.name = "StoreMannequin";
  group.add(storeMan);

  // ---------- BOTS ----------
  try {
    Bots.init({ THREE, scene, getSeats, tableFocus, metrics });
  } catch (e) {
    console.error(e);
    L("[world] Bots init failed ❌");
  }

  // ---------- API ----------
  function connect({ playerRig, camera } = {}) {
    try {
      Bots.setPlayerRig(playerRig, camera);
    } catch {}
  }

  function tick(dt) {
    try { Bots.update(dt); } catch {}
    // glow pulse on pads
    const t = performance.now() * 0.001;
    if (storeDoor?.pad?.material) storeDoor.pad.material.opacity = 0.55 + Math.sin(t*3.0)*0.18;
    if (pokerDoor?.pad?.material) pokerDoor.pad.material.opacity = 0.55 + Math.sin((t+0.7)*3.0)*0.18;
  }

  // simple “action”: later we’ll raycast / step-on pads
  function onAction({ player, camera } = {}) {
    L("[world] action (stub) ✅");
  }

  L("[world] ready ✅");

  return {
    group,
    floor,
    colliders,
    tableFocus,
    tableTopY,
    metrics,
    getSeats,
    connect,
    tick,
    onAction
  };
      }
