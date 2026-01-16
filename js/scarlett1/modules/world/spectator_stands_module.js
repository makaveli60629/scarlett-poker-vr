// /js/scarlett1/modules/world/spectator_stands_module.js
// SPECTATOR STANDS MODULE (FULL) — Modular Forever
// - Adds tiered steps around the pit + outer balcony ring + safety rail
// - Targets Room #1 (Scorpion main test) if available
// - Quest-safe: simple meshes only

export function createSpectatorStandsModule({
  targetRoomIndex = 0,

  // Layout
  pitOuterRadius = 7.2,     // should be > pit radius and > inner guard rail radius
  tierCount = 3,
  tierHeight = 0.25,
  tierDepth = 0.55,

  // Balcony
  balconyRadius = 9.2,
  balconyThickness = 0.65,
  balconyY = 0.02,

  // Outer safety rail
  railRadius = 9.55,
  railHeight = 1.05,
  railTubeRadius = 0.035,
  postCount = 16,

} = {}) {
  let built = false;

  function getRoot(ctx) {
    const r = ctx.rooms?.get?.(targetRoomIndex);
    if (r?.group) return r.group;
    return ctx.scene;
  }

  function mat(ctx, color, rough = 0.9, metal = 0.06) {
    return new ctx.THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
  }

  function matGlow(ctx, color, emissive, ei) {
    return new ctx.THREE.MeshStandardMaterial({
      color,
      roughness: 0.55,
      metalness: 0.15,
      emissive: new ctx.THREE.Color(emissive),
      emissiveIntensity: ei,
    });
  }

  return {
    name: "spectator_stands",

    onEnable(ctx) {
      if (built) return;
      built = true;

      const THREE = ctx.THREE;
      const root = getRoot(ctx);

      // ---------- Tiered steps (ring segments as stacked cylinders) ----------
      // We use shallow cylinders as "tiers" to keep poly count low.
      for (let i = 0; i < tierCount; i++) {
        const rOuter = pitOuterRadius + (i + 1) * tierDepth;
        const rInner = pitOuterRadius + i * tierDepth;

        const h = tierHeight;
        const y = i * h; // rising outward

        // Use a thin cylinder as a step ring (solid disc), then cut center visually by placing a darker disc inside.
        const ring = new THREE.Mesh(
          new THREE.CylinderGeometry(rOuter, rOuter, h, 96, 1, false),
          mat(ctx, 0x0b0b12, 0.92, 0.08)
        );
        ring.position.y = y + h * 0.5;
        root.add(ring);

        const cut = new THREE.Mesh(
          new THREE.CylinderGeometry(rInner, rInner, h + 0.01, 96, 1, false),
          mat(ctx, 0x07070d, 0.98, 0.02)
        );
        cut.position.y = y + h * 0.5;
        root.add(cut);

        // subtle neon edge
        const edge = new THREE.Mesh(
          new THREE.TorusGeometry(rOuter - 0.08, 0.02, 12, 144),
          matGlow(ctx, 0x0f0f18, (i % 2 === 0) ? 0x33ffff : 0xff66ff, 0.45)
        );
        edge.rotation.x = Math.PI / 2;
        edge.position.y = y + h + 0.02;
        root.add(edge);
      }

      // ---------- Balcony walking ring ----------
      const balcony = new THREE.Mesh(
        new THREE.CylinderGeometry(balconyRadius, balconyRadius, balconyThickness, 128, 1, false),
        mat(ctx, 0x090912, 0.92, 0.05)
      );
      balcony.position.y = balconyY + balconyThickness * 0.5 + tierCount * tierHeight;
      root.add(balcony);

      // Hollow center visual (dark inner disc)
      const balconyCut = new THREE.Mesh(
        new THREE.CylinderGeometry(pitOuterRadius + tierCount * tierDepth + 0.1, pitOuterRadius + tierCount * tierDepth + 0.1, balconyThickness + 0.02, 128, 1, false),
        mat(ctx, 0x05050a, 0.98, 0.02)
      );
      balconyCut.position.y = balcony.position.y;
      root.add(balconyCut);

      // ---------- Outer safety rail ----------
      const railMat = matGlow(ctx, 0x141424, 0x112244, 0.25);
      const railGlowMat = matGlow(ctx, 0x0f0f18, 0x33ffff, 0.65);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(railRadius, railTubeRadius, 16, 160),
        railMat
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = balcony.position.y + railHeight;
      root.add(ring);

      const ringGlow = new THREE.Mesh(
        new THREE.TorusGeometry(railRadius, railTubeRadius * 0.55, 12, 160),
        railGlowMat
      );
      ringGlow.rotation.x = Math.PI / 2;
      ringGlow.position.y = balcony.position.y + railHeight + 0.07;
      root.add(ringGlow);

      for (let i = 0; i < postCount; i++) {
        const t = (i / postCount) * Math.PI * 2;
        const x = Math.cos(t) * railRadius;
        const z = Math.sin(t) * railRadius;

        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.03, 0.03, railHeight, 14),
          railMat
        );
        post.position.set(x, balcony.position.y + railHeight * 0.5, z);
        root.add(post);
      }

      console.log("[spectator_stands] built ✅");
    },
  };
}
