// /js/world.js — ScarlettVR Poker World (GitHub Pages safe)
// Provides: colliders, seats, zones (lobby/table/spectate), player yaw,
// and helper functions to sit/stand/spectate.

export const World = {
  init({ THREE, scene, renderer, camera, player, controllers, log }) {
    const W = {
      THREE,
      scene,
      renderer,
      camera,
      player,
      controllers,
      log,

      // collision
      colliders: [],
      _playerYaw: 0,

      // zones
      zones: {
        // simple circles/boxes in XZ plane
        tableCenter: new THREE.Vector3(0, 0, 0),
        tableRadius: 4.2,
        spectateCenter: new THREE.Vector3(-6.0, 0, 2.0),
        spectateRadius: 2.25,
      },

      // seats
      seats: [],
      seatedIndex: -1,

      // mode
      mode: "lobby",
    };

    /* -----------------------------
       Helpers
    -------------------------------- */
    function addColliderBox({ x, y, z }, { sx, sy, sz }, name = "collider") {
      const geo = new THREE.BoxGeometry(sx, sy, sz);
      const mat = new THREE.MeshBasicMaterial({ visible: false });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = name;
      mesh.position.set(x, y, z);
      mesh.updateMatrixWorld(true);
      scene.add(mesh);
      W.colliders.push(mesh);
      return mesh;
    }

    function addVisibleBox({ x, y, z }, { sx, sy, sz }, material, name = "box") {
      const geo = new THREE.BoxGeometry(sx, sy, sz);
      const mesh = new THREE.Mesh(geo, material);
      mesh.name = name;
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      return mesh;
    }

    function addRingMarker(pos, r0, r1, color = 0x7fe7ff) {
      const g = new THREE.RingGeometry(r0, r1, 64);
      const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(g, m);
      ring.rotation.x = -Math.PI / 2;
      ring.position.copy(pos);
      ring.position.y = 0.02;
      scene.add(ring);
      return ring;
    }

    function clamp(v, a, b) {
      return Math.max(a, Math.min(b, v));
    }

    /* -----------------------------
       Lighting
    -------------------------------- */
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));

    const key = new THREE.DirectionalLight(0xffffff, 1.25);
    key.position.set(6, 10, 6);
    key.castShadow = false;
    scene.add(key);

    const neon = new THREE.PointLight(0x7fe7ff, 2.0, 20, 2.0);
    neon.position.set(0, 4.0, 0);
    scene.add(neon);

    const pink = new THREE.PointLight(0xff2d7a, 1.6, 18, 2.0);
    pink.position.set(-5, 3.2, -3);
    scene.add(pink);

    /* -----------------------------
       Floor + walls (solid)
    -------------------------------- */
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x111421,
      roughness: 0.95,
      metalness: 0.05,
    });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Room walls
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x1a1f33,
      roughness: 0.9,
      metalness: 0.05,
    });

    // visible walls
    addVisibleBox({ x: 0, y: 2.2, z: -15 }, { sx: 60, sy: 4.4, sz: 1 }, wallMat, "wall_n");
    addVisibleBox({ x: 0, y: 2.2, z: 15 }, { sx: 60, sy: 4.4, sz: 1 }, wallMat, "wall_s");
    addVisibleBox({ x: -15, y: 2.2, z: 0 }, { sx: 1, sy: 4.4, sz: 60 }, wallMat, "wall_w");
    addVisibleBox({ x: 15, y: 2.2, z: 0 }, { sx: 1, sy: 4.4, sz: 60 }, wallMat, "wall_e");

    // colliders match walls
    addColliderBox({ x: 0, y: 2.2, z: -15 }, { sx: 60, sy: 4.4, sz: 1 }, "col_wall_n");
    addColliderBox({ x: 0, y: 2.2, z: 15 }, { sx: 60, sy: 4.4, sz: 1 }, "col_wall_s");
    addColliderBox({ x: -15, y: 2.2, z: 0 }, { sx: 1, sy: 4.4, sz: 60 }, "col_wall_w");
    addColliderBox({ x: 15, y: 2.2, z: 0 }, { sx: 1, sy: 4.4, sz: 60 }, "col_wall_e");

    /* -----------------------------
       Poker table + rail
    -------------------------------- */
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x0b3a2a,
      roughness: 0.8,
      metalness: 0.05,
      emissive: 0x02160f,
      emissiveIntensity: 0.45,
    });

    const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.22, 64), tableMat);
    tableTop.position.set(0, 1.02, 0);
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    scene.add(tableTop);

    const tableBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 1.05, 0.9, 32),
      new THREE.MeshStandardMaterial({ color: 0x12131a, roughness: 0.65, metalness: 0.25 })
    );
    tableBase.position.set(0, 0.45, 0);
    tableBase.castShadow = true;
    tableBase.receiveShadow = true;
    scene.add(tableBase);

    // Rail ring (visual + collision ring approximated by boxes)
    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(2.65, 0.14, 24, 80),
      new THREE.MeshStandardMaterial({ color: 0x161a2a, roughness: 0.7, metalness: 0.2 })
    );
    rail.rotation.x = Math.PI / 2;
    rail.position.set(0, 1.0, 0);
    scene.add(rail);

    // ring collision approximated with 12 boxes
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

    /* -----------------------------
       Seats (8)
       - Auto-seat picks nearest seat
       - Seat transform stored in W.seats
    -------------------------------- */
    const seatRadius = 3.35;
    const seatY = 0; // we sit by placing player rig; camera/hmd handles actual height in VR
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI; // rotate so seat 0 is "front"
      const px = Math.cos(a) * seatRadius;
      const pz = Math.sin(a) * seatRadius;

      // chair visual
      const chair = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.8, 0.6),
        new THREE.MeshStandardMaterial({ color: 0x0f111a, roughness: 0.85, metalness: 0.15 })
      );
      chair.position.set(px, 0.4, pz);
      chair.rotation.y = a + Math.PI; // face table
      chair.castShadow = true;
      chair.receiveShadow = true;
      scene.add(chair);

      // seat marker (subtle)
      const mark = addRingMarker(new THREE.Vector3(px, 0, pz), 0.12, 0.19, 0xffcc00);
      mark.material.opacity = 0.55;

      W.seats.push({
        index: i,
        position: new THREE.Vector3(px, seatY, pz),
        yaw: a + Math.PI, // face table
      });
    }

    /* -----------------------------
       Spectate + Lobby markers
    -------------------------------- */
    addRingMarker(new THREE.Vector3(W.zones.spectateCenter.x, 0, W.zones.spectateCenter.z), 0.35, 0.5, 0xff2d7a);
    // lobby hint marker
    addRingMarker(new THREE.Vector3(0, 0, 6), 0.25, 0.38, 0x7fe7ff);

    /* -----------------------------
       Public API
    -------------------------------- */
    W.setMode = (m) => { W.mode = m; };

    W.getPlayerYaw = () => W._playerYaw;
    W.addPlayerYaw = (delta) => {
      W._playerYaw += delta;
      // apply yaw to player rig only (camera local rotation stays free)
      player.rotation.y = W._playerYaw;
    };

    W.resolvePlayerCollision = (fromPos, toPos) => {
      // simple capsule-ish collision: treat player as circle in XZ, push out of AABB colliders
      const radius = 0.28;
      const p = toPos.clone();

      for (const c of W.colliders) {
        const box = new THREE.Box3().setFromObject(c);
        // Expand box by player radius in XZ
        box.min.x -= radius; box.max.x += radius;
        box.min.z -= radius; box.max.z += radius;

        // Only collide if within vertical span (rough check)
        // Player "feet" at y=0 in VR; in desktop rig y=1.7 but we care xz anyway.
        const y = 1.0;
        if (y < box.min.y || y > box.max.y) continue;

        if (p.x > box.min.x && p.x < box.max.x && p.z > box.min.z && p.z < box.max.z) {
          // push out along nearest edge in XZ
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

      // keep within room bounds (backup clamp)
      p.x = clamp(p.x, -13.7, 13.7);
      p.z = clamp(p.z, -13.7, 13.7);

      return p;
    };

    W.getZoneAt = (pos) => {
      // spectate zone
      if (pos.distanceTo(new THREE.Vector3(W.zones.spectateCenter.x, pos.y, W.zones.spectateCenter.z)) <= W.zones.spectateRadius) {
        return "spectate";
      }

      // table zone
      if (pos.distanceTo(new THREE.Vector3(W.zones.tableCenter.x, pos.y, W.zones.tableCenter.z)) <= W.zones.tableRadius) {
        return "table";
      }

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

      // Place rig at seat and face table
      player.position.x = seat.position.x;
      player.position.z = seat.position.z;
      W._playerYaw = seat.yaw;
      player.rotation.y = W._playerYaw;

      // In desktop, keep standing height but "seated" feel can be lower:
      if (!renderer.xr.isPresenting) {
        player.position.y = 1.35;
      } else {
        player.position.y = 0; // local-floor
      }

      log?.(`sitPlayerAtSeat(${seatIndex}) ✅`);
    };

    W.standPlayerInLobby = () => {
      W.seatedIndex = -1;
      // Lobby spawn
      player.position.set(0, renderer.xr.isPresenting ? 0 : 1.7, 6);
      W._playerYaw = Math.PI; // face table area
      player.rotation.y = W._playerYaw;
      log?.("standPlayerInLobby ✅");
    };

    W.movePlayerToSpectate = () => {
      player.position.set(W.zones.spectateCenter.x, renderer.xr.isPresenting ? 0 : 1.7, W.zones.spectateCenter.z);
      // face table
      const dx = W.zones.tableCenter.x - W.zones.spectateCenter.x;
      const dz = W.zones.tableCenter.z - W.zones.spectateCenter.z;
      W._playerYaw = Math.atan2(dx, dz);
      player.rotation.y = W._playerYaw;
      log?.("movePlayerToSpectate ✅");
    };

    W.update = (dt) => {
      // You can expand here: animated teleport machine, bots, chip FX, etc.
      // Small ambient pulse
      neon.intensity = 1.7 + Math.sin(performance.now() * 0.0012) * 0.25;
      pink.intensity = 1.3 + Math.cos(performance.now() * 0.0010) * 0.22;
    };

    log?.("init ✅");
    return W;
  }
};
