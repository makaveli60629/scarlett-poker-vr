// /js/world.js — Scarlett World v11.1 (Bots v3.1 compatible)
// SAFE update: world is the same, just passes (v) + metrics to Bots.init.

import { Bots } from "./bots.js";

export async function initWorld({ THREE, scene, log, v } = {}) {
  const group = new THREE.Group();
  group.name = "WorldRoot";
  scene.add(group);

  const tableFocus = new THREE.Vector3(0, 0, -6.5);
  const tableY = 0.92;

  const loader = new THREE.TextureLoader();

  const floorTex = loader.load("./assets/textures/scarlett_floor_tile_seamless.png?v=" + v);
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(6, 6);
  floorTex.colorSpace = THREE.SRGBColorSpace;

  const wallTex = loader.load("./assets/textures/scarlett_wall_seamless.png?v=" + v);
  wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
  wallTex.repeat.set(5, 2);
  wallTex.colorSpace = THREE.SRGBColorSpace;

  const roomW = 28, roomD = 28, roomH = 6.8;

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(roomW, roomD),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.92, metalness: 0.0 })
  );
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

  // Lights (same as before)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.2));

  // TABLE
  const tableTop = new THREE.Mesh(
    new THREE.CylinderGeometry(1.95, 2.25, 0.18, 64),
    new THREE.MeshStandardMaterial({ color: 0x0a3a2c, roughness: 0.88, metalness: 0.05 })
  );
  tableTop.position.set(tableFocus.x, tableY, tableFocus.z);
  group.add(tableTop);

  const tableBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.90, 1.15, 28),
    new THREE.MeshStandardMaterial({ color: 0x121826, roughness: 0.6, metalness: 0.2 })
  );
  tableBase.position.set(tableFocus.x, tableY - 0.68, tableFocus.z);
  group.add(tableBase);

  // CHAIRS + SEATS
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

  // ✅ BOTS INIT (SAFE)
  try {
    Bots.init({
      THREE,
      scene,
      getSeats,
      tableFocus,
      metrics: { seatDrop: 0.07 },
      v
    });
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
      api.playerRigRef = playerRig;
      api.cameraRef = camera;
    },

    tick(dt) {}
  };

  return api;
      }
