// /js/scorpion_room.js — Scorpion Room v3.7 (TRUE OVAL 6-SEAT + SPAWN PATCHES)
// Fixes:
// ✅ TRUE oval table top (Shape + ExtrudeGeometry)
// ✅ TRUE oval rim (TubeGeometry along EllipseCurve)
// ✅ 6 chairs around oval
// ✅ Patches BOTH scorpion_seat_1 AND scorpion_safe_spawn
// ✅ Publishes system to ctx.systems.scorpion and ctx.ScorpionRoom for legacy toggles
// ✅ setActive() show/hide room

export const ScorpionRoom = {
  build(ctx) {
    const { THREE, scene, log } = ctx;

    const group = new THREE.Group();
    group.name = "SCORPION_ROOM";
    group.position.set(8, 0, 0);
    scene.add(group);

    // ROOM
    const ROOM_R = 5.2;
    const ROOM_H = 3.2;

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(ROOM_R, 64),
      new THREE.MeshStandardMaterial({ color: 0x080910, roughness: 0.95, metalness: 0.02 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    group.add(floor);

    const walls = new THREE.Mesh(
      new THREE.CylinderGeometry(ROOM_R, ROOM_R, ROOM_H, 72, 1, true),
      new THREE.MeshStandardMaterial({
        color: 0x14061c,
        roughness: 0.92,
        metalness: 0.04,
        side: THREE.BackSide,
        emissive: 0x240a33,
        emissiveIntensity: 0.08,
      })
    );
    walls.position.set(0, ROOM_H / 2, 0);
    group.add(walls);

    const ceiling = new THREE.Mesh(
      new THREE.CircleGeometry(ROOM_R, 64),
      new THREE.MeshStandardMaterial({ color: 0x06060a, roughness: 0.98, metalness: 0.01 })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, ROOM_H, 0);
    group.add(ceiling);

    // LIGHTS
    group.add(new THREE.AmbientLight(0x5a2b78, 0.40));

    const centerGlow = new THREE.PointLight(0xb266ff, 2.8, 16);
    centerGlow.position.set(0, 2.6, 0);
    group.add(centerGlow);

    const key = new THREE.SpotLight(0x7fe7ff, 1.9, 14, Math.PI / 5, 0.55, 1.0);
    key.position.set(0, 3.0, 1.2);
    key.target.position.set(0, 0.9, 0);
    group.add(key);
    group.add(key.target);

    // =========================
    // TRUE OVAL TABLE (6 seats)
    // =========================
    const table = new THREE.Group();
    table.name = "SCORPION_TABLE";
    group.add(table);

    // Base pedestal
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.95, 0.75, 32),
      new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.6, metalness: 0.1 })
    );
    base.position.set(0, 0.375, 0);
    base.castShadow = true;
    base.receiveShadow = true;
    table.add(base);

    // Oval dims
    const a = 1.38; // X radius
    const b = 0.98; // Z radius
    const TOP_Y = 0.80;
    const TOP_THICK = 0.10;

    // Top
    const topShape = new THREE.Shape();
    topShape.absellipse(0, 0, a, b, 0, Math.PI * 2, false, 0);

    const topGeo = new THREE.ExtrudeGeometry(topShape, {
      depth: TOP_THICK,
      bevelEnabled: true,
      bevelThickness: 0.014,
      bevelSize: 0.014,
      bevelSegments: 2,
      curveSegments: 96,
    });

    const topMat = new THREE.MeshStandardMaterial({
      color: 0x0c5a3a, roughness: 0.88, metalness: 0.0
    });

    const top = new THREE.Mesh(topGeo, topMat);
    top.rotation.x = -Math.PI / 2;
    top.position.set(0, TOP_Y, 0);
    top.castShadow = true;
    top.receiveShadow = true;
    table.add(top);

    // Rim
    const rimY = TOP_Y + TOP_THICK + 0.02;
    const rimCurve = new THREE.EllipseCurve(0, 0, a + 0.03, b + 0.03, 0, Math.PI * 2, false, 0);
    const rimPts = rimCurve.getPoints(220).map(p => new THREE.Vector3(p.x, 0, p.y));
    const rimPath = new THREE.CatmullRomCurve3(rimPts, true);
    const rimGeo = new THREE.TubeGeometry(rimPath, 260, 0.015, 10, true);
    const rimMat = new THREE.MeshBasicMaterial({ color: 0xb266ff, transparent: true, opacity: 0.75 });

    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.position.set(0, rimY, 0);
    table.add(rim);

    // surfaceY for PokerSim
    const surfaceY = group.position.y + table.position.y + TOP_Y + TOP_THICK + 0.01;
    table.userData.surfaceY = surfaceY;
    table.userData.dealRadius = Math.min(a, b) * 0.72;

    // GUARDRAIL
    const RAIL_R = 2.15;
    const RAIL_H = 1.05;

    const railRing = new THREE.Mesh(
      new THREE.TorusGeometry(RAIL_R, 0.04, 10, 140),
      new THREE.MeshStandardMaterial({
        color: 0x2a2a44,
        roughness: 0.35,
        metalness: 0.35,
        emissive: 0x7fe7ff,
        emissiveIntensity: 0.20,
      })
    );
    railRing.rotation.x = Math.PI / 2;
    railRing.position.y = RAIL_H;
    group.add(railRing);

    const railCollider = new THREE.Mesh(
      new THREE.CylinderGeometry(RAIL_R, RAIL_R, 2.2, 60, 1, true),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, side: THREE.DoubleSide })
    );
    railCollider.position.set(0, 1.1, 0);
    railCollider.userData.isCollider = true;
    group.add(railCollider);
    ctx.colliders?.push?.(railCollider);

    // =========================
    // CHAIRS (6 players, oval)
    // =========================
    const matSeat = new THREE.MeshStandardMaterial({
      color: 0x1b1b24,
      roughness: 0.7,
      metalness: 0.08,
      emissive: 0x120816,
      emissiveIntensity: 0.10,
    });

    const matTrim = new THREE.MeshBasicMaterial({
      color: 0x7fe7ff,
      transparent: true,
      opacity: 0.55
    });

    function makeChair(name) {
      const chair = new THREE.Group();
      chair.name = name;

      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.10, 0.55), matSeat);
      seat.position.set(0, 0.48, 0);
      chair.add(seat);

      const back = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.10), matSeat);
      back.position.set(0, 0.80, -0.22);
      chair.add(back);

      const trim = new THREE.Mesh(new THREE.TorusGeometry(0.30, 0.015, 10, 60), matTrim);
      trim.rotation.x = Math.PI / 2;
      trim.position.set(0, 0.56, 0);
      chair.add(trim);

      return chair;
    }

    const chairA = a + 0.60;
    const chairB = b + 0.60;

    const seats = [
      { key: "scorpion_seat_1", angle:   0 },  // player
      { key: "scorpion_bot_1",  angle:  60 },
      { key: "scorpion_bot_2",  angle: 120 },
      { key: "scorpion_bot_3",  angle: 180 },
      { key: "scorpion_bot_4",  angle: 240 },
      { key: "scorpion_bot_5",  angle: 300 },
    ];

    let playerChair = null;

    for (const s of seats) {
      const rad = (s.angle * Math.PI) / 180;
      const x = Math.sin(rad) * chairA;
      const z = Math.cos(rad) * chairB;

      const chair = makeChair(`CHAIR_${s.key}`);
      chair.position.set(x, 0, z);
      chair.lookAt(0, 0.50, 0);
      table.add(chair);

      if (s.key === "scorpion_seat_1") playerChair = chair;
    }

    // --- Spawn patch helpers ---
    function getSpawnRef(key) {
      return (
        ctx.spawns?.map?.[key] ||
        ctx.spawns?.list?.[key] ||
        ctx.spawns?.get?.(key) ||
        ctx.spawns?.[key] ||
        null
      );
    }

    function patchSpawnToObject(key, obj, seatBack = 0.45, yMode = "floor") {
      const sp = getSpawnRef(key);
      if (!sp || !obj) return false;

      const pos = new THREE.Vector3();
      obj.getWorldPosition(pos);

      const q = new THREE.Quaternion();
      obj.getWorldQuaternion(q);
      const yaw = new THREE.Euler().setFromQuaternion(q, "YXZ").y;

      sp.x = pos.x;
      sp.z = pos.z;
      sp.yaw = yaw;
      sp.seatBack = seatBack;

      // Don’t hard-set sp.y unless your SpawnPoints uses it.
      // yMode="floor" means leave y alone.
      if (yMode === "table") sp.y = surfaceY;

      log?.(`[scorpion] ✅ patched ${key} -> x=${sp.x.toFixed(2)} z=${sp.z.toFixed(2)} yaw=${sp.yaw.toFixed(2)}`);
      return true;
    }

    // patch scorpion_seat_1 to player chair
    if (playerChair) patchSpawnToObject("scorpion_seat_1", playerChair, 0.45, "floor");

    // patch scorpion_safe_spawn to a STANDING safe point behind chair (so you’re not “on” the chair)
    if (playerChair) {
      const safe = new THREE.Object3D();
      safe.position.copy(playerChair.getWorldPosition(new THREE.Vector3()));
      safe.quaternion.copy(playerChair.getWorldQuaternion(new THREE.Quaternion()));

      // move back from chair along chair forward (so you stand behind it)
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(safe.quaternion);
      safe.position.add(fwd.multiplyScalar(-0.85)); // behind chair
      safe.position.y = 0; // floor

      patchSpawnToObject("scorpion_safe_spawn", safe, 0.0, "floor");
    }

    // publish
    ctx.scorpionTable = table;
    ctx.tables ||= {};
    ctx.tables.scorpion = table;

    const system = {
      group,
      table,
      setActive(v) { group.visible = !!v; },
    };

    // ✅ Make it reachable by BOTH styles:
    ctx.systems ||= {};
    ctx.systems.scorpion = system;
    ctx.ScorpionRoom = system;

    system.setActive(false);
    log?.("[scorpion] build ✅ v3.7 (TRUE oval + 6 chairs + safe_spawn patched)");
    return system;
  },
};
