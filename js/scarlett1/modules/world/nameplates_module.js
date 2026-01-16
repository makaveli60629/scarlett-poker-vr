// /js/scarlett1/modules/world/nameplates_module.js
// NAMEPLATES + LOBBY DIRECTORY MAP (FULL) — Modular Forever
// - Adds emissive sign panels above each hallway door (Hall_1..Hall_4)
// - Adds a lobby "directory map" panel near the center
// Quest-safe: no font rendering; uses colored blocks to represent each room identity

export function createNameplatesModule({
  // Hallway door sign placement (relative to each Hall group)
  doorSignY = 2.85,
  doorSignZ = 4.6,         // near the end of the hall (hallLength * 0.5 - something)
  doorSignW = 2.6,
  doorSignH = 0.75,

  // Lobby directory panel placement (world space, in lobby)
  directoryPos = { x: 0, y: 1.65, z: 2.2 },
  directoryW = 4.4,
  directoryH = 2.4,

} = {}) {
  let built = false;

  const ROOMS = [
    { key: "SCORPION", label: "SCORPION • MAIN TEST", color: 0x33ffff, glow: 0x112244 },
    { key: "DEVILS",  label: "DEVILS • TABLE FARM",  color: 0x8833ff, glow: 0x220033 },
    { key: "STORE",   label: "STORE • MANNEQUINS",   color: 0xff66ff, glow: 0x220011 },
    { key: "VIP",     label: "VIP • LOUNGE",         color: 0xffcc33, glow: 0x332200 },
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

    // "Glyph bars" to represent the room label (placeholder for text)
    const bars = new ctx.THREE.Group();
    bars.name = "GlyphBars";
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

  function buildDoorSigns(ctx) {
    for (let i = 0; i < 4; i++) {
      const hall = findHall(ctx, i + 1);
      if (!hall) continue;

      const info = ROOMS[i];
      const sign = makeSign(ctx, doorSignW, doorSignH, info.color);
      sign.name = `DoorSign_${i + 1}`;

      // Put sign near door end; hall local space faces down its Z axis
      sign.position.set(0, doorSignY, doorSignZ);
      hall.add(sign);
    }
    console.log("[nameplates] door signs ✅");
  }

  function buildDirectory(ctx) {
    const root = ctx.scene;

    const panel = new ctx.THREE.Group();
    panel.name = "LobbyDirectory";

    panel.position.set(directoryPos.x, directoryPos.y, directoryPos.z);
    root.add(panel);

    // Frame
    const frame = new ctx.THREE.Mesh(
      new ctx.THREE.BoxGeometry(directoryW, directoryH, 0.16),
      matGlow(ctx, 0x101020, 0x112244, 0.25)
    );
    panel.add(frame);

    // Screen background
    const bg = new ctx.THREE.Mesh(
      new ctx.THREE.PlaneGeometry(directoryW * 0.93, directoryH * 0.83),
      matGlow(ctx, 0x0b0b12, 0x33ffff, 0.15)
    );
    bg.position.z = 0.09;
    panel.add(bg);

    // “Map rows”: colored strips representing the 4 rooms
    for (let i = 0; i < 4; i++) {
      const info = ROOMS[i];

      const row = new ctx.THREE.Mesh(
        new ctx.THREE.BoxGeometry(directoryW * 0.86, 0.28, 0.05),
        matGlow(ctx, 0x0f0f18, info.color, 0.75)
      );
      row.position.set(0, 0.65 - i * 0.42, 0.10);
      panel.add(row);

      // Small "door number" block (1..4 encoded by height)
      const n = i + 1;
      const num = new ctx.THREE.Mesh(
        new ctx.THREE.BoxGeometry(0.16, 0.12 + n * 0.03, 0.05),
        matGlow(ctx, 0x0f0f18, 0xffffff, 0.55)
      );
      num.position.set(-directoryW * 0.36, row.position.y, 0.12);
      panel.add(num);

      // Icon dot
      const dot = new ctx.THREE.Mesh(
        new ctx.THREE.SphereGeometry(0.07, 12, 12),
        matGlow(ctx, 0x0f0f18, info.color, 0.85)
      );
      dot.position.set(directoryW * 0.36, row.position.y, 0.12);
      panel.add(dot);
    }

    // Face toward player spawn area (rough)
    panel.rotation.y = Math.PI;
    console.log("[nameplates] lobby directory ✅");
  }

  return {
    name: "nameplates",

    onEnable(ctx) {
      if (built) return;
      built = true;

      // Delay a bit so lobby module has created halls
      setTimeout(() => buildDoorSigns(ctx), 100);
      setTimeout(() => buildDoorSigns(ctx), 600);

      buildDirectory(ctx);

      console.log("[nameplates] ready ✅");
    },
  };
}
