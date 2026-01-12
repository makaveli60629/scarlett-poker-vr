// /js/world.js — Scarlett MASTER WORLD (FULL: Lobby + 4 Rooms + Halls + Divot + Jumbotrons)
// ✅ No dependencies. Safe on GitHub Pages.
// ✅ Always builds something visible.
// ✅ Logs build steps.

export const World = (() => {
  const S = {
    THREE: null,
    scene: null,
    renderer: null,
    camera: null,
    player: null,
    controllers: null,
    log: console.log,
    root: null,
    t: 0,
    colliders: []
  };

  const log = (m) => S.log?.(m);

  function add(obj, collider = false) {
    S.root.add(obj);
    if (collider) S.colliders.push(obj);
    return obj;
  }

  function mat(color, rough = 1, metal = 0) {
    return new S.THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
  }

  function buildLights() {
    const { THREE } = S;

    add(new THREE.HemisphereLight(0xeef2ff, 0x12131a, 1.15));

    const key = new THREE.DirectionalLight(0xffffff, 1.0);
    key.position.set(10, 14, 6);
    add(key);

    const fill = new THREE.DirectionalLight(0xaad5ff, 0.45);
    fill.position.set(-10, 8, -12);
    add(fill);

    log("[world] lights ✅");
  }

  function buildFloorAndSky() {
    const { THREE } = S;

    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(260, 32, 16),
      new THREE.MeshBasicMaterial({ color: 0x05060a, side: THREE.BackSide })
    );
    add(sky);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(60, 96),
      mat(0x171926, 1, 0)
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    add(floor, true);

    log("[world] floor ✅");
  }

  function buildLobbyRing() {
    const { THREE } = S;

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(10, 18, 96),
      mat(0x0f1120, 0.9, 0.05)
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    add(ring, true);

    const trim1 = new THREE.Mesh(
      new THREE.RingGeometry(9.7, 10.0, 96),
      mat(0x1b1e33, 0.7, 0.2)
    );
    trim1.rotation.x = -Math.PI / 2;
    trim1.position.y = 0.015;
    add(trim1);

    const trim2 = new THREE.Mesh(
      new THREE.RingGeometry(18.0, 18.3, 96),
      mat(0x1b1e33, 0.7, 0.2)
    );
    trim2.rotation.x = -Math.PI / 2;
    trim2.position.y = 0.015;
    add(trim2);

    log("[world] lobby ring ✅");
  }

  function buildCenterDivotAndTable() {
    const { THREE } = S;

    const rimY = 0.05;
    const pitY = -0.55;
    const pitRadius = 6.2;
    const rimInner = 6.2;
    const rimOuter = 8.8;

    const rim = new THREE.Mesh(
      new THREE.RingGeometry(rimInner, rimOuter, 96),
      mat(0x0b0d14, 0.85, 0.15)
    );
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = rimY;
    add(rim, true);

    const slope = new THREE.Mesh(
      new THREE.RingGeometry(pitRadius, rimInner, 96),
      mat(0x131629, 1, 0.05)
    );
    slope.rotation.x = -Math.PI / 2;
    slope.position.y = (rimY + pitY) * 0.5;
    add(slope, true);

    const pit = new THREE.Mesh(
      new THREE.CircleGeometry(pitRadius, 96),
      mat(0x0a0c18, 1, 0)
    );
    pit.rotation.x = -Math.PI / 2;
    pit.position.y = pitY;
    add(pit, true);

    const tableTop = new THREE.Mesh(
      new THREE.CylinderGeometry(2.8, 3.0, 0.25, 40),
      mat(0x0f5a3a, 0.9, 0.05)
    );
    tableTop.position.set(0, pitY + 0.65, 0);
    add(tableTop, true);

    const tableBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.85, 0.9, 20),
      mat(0x11131b, 0.8, 0.2)
    );
    tableBase.position.set(0, pitY + 0.15, 0);
    add(tableBase);

    const railRadius = 8.4;
    const railCount = 24;

    for (let i = 0; i < railCount; i++) {
      const a = (i / railCount) * Math.PI * 2;
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 1.0, 10),
        mat(0x1f2440, 0.7, 0.2)
      );
      post.position.set(Math.cos(a) * railRadius, pitY + 0.75, Math.sin(a) * railRadius);
      add(post);
    }

    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(railRadius, 0.06, 10, 120),
      mat(0x2a2f52, 0.5, 0.35)
    );
    rail.rotation.x = Math.PI / 2;
    rail.position.y = pitY + 1.2;
    add(rail);

    log("[world] center divot + table ✅");
  }

  function buildFourRoomsAndHalls() {
    const { THREE } = S;

    const roomDist = 30;
    const roomSize = { w: 18, h: 7, d: 18 };
    const hall = { w: 6, h: 4, len: roomDist - 18 };

    const makeRoom = (name, x, z, color) => {
      const g = new THREE.Group();
      g.name = name;
      g.position.set(x, 0, z);

      const floor = new THREE.Mesh(
        new THREE.BoxGeometry(roomSize.w, 0.3, roomSize.d),
        mat(color, 1, 0.05)
      );
      floor.position.y = 0.15;
      g.add(floor);

      const walls = new THREE.Mesh(
        new THREE.BoxGeometry(roomSize.w, roomSize.h, roomSize.d),
        new THREE.MeshStandardMaterial({
          color: 0x0b0d14, roughness: 1, metalness: 0,
          transparent: true, opacity: 0.22
        })
      );
      walls.position.y = roomSize.h / 2;
      g.add(walls);

      add(g, true);
      return g;
    };

    const makeHall = (name, x, z, rotY) => {
      const g = new THREE.Group();
      g.name = name;
      g.position.set(x, 0, z);
      g.rotation.y = rotY;

      const tube = new THREE.Mesh(
        new THREE.BoxGeometry(hall.w, hall.h, hall.len),
        new THREE.MeshStandardMaterial({
          color: 0x0a0c18, roughness: 1, metalness: 0.05,
          transparent: true, opacity: 0.25
        })
      );
      tube.position.y = hall.h / 2;
      tube.position.z = -hall.len / 2;
      g.add(tube);

      const floor = new THREE.Mesh(
        new THREE.BoxGeometry(hall.w, 0.25, hall.len),
        mat(0x14172a, 1, 0.05)
      );
      floor.position.y = 0.125;
      floor.position.z = -hall.len / 2;
      g.add(floor);

      add(g, true);
      return g;
    };

    makeRoom("Room_North", 0, -roomDist, 0x141b33);
    makeRoom("Room_South", 0, roomDist, 0x141b33);
    makeRoom("Room_East", roomDist, 0, 0x141b33);
    makeRoom("Room_West", -roomDist, 0, 0x141b33);

    makeHall("Hall_North", 0, -18.3, 0);
    makeHall("Hall_South", 0, 18.3, Math.PI);
    makeHall("Hall_East", 18.3, 0, -Math.PI / 2);
    makeHall("Hall_West", -18.3, 0, Math.PI / 2);

    log("[world] 4 rooms + halls ✅");
  }

  function buildJumbotrons() {
    const { THREE } = S;

    const makeScreen = (x, y, z, rotY) => {
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(10, 5.5, 0.35),
        mat(0x10142a, 0.7, 0.2)
      );
      frame.position.set(x, y, z);
      frame.rotation.y = rotY;
      add(frame);

      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(9.2, 4.7),
        new THREE.MeshStandardMaterial({
          color: 0x0b1026,
          emissive: new THREE.Color(0x1b2cff),
          emissiveIntensity: 0.6,
          roughness: 0.8,
          metalness: 0.1
        })
      );
      const dz = 0.19;
      if (rotY === 0) screen.position.set(x, y, z + dz);
      else if (rotY === Math.PI) screen.position.set(x, y, z - dz);
      else if (rotY === -Math.PI / 2) screen.position.set(x + dz, y, z);
      else screen.position.set(x - dz, y, z);

      screen.rotation.y = rotY;
      add(screen);
    };

    makeScreen(0, 4.2, -12.5, 0);
    makeScreen(0, 4.2, 12.5, Math.PI);
    makeScreen(12.5, 4.2, 0, -Math.PI / 2);
    makeScreen(-12.5, 4.2, 0, Math.PI / 2);

    log("[world] jumbotrons ✅");
  }

  async function init({ THREE, scene, renderer, camera, player, controllers, log: logFn }) {
    S.THREE = THREE;
    S.scene = scene;
    S.renderer = renderer;
    S.camera = camera;
    S.player = player;
    S.controllers = controllers;
    S.log = logFn || console.log;

    S.root = new THREE.Group();
    S.root.name = "WorldRoot";
    scene.add(S.root);

    log("[world] init …");

    buildLights();
    buildFloorAndSky();
    buildLobbyRing();
    buildCenterDivotAndTable();
    buildFourRoomsAndHalls();
    buildJumbotrons();

    if (player) {
      player.position.y = 0;
      player.position.x = 0;
      player.position.z = 8.5;
    }

    log("[world] build complete ✅ (MASTER)");
  }

  function update(dt) {
    S.t += dt;
    // (kept light intentionally)
  }

  return { init, update, get colliders() { return S.colliders; } };
})();
