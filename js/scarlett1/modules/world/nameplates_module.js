// /js/scarlett1/modules/world/nameplates_module.js
// NAMEPLATES + LOBBY DIRECTORY (FULL) — ROOT PATCHED

export function createNameplatesModule({
  doorSignY = 2.85,
  doorSignZ = 4.6,
  doorSignW = 2.6,
  doorSignH = 0.75,

  directoryPos = { x: 0, y: 1.65, z: 2.2 },
  directoryW = 4.4,
  directoryH = 2.4,
} = {}) {
  let built = false;

  const ROOMS = [
    { key: "SCORPION", color: 0x33ffff },
    { key: "DEVILS",  color: 0x8833ff },
    { key: "STORE",   color: 0xff66ff },
    { key: "VIP",     color: 0xffcc33 },
  ];

  function matGlow(ctx, color, emissive, ei) {
    return new ctx.THREE.MeshStandardMaterial({
      color,
      roughness: 0.55,
      metalness: 0.15,
      emissive: new ctx.THREE.Color(emissive),
      emissiveIntensity: ei,
    });
  }

  function makeSign(ctx, w, h, color) {
    const g = new ctx.THREE.Group();

    const frame = new ctx.THREE.Mesh(
      new ctx.THREE.BoxGeometry(w, h, 0.12),
      matGlow(ctx, 0x101020, 0x112244, 0.25)
    );
    g.add(frame);

    const plate = new ctx.THREE.Mesh(
      new ctx.THREE.PlaneGeometry(w * 0.92, h * 0.78),
      matGlow(ctx, 0x0b0b12, color, 0.9)
    );
    plate.position.z = 0.07;
    g.add(plate);

    const bars = new ctx.THREE.Group();
    const barCount = 7;
    for (let i = 0; i < barCount; i++) {
      const bw = 0.18 + (i % 3) * 0.10;
      const bh = 0.07;
      const bar = new ctx.THREE.Mesh(
        new ctx.THREE.BoxGeometry(bw, bh, 0.05),
        matGlow(ctx, 0x0f0f18, color, 0.8)
      );
      bar.position.set(-w * 0.34 + i * 0.22, -h * 0.18 + (i % 2) * 0.14, 0.08);
      bars.add(bar);
    }
    g.add(bars);

    return g;
  }

  function findHall(ctx, n) {
    let found = null;
    ctx.scene.traverse((obj) => {
      if (obj.name === `Hall_${n}`) found = obj;
    });
    return found;
  }

  function buildDoorSignsWorldSpace(ctx, root) {
    const THREE = ctx.THREE;

    for (let i = 0; i < 4; i++) {
      const hall = findHall(ctx, i + 1);
      if (!hall) continue;

      const sign = makeSign(ctx, doorSignW, doorSignH, ROOMS[i].color);
      sign.name = `DoorSign_${i + 1}`;

      // Compute world transform of the desired local point in the hall
      const lp = new THREE.Vector3(0, doorSignY, doorSignZ);
      const wp = lp.clone();
      hall.localToWorld(wp);
      sign.position.copy(wp);

      // Match hall yaw (world)
      const q = new THREE.Quaternion();
      hall.getWorldQuaternion(q);
      sign.quaternion.copy(q);

      root.add(sign);
    }

    console.log("[nameplates] door signs ✅");
  }

  function buildDirectory(ctx, root) {
    const THREE = ctx.THREE;

    const panel = new THREE.Group();
    panel.name = "LobbyDirectory";
    panel.position.set(directoryPos.x, directoryPos.y, directoryPos.z);
    root.add(panel);

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(directoryW, directoryH, 0.16),
      matGlow(ctx, 0x101020, 0x112244, 0.25)
    );
    panel.add(frame);

    const bg = new THREE.Mesh(
      new THREE.PlaneGeometry(directoryW * 0.93, directoryH * 0.83),
      matGlow(ctx, 0x0b0b12, 0x33ffff, 0.15)
    );
    bg.position.z = 0.09;
    panel.add(bg);

    for (let i = 0; i < 4; i++) {
      const row = new THREE.Mesh(
        new THREE.BoxGeometry(directoryW * 0.86, 0.28, 0.05),
        matGlow(ctx, 0x0f0f18, ROOMS[i].color, 0.75)
      );
      row.position.set(0, 0.65 - i * 0.42, 0.10);
      panel.add(row);

      const n = i + 1;
      const num = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.12 + n * 0.03, 0.05),
        matGlow(ctx, 0x0f0f18, 0xffffff, 0.55)
      );
      num.position.set(-directoryW * 0.36, row.position.y, 0.12);
      panel.add(num);

      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 12, 12),
        matGlow(ctx, 0x0f0f18, ROOMS[i].color, 0.85)
      );
      dot.position.set(directoryW * 0.36, row.position.y, 0.12);
      panel.add(dot);
    }

    panel.rotation.y = Math.PI;
    console.log("[nameplates] lobby directory ✅");
  }

  return {
    name: "nameplates",

    onEnable(ctx) {
      if (built) return;
      built = true;

      const THREE = ctx.THREE;

      const root = new THREE.Group();
      root.name = "nameplates_ROOT";
      ctx.scene.add(root);

      setTimeout(() => buildDoorSignsWorldSpace(ctx, root), 150);
      setTimeout(() => buildDoorSignsWorldSpace(ctx, root), 800);

      buildDirectory(ctx, root);
      console.log("[nameplates] ready ✅");
    },
  };
}
