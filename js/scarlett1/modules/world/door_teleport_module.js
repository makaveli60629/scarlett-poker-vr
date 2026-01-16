// /js/scarlett1/modules/world/door_teleport_module.js
// DOOR TELEPORT MODULE (FULL) — ROOT PATCHED
// - Toggle-safe via door_teleport_ROOT marker group
// - Laser + Trigger teleports to mapped room index
// Requires:
// - lobby_hallways_module (door portal planes userData.isDoorPortal)
// - room_manager_module (ctx.rooms.ensure/get)

export function createDoorTeleportModule({
  doorToRoom = [0, 1, 2, 3],     // Hall_1..Hall_4 -> Room indexes 0..3
  interactDistance = 12.0,
} = {}) {
  let prevTrig = { left: 0, right: 0 };
  let cachedDoorPlanes = null;
  let built = false;

  function ensureRoot(ctx) {
    if (built) return;
    built = true;
    const root = new ctx.THREE.Group();
    root.name = "door_teleport_ROOT";
    ctx.scene.add(root);
  }

  function rootExists(ctx) {
    let found = false;
    ctx.scene.traverse(o => { if (o.name === "door_teleport_ROOT") found = true; });
    return found;
  }

  function trigDown(input, hand) {
    const v = input[hand].trigger || 0;
    const down = (v > 0.55 && prevTrig[hand] <= 0.55);
    prevTrig[hand] = v;
    return down;
  }

  function getRay(ctx, hand) {
    const ctrl = hand === "left" ? ctx.controllers.left : ctx.controllers.right;
    if (!ctrl) return null;

    const origin = new ctx.THREE.Vector3();
    const quat = new ctx.THREE.Quaternion();
    ctrl.getWorldPosition(origin);
    ctrl.getWorldQuaternion(quat);

    const dir = new ctx.THREE.Vector3(0, 0, -1).applyQuaternion(quat).normalize();
    return { origin, dir };
  }

  function findDoorPlanes(ctx) {
    if (cachedDoorPlanes && cachedDoorPlanes.length) return cachedDoorPlanes;

    const planes = [];
    ctx.scene.traverse((obj) => {
      if (obj?.userData?.isDoorPortal) planes.push(obj);
    });
    cachedDoorPlanes = planes;
    return planes;
  }

  function doorIndexFromObject(obj) {
    let o = obj;
    while (o) {
      const n = o.name || "";
      if (n.startsWith("Hall_")) {
        const num = parseInt(n.split("_")[1], 10);
        if (!Number.isNaN(num)) return num - 1;
      }
      o = o.parent;
    }
    return 0;
  }

  function teleportToRoom(ctx, roomIndex) {
    if (!ctx.rooms?.ensure || !ctx.rooms?.get) return;

    ctx.rooms.ensure(Math.max(roomIndex + 1, 1));
    const room = ctx.rooms.get(roomIndex);
    if (!room?.group) return;

    const THREE = ctx.THREE;

    const wp = new THREE.Vector3();
    room.group.getWorldPosition(wp);

    const q = new THREE.Quaternion();
    room.group.getWorldQuaternion(q);

    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q).normalize();
    const offset = fwd.clone().multiplyScalar(2.2);

    ctx.playerRig.position.set(wp.x + offset.x, 0, wp.z + offset.z);

    const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
    ctx.playerRig.rotation.set(0, e.y, 0);

    console.log(`[door_teleport] teleport ✅ room #${roomIndex + 1}`);
  }

  return {
    name: "door_teleport",

    onEnable(ctx) {
      ensureRoot(ctx);

      // Prime cache after lobby builds
      setTimeout(() => { cachedDoorPlanes = null; findDoorPlanes(ctx); }, 200);
      setTimeout(() => { cachedDoorPlanes = null; findDoorPlanes(ctx); }, 900);

      console.log("[door_teleport] ready ✅");
    },

    update(ctx, { input }) {
      if (!rootExists(ctx)) return;     // toggled OFF
      if (!ctx.xrSession) return;

      const hands = [];
      if (trigDown(input, "left")) hands.push("left");
      if (trigDown(input, "right")) hands.push("right");
      if (!hands.length) return;

      const planes = findDoorPlanes(ctx);
      if (!planes.length) return;

      const THREE = ctx.THREE;
      const raycaster = new THREE.Raycaster();
      raycaster.far = interactDistance;

      for (const hand of hands) {
        const r = getRay(ctx, hand);
        if (!r) continue;

        raycaster.set(r.origin, r.dir);
        const hits = raycaster.intersectObjects(planes, true);
        if (!hits.length) continue;

        const hitObj = hits[0].object;
        const doorIdx = doorIndexFromObject(hitObj);
        const roomIdx = doorToRoom[Math.max(0, Math.min(doorIdx, doorToRoom.length - 1))];

        teleportToRoom(ctx, roomIdx);
        return;
      }
    }
  };
  }
