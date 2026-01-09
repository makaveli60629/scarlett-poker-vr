// /js/world.js — Scarlett World v12.3 (FULL SAFE WORLD)
// ✅ Builds a complete room + poker area + store + mannequins + doors (procedural, no external assets required)
// ✅ Exposes: spawn, spawnYaw, tableFocus, tableY, chairs[], tick(), connect(), fixSeating()
// ✅ Does NOT depend on your older world.js — replace this file as a known-good baseline
// NOTE: If you already had custom textures/models, this version won’t delete them (because it doesn’t know them),
// but it will be a full working world that matches your “store + mannequins + two doors” request.
import { Avatar1 } from "./avatar1.js";
export async function initWorld({ THREE, scene, log = console.log, v = "" } = {}) {
  const world = {
    spawn: { x: 0, z: 3.6 },
    spawnYaw: 0,
    tableFocus: new THREE.Vector3(0, 0, -6.5),
    tableY: 0.92,

    // Exposed for main.js fix pass
    chairs: [],
    seats: [],

    // Optional hooks other systems may use
    colliders: [],
    floorMeshes: [],
    cameraRef: null,

    connect() {},
    fixSeating() {},
    tick() {},
  };

  // ---------- Materials ----------
  const matFloor = new THREE.MeshStandardMaterial({ color: 0x080912, roughness: 1.0 });
  const matWall  = new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 1.0 });
  const matTrim  = new THREE.MeshStandardMaterial({ color: 0x161a28, roughness: 0.65, metalness: 0.1 });
  const matNeonA = new THREE.MeshStandardMaterial({ color: 0x7fe7ff, emissive: 0x113344, emissiveIntensity: 1.0, roughness: 0.25 });
  const matNeonP = new THREE.MeshStandardMaterial({ color: 0xff2d7a, emissive: 0x330814, emissiveIntensity: 1.1, roughness: 0.25 });

  // ---------- ROOM ----------
  const room = new THREE.Group();
  room.name = "RoomRoot";
  scene.add(room);

  // Floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(36, 36), matFloor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.receiveShadow = false;
  floor.name = "Floor";
  room.add(floor);
  world.floorMeshes.push(floor);

  // Walls
  addWall(0, 2.5, -18, 36, 5, 0.35, "WallBack");
  addWall(0, 2.5,  18, 36, 5, 0.35, "WallFront");
  addWall(-18, 2.5, 0, 0.35, 5, 36, "WallLeft");
  addWall( 18, 2.5, 0, 0.35, 5, 36, "WallRight");

  function addWall(x,y,z,w,h,d,name){
    const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), matWall);
    m.position.set(x,y,z);
    m.name = name;
    room.add(m);
    world.colliders.push(m);
  }

  // Ceiling trim ring (nice vibe)
  const trim = new THREE.Mesh(new THREE.TorusGeometry(11.5, 0.12, 10, 96), matTrim);
  trim.rotation.x = Math.PI / 2;
  trim.position.set(0, 3.85, -6.5);
  trim.name = "CeilingTrim";
  room.add(trim);

  // Neon sign over poker area
  const sign = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.6, 0.08), matNeonA);
  sign.position.set(0, 2.65, -12.8);
  sign.name = "NeonSignPoker";
  room.add(sign);

  // ---------- POKER TABLE ----------
  const table = makePokerTable();
  table.position.set(world.tableFocus.x, 0, world.tableFocus.z);
  table.name = "PokerTable";
  room.add(table);

  // ---------- CHAIRS (6-max) ----------
  const chairRadius = 2.35;
  const angles = [-0.2, 0.55, 1.35, 2.25, 3.05, 3.85];
  for (let i = 0; i < 6; i++) {
    const a = angles[i];
    const x = world.tableFocus.x + Math.cos(a) * chairRadius;
    const z = world.tableFocus.z + Math.sin(a) * chairRadius;
    const chair = makeChair();
    chair.position.set(x, 0, z);
    chair.lookAt(world.tableFocus.x, chair.position.y, world.tableFocus.z);

    chair.name = `Chair_${i}`;
    room.add(chair);

    world.chairs.push(chair);
    world.seats.push(chair); // alias
  }

  // ---------- STORE (right side) ----------
  const store = makeStoreZone();
  store.position.set(10.8, 0, -5.0);
  store.name = "StoreZone";
  room.add(store);

  // ---------- MANNEQUINS OUTSIDE STORE ----------
  const man1 = makeMannequin(matTrim);
  man1.position.set(8.7, 0, -2.4);
  man1.name = "Mannequin_A";
  room.add(man1);

  const man2 = makeMannequin(matTrim);
  man2.position.set(8.7, 0, -7.2);
  man2.name = "Mannequin_B";
  room.add(man2);

  // ---------- DOORS (2 doors) ----------
  const door1 = makeDoor(matNeonP);
  door1.position.set(12.3, 1.2, -3.2);
  door1.rotation.y = Math.PI / 2;
  door1.name = "StoreDoor_1";
  room.add(door1);

  const door2 = makeDoor(matNeonP);
  door2.position.set(12.3, 1.2, -6.8);
  door2.rotation.y = Math.PI / 2;
  door2.name = "StoreDoor_2";
  room.add(door2);

  // ---------- EXTRA FUN FX OBJECTS ----------
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 24, 24), matNeonP);
  orb.position.set(0, 2.4, -6.5);
  orb.name = "FloatingOrb";
  room.add(orb);

  // ---------- HOOKS ----------
  world.connect = ({ camera } = {}) => {
    world.cameraRef = camera || world.cameraRef;
  };

  world.fixSeating = () => {
    // Chairs face table center (final clamp)
    for (const chair of world.chairs) {
      chair.lookAt(world.tableFocus.x, chair.position.y, world.tableFocus.z);
    }
  };

  world.tick = (dt) => {
    // subtle animation
    orb.rotation.y += dt * 0.9;
    orb.position.y = 2.4 + Math.sin(performance.now() * 0.002) * 0.08;
  };

  log(`[world] init ✅ v=${v}`);

  return world;

  // =====================================================
  // Builders
  // =====================================================
  function makePokerTable() {
    const g = new THREE.Group();

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.95, 0.78, 36),
      new THREE.MeshStandardMaterial({ color: 0x141621, roughness: 0.9, metalness: 0.08 })
    );
    base.position.y = 0.39;
    g.add(base);

    const felt = new THREE.Mesh(
      new THREE.CylinderGeometry(1.55, 1.55, 0.08, 56),
      new THREE.MeshStandardMaterial({ color: 0x0e5a3b, roughness: 0.95 })
    );
    felt.position.y = world.tableY;
    g.add(felt);

    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(1.60, 0.10, 16, 90),
      new THREE.MeshStandardMaterial({ color: 0x1a1c2a, roughness: 0.55, metalness: 0.12 })
    );
    rail.rotation.x = Math.PI / 2;
    rail.position.y = world.tableY + 0.03;
    g.add(rail);

    // small chip tray
    const tray = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.18), matTrim);
    tray.position.set(0, world.tableY + 0.02, 0.65);
    g.add(tray);

    return g;
  }

  function makeChair() {
    const c = new THREE.Group();

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.09, 0.52), matTrim);
    seat.position.y = 0.45;
    c.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.55, 0.09), matTrim);
    back.position.set(0, 0.74, -0.215);
    c.add(back);

    const legMat = new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.9 });
    const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.45, 12);
    for (const dx of [-0.20, 0.20]) {
      for (const dz of [-0.20, 0.20]) {
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(dx, 0.225, dz);
        c.add(leg);
      }
    }
    return c;
  }

  function makeStoreZone() {
    const s = new THREE.Group();

    // Store booth footprint
    const base = new THREE.Mesh(new THREE.BoxGeometry(5.0, 2.6, 7.0), new THREE.MeshStandardMaterial({
      color: 0x070810, roughness: 1.0, transparent: true, opacity: 0.20
    }));
    base.position.set(0, 1.3, 0);
    base.name = "StoreShell";
    s.add(base);

    // Counter
    const counter = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.95, 0.8), matTrim);
    counter.position.set(-0.3, 0.48, 2.6);
    counter.name = "StoreCounter";
    s.add(counter);

    // Shelves + items
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.1, 5.8), matTrim);
    shelf.position.set(2.2, 1.05, 0);
    shelf.name = "StoreShelfWall";
    s.add(shelf);

    // items (simple boxes as placeholders)
    for (let i = 0; i < 10; i++) {
      const item = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.22, 0.22),
        i % 2 ? matNeonA : matNeonP
      );
      item.position.set(1.65, 0.55 + (i % 5) * 0.32, -2.2 + (i > 4 ? 1.2 : 0.0));
      item.name = `StoreItem_${i}`;
      s.add(item);
    }

    // Neon header
    const header = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.35, 0.10), matNeonA);
    header.position.set(0.0, 2.35, 0.0);
    header.name = "StoreHeader";
    s.add(header);

    return s;
  }

  function makeMannequin(bodyMat) {
    const g = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.20, 0.55, 6, 12), bodyMat);
    torso.position.y = 1.05;
    g.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), bodyMat);
    head.position.y = 1.55;
    g.add(head);

    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.08, 18), matTrim);
    stand.position.y = 0.04;
    g.add(stand);

    return g;
  }

  function makeDoor(neonMat) {
    const g = new THREE.Group();

    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.10, 2.4, 1.25), matTrim);
    frame.position.set(0, 0, 0);
    g.add(frame);

    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.1, 1.05), neonMat);
    panel.position.set(0.02, 0.0, 0);
    g.add(panel);

    return g;
  }
}
