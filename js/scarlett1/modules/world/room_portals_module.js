// /js/scarlett1/modules/world/room_portals_module.js
// ROOM PORTALS MODULE (FULL) — ROOT PATCHED

export function createRoomPortalsModule({
  portalCount = 20,
  lobbyRadius = 10.8,
  portalY = 0.0,
  portalHeight = 2.2,
  portalWidth = 0.70,
  portalDepth = 0.22,
  interactDistance = 10.0,
} = {}) {
  let built = false;
  let portals = [];
  let prevTrig = { left: 0, right: 0 };

  function mkMat(ctx, color, emissive, ei = 0.6) {
    return new ctx.THREE.MeshStandardMaterial({
      color,
      roughness: 0.5,
      metalness: 0.18,
      emissive: new ctx.THREE.Color(emissive),
      emissiveIntensity: ei,
    });
  }

  function ensureRooms(ctx) {
    ctx.rooms?.ensure?.(portalCount);
  }

  function build(ctx) {
    if (built) return;
    built = true;

    ensureRooms(ctx);

    const THREE = ctx.THREE;

    const root = new THREE.Group();
    root.name = "room_portals_ROOT";
    ctx.scene.add(root);

    const group = new THREE.Group();
    group.name = "RoomPortals";
    root.add(group);

    const bodyMat = mkMat(ctx, 0x101020, 0x112244, 0.35);
    const glowMat = mkMat(ctx, 0x0f0f18, 0x33ffff, 0.65);
    const numMat  = mkMat(ctx, 0x0f0f18, 0xff66ff, 0.85);

    portals = [];

    for (let i = 0; i < portalCount; i++) {
      const t = (i / portalCount) * Math.PI * 2;

      const x = Math.cos(t) * lobbyRadius;
      const z = Math.sin(t) * lobbyRadius;
      const yaw = -t + Math.PI / 2;

      const p = new THREE.Group();
      p.name = `Portal_${i + 1}`;
      p.userData.portalIndex = i;
      p.position.set(x, portalY, z);
      p.rotation.y = yaw;

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(portalWidth, portalHeight, portalDepth),
        bodyMat
      );
      body.position.y = portalHeight * 0.5;
      p.add(body);

      const glow = new THREE.Mesh(
        new THREE.BoxGeometry(portalWidth * 0.92, portalHeight * 0.25, portalDepth * 0.65),
        glowMat
      );
      glow.position.set(0, portalHeight * 0.78, portalDepth * 0.55);
      p.add(glow);

      const bars = new THREE.Group();
      bars.name = "NumberBars";
      const n = i + 1;
      const barCount = Math.min(5, Math.max(1, Math.ceil(n / 4)));
      for (let b = 0; b < barCount; b++) {
        const h = 0.12 + 0.05 * ((n + b) % 4);
        const bar = new THREE.Mesh(
          new THREE.BoxGeometry(0.10, h, 0.06),
          numMat
        );
        bar.position.set(-0.22 + b * 0.11, portalHeight * 0.45, portalDepth * 0.55);
        bars.add(bar);
      }
      p.add(bars);

      const plate = new THREE.Mesh(
        new THREE.PlaneGeometry(portalWidth * 1.0, portalHeight * 0.95),
        new THREE.MeshStandardMaterial({ color: 0x000000, transparent: true, opacity: 0.0 })
      );
      plate.position.set(0, portalHeight * 0.55, portalDepth * 0.62);
      plate.userData.portalIndex = i;
      plate.userData.isPortalPlate = true;
      p.add(plate);

      group.add(p);
      portals.push({ group: p, plate });
    }

    console.log("[room_portals] built ✅ portals=", portals.length);
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

  function trigDown(input, hand) {
    const v = input[hand].trigger || 0;
    const down = (v > 0.55 && prevTrig[hand] <= 0.55);
    prevTrig[hand] = v;
    return down;
  }

  function teleportToRoom(ctx, roomIndex) {
    const room = ctx.rooms?.get?.(roomIndex);
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
  }

  function rootExists(ctx) {
    let found = false;
    ctx.scene.traverse(o => { if (o.name === "room_portals_ROOT") found = true; });
    return found;
  }

  return {
    name: "room_portals",
    onEnable(ctx) { build(ctx); },
    update(ctx, { input }) {
      if (!rootExists(ctx)) return; // toggled OFF
      if (!ctx.xrSession) return;
      if (!portals.length || !ctx.rooms?.get) return;

      const hands = [];
      if (trigDown(input, "left")) hands.push("left");
      if (trigDown(input, "right")) hands.push("right");
      if (!hands.length) return;

      const THREE = ctx.THREE;
      const raycaster = new THREE.Raycaster();
      raycaster.far = interactDistance;

      for (const hand of hands) {
        const r = getRay(ctx, hand);
        if (!r) continue;

        raycaster.set(r.origin, r.dir);
        const plates = portals.map(p => p.plate);
        const hits = raycaster.intersectObjects(plates, true);
        if (hits.length) {
          const idx = hits[0].object?.userData?.portalIndex;
          if (typeof idx === "number") {
            ctx.rooms.ensure?.(Math.max(portalCount, idx + 1));
            teleportToRoom(ctx, idx);
            return;
          }
        }
      }
    },
  };
  }
