// /js/scarlett1/modules/world/scorpion_theme_module.js
// SCORPION THEME MODULE (FULL) — Modular Forever
// - Pit guard rails (outer spectator rail)
// - Neon trim pylons around pit rim
// - Scorpion logo panel (placeholder geometry)
// - Room lighting mood (cyan/magenta, no red wash)
// Notes:
// - This module targets Room #1 (SCORPION • MAIN TEST) if available.
// - If Room #1 doesn't exist, it falls back to ctx.scene.

export function createScorpionThemeModule({
  targetRoomIndex = 0,  // Room #1 = index 0
  // Guard rail
  railRadius = 6.95,
  railHeight = 1.05,
  railTubeRadius = 0.035,
  // Pylons
  pylonCount = 12,
  pylonRadius = 6.85,
  pylonHeight = 1.6,
  pylonWidth = 0.10,
  // Logo panel
  logoDistFromCenter = 6.9,
  logoHeight = 2.35,
  // Lighting
  accentIntensity = 0.65,
} = {}) {
  let built = false;

  function getRoot(ctx) {
    const r = ctx.rooms?.get?.(targetRoomIndex);
    if (r?.group) return r.group;
    return ctx.scene;
  }

  function ringLine(ctx, radius, y, color = 0x33ffff, seg = 160) {
    const pts = [];
    for (let i = 0; i <= seg; i++) {
      const t = (i / seg) * Math.PI * 2;
      pts.push(new ctx.THREE.Vector3(Math.cos(t) * radius, y, Math.sin(t) * radius));
    }
    const geo = new ctx.THREE.BufferGeometry().setFromPoints(pts);
    return new ctx.THREE.Line(geo, new ctx.THREE.LineBasicMaterial({ color }));
  }

  function makeEmissiveMat(ctx, color, emissive, ei) {
    return new ctx.THREE.MeshStandardMaterial({
      color,
      roughness: 0.55,
      metalness: 0.15,
      emissive: new ctx.THREE.Color(emissive),
      emissiveIntensity: ei,
    });
  }

  function build(ctx) {
    if (built) return;
    built = true;

    const THREE = ctx.THREE;
    const root = getRoot(ctx);

    // ---------- Mood lighting (no red wash) ----------
    // Keep it subtle; rely on emissive trims.
    const c1 = new THREE.PointLight(0x33ffff, accentIntensity, 18, 2.0);
    c1.position.set(4.5, 2.6, 0);
    root.add(c1);

    const c2 = new THREE.PointLight(0xff66ff, accentIntensity * 0.8, 18, 2.0);
    c2.position.set(-4.5, 2.6, 0);
    root.add(c2);

    // ---------- Pit rim neon rings ----------
    root.add(ringLine(ctx, railRadius - 0.15, 0.06, 0x33ffff));
    root.add(ringLine(ctx, railRadius - 0.25, 0.08, 0xff66ff));

    // ---------- Guard rail (spectator rail) ----------
    // Main ring
    const railMat = makeEmissiveMat(ctx, 0x141424, 0x112244, 0.25);
    const railGlowMat = makeEmissiveMat(ctx, 0x0f0f18, 0x33ffff, 0.65);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(railRadius, railTubeRadius, 16, 128),
      railMat
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = railHeight;
    root.add(ring);

    // top glow strip ring
    const ringGlow = new THREE.Mesh(
      new THREE.TorusGeometry(railRadius, railTubeRadius * 0.55, 12, 128),
      railGlowMat
    );
    ringGlow.rotation.x = Math.PI / 2;
    ringGlow.position.y = railHeight + 0.07;
    root.add(ringGlow);

    // Posts around rail
    const postCount = 14;
    for (let i = 0; i < postCount; i++) {
      const t = (i / postCount) * Math.PI * 2;
      const x = Math.cos(t) * railRadius;
      const z = Math.sin(t) * railRadius;

      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, railHeight, 14),
        railMat
      );
      post.position.set(x, railHeight * 0.5, z);
      root.add(post);
    }

    // ---------- Neon pylons around pit rim ----------
    const pylonBodyMat = makeEmissiveMat(ctx, 0x101020, 0x112244, 0.22);
    const pylonGlowMatA = makeEmissiveMat(ctx, 0x0f0f18, 0x33ffff, 0.85);
    const pylonGlowMatB = makeEmissiveMat(ctx, 0x0f0f18, 0xff66ff, 0.75);

    for (let i = 0; i < pylonCount; i++) {
      const t = (i / pylonCount) * Math.PI * 2;
      const x = Math.cos(t) * pylonRadius;
      const z = Math.sin(t) * pylonRadius;

      const pylon = new THREE.Group();
      pylon.name = `ScorpionPylon_${i}`;
      pylon.position.set(x, 0, z);
      pylon.rotation.y = -t + Math.PI / 2;

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(pylonWidth, pylonHeight, pylonWidth),
        pylonBodyMat
      );
      body.position.y = pylonHeight * 0.5;
      pylon.add(body);

      const glowA = new THREE.Mesh(
        new THREE.BoxGeometry(pylonWidth * 1.15, pylonHeight * 0.18, pylonWidth * 1.15),
        (i % 2 === 0) ? pylonGlowMatA : pylonGlowMatB
      );
      glowA.position.set(0, pylonHeight * 0.80, 0);
      pylon.add(glowA);

      root.add(pylon);
    }

    // ---------- Scorpion logo panel (placeholder) ----------
    // This is a clean “logo wall” you can later swap for a texture.
    const logoFrameMat = makeEmissiveMat(ctx, 0x0f0f18, 0x112244, 0.25);
    const logoScreenMat = makeEmissiveMat(ctx, 0x10102a, 0x33ffff, 0.55);

    const logoFrame = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 2.1, 0.16),
      logoFrameMat
    );
    logoFrame.position.set(0, logoHeight, -logoDistFromCenter);
    root.add(logoFrame);

    const logoScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 1.7),
      logoScreenMat
    );
    logoScreen.position.set(0, 0, 0.091);
    logoFrame.add(logoScreen);

    // "Stinger" icon (simple geometry mark)
    const stinger = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.06, 14, 48),
      makeEmissiveMat(ctx, 0x0f0f18, 0xff66ff, 0.75)
    );
    stinger.rotation.x = Math.PI / 2;
    stinger.position.set(0, 0.0, 0.092);
    logoFrame.add(stinger);

    console.log("[scorpion_theme] applied ✅ to room", targetRoomIndex + 1);
  }

  return {
    name: "scorpion_theme",
    onEnable(ctx) {
      // Delay build a tiny bit so room module definitely exists
      build(ctx);
      setTimeout(() => build(ctx), 50);
      setTimeout(() => build(ctx), 250);
    },
  };
}
