// /js/world.js — Scarlett VR Poker World (CDN-safe)
// Provides: room, walls, table, rail collision, 8 seats, simple zones & APIs.

export const World = {
  init({ THREE, scene, renderer, camera, player, controllers, log }) {
    const W = {
      THREE, scene, renderer, camera, player, controllers, log,
      colliders: [],
      _playerYaw: Math.PI,
      mode: "lobby",
      seatedIndex: -1,
      flags: { teleport: true, move: true, snap: true, hands: true },
      seats: [],
      zones: {
        tableCenter: new THREE.Vector3(0, 0, 0),
        tableRadius: 4.2,
      },
    };

    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    function addColliderBox(pos, size, name = "collider") {
      const geo = new THREE.BoxGeometry(size.sx, size.sy, size.sz);
      const mat = new THREE.MeshBasicMaterial({ visible: false });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = name;
      mesh.position.set(pos.x, pos.y, pos.z);
      scene.add(mesh);
      W.colliders.push(mesh);
      return mesh;
    }

    function addRingMarker(pos, r0, r1, color) {
      const g = new THREE.RingGeometry(r0, r1, 64);
      const m = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(g, m);
      ring.rotation.x = -Math.PI / 2;
      ring.position.copy(pos);
      ring.position.y = 0.02;
      scene.add(ring);
      return ring;
    }

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));

    const key = new THREE.DirectionalLight(0xffffff, 1.25);
    key.position.set(6, 10, 6);
    scene.add(key);

    const neon = new THREE.PointLight(0x7fe7ff, 2.0, 20, 2.0);
    neon.position.set(0, 4.0, 0);
    scene.add(neon);

    const pink = new THREE.PointLight(0xff2d7a, 1.6, 18, 2.0);
    pink.position.set(-5, 3.2, -3);
    scene.add(pink);

    // Floor
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x111421, roughness: 0.95, metalness: 0.05 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Walls (visible)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a1f33, roughness: 0.9, metalness: 0.05 });

    const wallN = new THREE.Mesh(new THREE.BoxGeometry(60, 4.4, 1), wallMat);
    wallN.position.set(0, 2.2, -15);
    scene.add(wallN);

    const wallS = new THREE.Mesh(new THREE.BoxGeometry(60, 4.4, 1), wallMat);
    wallS.position.set(0, 2.2, 15);
    scene.add(wallS);

    const wallW = new THREE.Mesh(new THREE.BoxGeometry(1, 4.4, 60), wallMat);
    wallW.position.set(-15, 2.2, 0);
    scene.add(wallW);

    const wallE = new THREE.Mesh(new THREE.BoxGeometry(1, 4.4, 60), wallMat);
    wallE.position.set(15, 2.2, 0);
    scene.add(wallE);

    // Wall colliders
    addColliderBox({ x: 0, y: 2.2, z: -15 }, { sx: 60, sy: 4.4, sz: 1 }, "col_wall_n");
    addColliderBox({ x: 0, y: 2.2, z: 15 }, { sx: 60, sy: 4.4, sz: 1 }, "col_wall_s");
    addColliderBox({ x: -15, y: 2.2, z: 0 }, { sx: 1, sy: 4.4, sz: 60 }, "col_wall_w");
    addColliderBox({ x: 15, y: 2.2, z: 0 }, { sx: 1, sy: 4.4, sz: 60 }, "col_wall_e");

    // Table
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x0b3a2a,
      roughness: 0.8,
      metalness: 0.05,
      emissive: 0x02160f,
      emissiveIntensity: 0.45,
    });

    const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.22, 64), tableMat);
    tableTop.position.set(0, 1.02, 0);
    scene.add(tableTop);

    const tableBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 1.05, 0.9, 32),
      new THREE.MeshStandardMaterial({ color: 0x12131a, roughness: 0.65, metalness: 0.25 })
    );
    tableBase.position.set(0, 0.45, 0);
    scene.add(tableBase);

    // Rail (visual)
    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(2.65, 0.14, 24, 80),
      new THREE.MeshStandardMaterial({ color: 0x161a2a, roughness: 0.7, metalness: 0.2 })
    );
    rail.rotation.x = Math.PI / 2;
    rail.position.set(0, 1.0, 0);
    scene.add(rail);

    // Rail collision (12 boxes)
    const ringY = 1.0;
    const ringR = 2.65;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const x = Math.cos(a) * ringR;
      const z = Math.sin(a) * ringR;
      const box = addColliderBox({ x, y: ringY, z }, { sx: 1.2, sy: 1.4, sz: 0.25 }, "col_rail");
      box.rotation.y = a;
      box.updateMatrixWorld(true);
    }

    // Seats (8)
    const seatRadius = 3.35;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI;
      const px = Math.cos(a) * seatRadius;
      const pz = Math.sin(a) * seatRadius;

      // Seat marker
      const mark = addRingMarker(new THREE.Vector3(px, 0, pz), 0.12, 0.19, 0xffcc00);
      mark.material.opacity = 0.55;

      W.seats.push({
        index: i,
        position: new THREE.Vector3(px, 0, pz),
        yaw: a + Math.PI,
      });
    }

    // API
    W.setMode = (m) => { W.mode = m; };

    W.setFlag = (k, v) => { if (k in W.flags) W.flags[k] = !!v; };

    W.getPlayerYaw = () => W._playerYaw;

    W.addPlayerYaw = (delta) => {
      W._playerYaw += delta;
      player.rotation.y = W._playerYaw;
    };

    W.resolvePlayerCollision = (fromPos, toPos) => {
      const radius = 0.28;
      const p = toPos.clone();

      for (const c of W.colliders) {
        const box = new THREE.Box3().setFromObject(c);
        box.min.x -= radius; box.max.x += radius;
        box.min.z -= radius; box.max.z += radius;

        const yProbe = 1.0;
        if (yProbe < box.min.y || yProbe > box.max.y) continue;

        if (p.x > box.min.x && p.x < box.max.x && p.z > box.min.z && p.z < box.max.z) {
          const dxMin = Math.abs(p.x - box.min.x);
          const dxMax = Math.abs(box.max.x - p.x);
          const dzMin = Math.abs(p.z - box.min.z);
          const dzMax = Math.abs(box.max.z - p.z);
          const m = Math.min(dxMin, dxMax, dzMin, dzMax);

          if (m === dxMin) p.x = box.min.x;
          else if (m === dxMax) p.x = box.max.x;
          else if (m === dzMin) p.z = box.min.z;
          else p.z = box.max.z;
        }
      }

      // backup clamp
      p.x = clamp(p.x, -13.7, 13.7);
      p.z = clamp(p.z, -13.7, 13.7);
      return p;
    };

    W.getZoneAt = (pos) => {
      const p = new THREE.Vector3(pos.x, 0, pos.z);
      const table = new THREE.Vector3(W.zones.tableCenter.x, 0, W.zones.tableCenter.z);
      if (p.distanceTo(table) <= W.zones.tableRadius) return "table";
      return "lobby";
    };

    W.getNearestSeat = (pos) => {
      let best = null;
      let bestD = Infinity;
      for (const s of W.seats) {
        const d = (pos.x - s.position.x) ** 2 + (pos.z - s.position.z) ** 2;
        if (d < bestD) { bestD = d; best = s; }
      }
      return best;
    };

    W.sitPlayerAtSeat = (seatIndex) => {
      const seat = W.seats.find((s) => s.index === seatIndex);
      if (!seat) return;

      W.seatedIndex = seatIndex;

      player.position.x = seat.position.x;
      player.position.z = seat.position.z;
      W._playerYaw = seat.yaw;
      player.rotation.y = W._playerYaw;

      // Desktop seated height; VR uses local-floor so rig y=0
      player.position.y = renderer.xr.isPresenting ? 0 : 1.35;

      log?.(`sitPlayerAtSeat(${seatIndex}) ✅`);
    };

    W.standPlayerInLobby = () => {
      W.seatedIndex = -1;
      player.position.set(0, renderer.xr.isPresenting ? 0 : 1.7, 6);
      W._playerYaw = Math.PI;
      player.rotation.y = W._playerYaw;
      log?.("standPlayerInLobby ✅");
    };

    W.recenter = () => {
      // Default recenter = lobby; main.js overrides for Scorpion Room
      W.standPlayerInLobby();
    };

    W.update = () => {
      const t = performance.now() * 0.001;
      neon.intensity = 1.7 + Math.sin(t * 1.2) * 0.25;
      pink.intensity = 1.3 + Math.cos(t * 1.0) * 0.22;
    };

    // initial yaw
    player.rotation.y = W._playerYaw;

    log?.("world init ✅");
    return W;
  }
};
