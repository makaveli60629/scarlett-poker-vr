// /js/scarlett1/modules/world/room_manager_module.js
// ROOM MANAGER MODULE (FULL) — Modular Forever
// - Creates a dedicated Game Room system around the lobby
// - Room #1 is "SCORPION • MAIN TEST" (your continuous bot game room)
// - World modules can build into a specific room group instead of scene root
// - Future: spawn Room 2..20 for more games, spectators, etc.

export function createRoomManagerModule({
  maxRooms = 24,
  perRing = 8,
  baseRadius = 18,     // distance from lobby center to room centers
  ringStep = 13,       // distance between rings
  roomRadius = 7.75,   // room cylinder radius
  roomHeight = 3.6,
  floorY = 0.0,
} = {}) {
  let root = null;
  const rooms = []; // array of { group, index, label, pose }

  function ensureRoot(ctx) {
    if (root) return;
    root = new ctx.THREE.Group();
    root.name = "RoomRoot";
    ctx.scene.add(root);
  }

  function poseForIndex(index) {
    const ring = Math.floor(index / perRing);
    const slot = index % perRing;

    const radius = baseRadius + ring * ringStep;
    const angle = (slot / perRing) * Math.PI * 2;

    return {
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      yaw: -angle + Math.PI / 2,
      ring,
      slot,
      angle
    };
  }

  function makeRoomShell(ctx, label) {
    const THREE = ctx.THREE;

    const g = new THREE.Group();
    g.name = `RoomShell_${label}`;

    // floor
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(roomRadius, 72),
      new THREE.MeshStandardMaterial({ color: 0x070711, roughness: 0.95, metalness: 0.02 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = floorY + 0.01;
    g.add(floor);

    // wall cylinder (open top)
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(roomRadius, roomRadius, roomHeight, 96, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x0b0b12, roughness: 0.85, metalness: 0.08 })
    );
    wall.position.y = floorY + roomHeight * 0.5;
    g.add(wall);

    // subtle neon trim ring near ceiling
    const ringPts = [];
    const seg = 128;
    const rr = roomRadius - 0.22;
    for (let i = 0; i <= seg; i++) {
      const t = (i / seg) * Math.PI * 2;
      ringPts.push(new THREE.Vector3(Math.cos(t) * rr, floorY + roomHeight - 0.25, Math.sin(t) * rr));
    }
    const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPts);
    const ring = new THREE.Line(ringGeo, new THREE.LineBasicMaterial({ color: 0x33ffff }));
    g.add(ring);

    // sign panel (placeholder)
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x101020, emissive: 0x112244, emissiveIntensity: 0.5 })
    );
    sign.position.set(0, floorY + 2.6, -roomRadius + 0.35);
    g.add(sign);

    return g;
  }

  function createRoom(ctx, index, label) {
    if (index >= maxRooms) return null;
    ensureRoot(ctx);

    const pose = poseForIndex(index);
    const group = new ctx.THREE.Group();
    group.name = `Room_${index + 1}`;
    group.userData.roomIndex = index;
    group.userData.label = label;
    group.userData.pose = pose;

    group.position.set(pose.x, 0, pose.z);
    group.rotation.y = pose.yaw;

    // add shell
    const shell = makeRoomShell(ctx, label);
    shell.name = "RoomShell";
    group.add(shell);

    // add a simple “portal marker” (so you can see direction)
    const marker = new ctx.THREE.Mesh(
      new ctx.THREE.BoxGeometry(0.25, 1.5, 0.25),
      new ctx.THREE.MeshStandardMaterial({ color: 0xff66ff, roughness: 0.65, metalness: 0.15, emissive: 0x220011, emissiveIntensity: 0.35 })
    );
    marker.position.set(0, floorY + 0.75, roomRadius - 0.6);
    group.add(marker);

    root.add(group);

    const room = { group, index, label, pose };
    rooms[index] = room;
    return room;
  }

  function ensureRooms(ctx, count) {
    const n = Math.max(1, Math.min(count, maxRooms));
    for (let i = 0; i < n; i++) {
      if (!rooms[i]) {
        const label = (i === 0) ? "SCORPION • MAIN TEST" : `GAME ROOM #${i + 1}`;
        createRoom(ctx, i, label);
      }
    }
    return rooms.slice(0, n).filter(Boolean);
  }

  function getRoom(index) {
    return rooms[index] || null;
  }

  return {
    name: "room_manager",

    onEnable(ctx) {
      ensureRoot(ctx);

      // Always create Room #1 as your main playable test space
      ensureRooms(ctx, 1);

      // Expose API to orchestrator context (other modules can use this)
      ctx.rooms = {
        root: () => root,
        list: () => rooms.filter(Boolean),
        get: (i) => getRoom(i),
        ensure: (n) => ensureRooms(ctx, n),
      };

      console.log("[room_manager] ready ✅ rooms=", ctx.rooms.list().length);
    },
  };
}
