// /js/scarlett1/modules/world/room_manager_module.js
// Room Manager Module (FULL)
// - Generates multiple game rooms in a ring/grid around lobby
// - Keeps each room self-contained in a THREE.Group
// - World orchestrator / other modules can request rooms

export function createRoomManagerModule({
  roomSpacing = 18,
  maxRooms = 24,
} = {}) {
  const rooms = [];
  let root = null;

  function ensureRoot(ctx) {
    if (root) return;
    root = new ctx.THREE.Group();
    root.name = "RoomRoot";
    ctx.scene.add(root);
  }

  function roomPose(index) {
    // Place rooms in a ring, 8 per ring
    const perRing = 8;
    const ring = Math.floor(index / perRing);
    const slot = index % perRing;

    const radius = roomSpacing * (1 + ring * 0.75);
    const angle = (slot / perRing) * Math.PI * 2;

    return {
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      yaw: -angle + Math.PI / 2,
    };
  }

  function createRoom(ctx, index, label = `Room ${index + 1}`) {
    if (index >= maxRooms) return null;
    ensureRoot(ctx);

    const g = new ctx.THREE.Group();
    g.name = `Room_${index + 1}`;
    g.userData.roomIndex = index;
    g.userData.label = label;

    const pose = roomPose(index);
    g.position.set(pose.x, 0, pose.z);
    g.rotation.y = pose.yaw;

    // Minimal “room floor” marker (so you can see where rooms are)
    const floor = new ctx.THREE.Mesh(
      new ctx.THREE.CircleGeometry(7.5, 64),
      new ctx.THREE.MeshStandardMaterial({ color: 0x080812, roughness: 0.95, metalness: 0.03 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.01;
    g.add(floor);

    // Simple wall ring marker (not heavy geometry)
    const wall = new ctx.THREE.Mesh(
      new ctx.THREE.CylinderGeometry(7.5, 7.5, 3.6, 72, 1, true),
      new ctx.THREE.MeshStandardMaterial({ color: 0x0b0b12, roughness: 0.85, metalness: 0.08 })
    );
    wall.position.y = 1.8;
    g.add(wall);

    // Title placard (lightweight)
    const sign = new ctx.THREE.Mesh(
      new ctx.THREE.PlaneGeometry(3.0, 0.8),
      new ctx.THREE.MeshStandardMaterial({ color: 0x10102a, emissive: 0x112244, emissiveIntensity: 0.45 })
    );
    sign.position.set(0, 2.4, -7.1);
    g.add(sign);

    root.add(g);

    rooms[index] = { group: g };
    return rooms[index];
  }

  function ensure(ctx, count) {
    const n = Math.min(count, maxRooms);
    for (let i = 0; i < n; i++) {
      if (!rooms[i]) createRoom(ctx, i, i === 0 ? "SCORPION • MAIN TEST" : `GAME ROOM #${i + 1}`);
    }
    return rooms.slice(0, n);
  }

  return {
    name: "room_manager",
    onEnable(ctx) {
      ensureRoot(ctx);
      // Always create the main test room (Room 1)
      ensure(ctx, 1);

      // Expose to other modules
      ctx.rooms = {
        list: () => rooms.filter(Boolean),
        ensure: (n) => ensure(ctx, n),
        get: (i) => rooms[i],
        root: () => root,
      };
    },
  };
}
