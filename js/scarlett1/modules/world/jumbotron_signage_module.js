// /js/scarlett1/modules/world/jumbotrons_module.js
// JUMBOTRONS + EVENT BANNERS (FULL) — ROOT PATCHED

export function createJumbotronsModule({
  targetRoomIndex = 0,

  jumboRadius = 6.4,
  jumboY = 2.45,
  jumboW = 3.6,
  jumboH = 2.0,
  jumboDepth = 0.18,

  bannerRadius = 6.85,
  bannerY = 3.15,
  bannerCount = 8,
  bannerW = 2.2,
  bannerH = 0.55,
  bannerSpin = 0.28,
} = {}) {
  let built = false;
  let bannerGroup = null;

  function getRoomGroup(ctx) {
    const r = ctx.rooms?.get?.(targetRoomIndex);
    return r?.group || ctx.scene;
  }

  function matFrame(ctx) {
    return new ctx.THREE.MeshStandardMaterial({
      color: 0x101020,
      roughness: 0.55,
      metalness: 0.18,
      emissive: new ctx.THREE.Color(0x112244),
      emissiveIntensity: 0.25,
    });
  }
  function matScreen(ctx, emissiveHex = 0x33ffff) {
    return new ctx.THREE.MeshStandardMaterial({
      color: 0x0a0a10,
      roughness: 0.85,
      metalness: 0.05,
      emissive: new ctx.THREE.Color(emissiveHex),
      emissiveIntensity: 0.85,
    });
  }

  function buildJumbo(ctx, parent, angle, screenEmissive) {
    const THREE = ctx.THREE;
    const g = new THREE.Group();
    g.name = "Jumbotron";

    const x = Math.cos(angle) * jumboRadius;
    const z = Math.sin(angle) * jumboRadius;

    g.position.set(x, jumboY, z);
    g.lookAt(0, jumboY, 0);

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(jumboW, jumboH, jumboDepth),
      matFrame(ctx)
    );
    g.add(frame);

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(jumboW * 0.88, jumboH * 0.80),
      matScreen(ctx, screenEmissive)
    );
    screen.position.z = jumboDepth * 0.51;
    g.add(screen);

    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(jumboW * 0.9, 0.08, 0.06),
      matScreen(ctx, 0xff66ff)
    );
    strip.position.set(0, jumboH * 0.5 - 0.04, jumboDepth * 0.51);
    g.add(strip);

    parent.add(g);
  }

  function buildBannerRing(ctx, parent) {
    const THREE = ctx.THREE;
    bannerGroup = new THREE.Group();
    bannerGroup.name = "EventBannerRing";
    bannerGroup.position.y = bannerY;
    parent.add(bannerGroup);

    const colors = [0x33ffff, 0xff66ff, 0x66aaff, 0xffcc33];

    for (let i = 0; i < bannerCount; i++) {
      const t = (i / bannerCount) * Math.PI * 2;
      const x = Math.cos(t) * bannerRadius;
      const z = Math.sin(t) * bannerRadius;

      const banner = new THREE.Mesh(
        new THREE.PlaneGeometry(bannerW, bannerH),
        matScreen(ctx, colors[i % colors.length])
      );
      banner.position.set(x, 0, z);
      banner.lookAt(0, 0, 0);
      bannerGroup.add(banner);

      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(bannerW, 0.05, 0.06),
        matFrame(ctx)
      );
      bar.position.set(x, -bannerH * 0.55, z);
      bar.lookAt(0, 0, 0);
      bannerGroup.add(bar);
    }
  }

  function rootExists(ctx) {
    let found = false;
    ctx.scene.traverse(o => { if (o.name === "jumbotrons_ROOT") found = true; });
    return found;
  }

  return {
    name: "jumbotrons",

    onEnable(ctx) {
      if (built) return;
      built = true;

      const THREE = ctx.THREE;
      const room = getRoomGroup(ctx);

      const root = new THREE.Group();
      root.name = "jumbotrons_ROOT";
      room.add(root);

      buildJumbo(ctx, root, 0, 0x33ffff);
      buildJumbo(ctx, root, Math.PI * 0.5, 0x66aaff);
      buildJumbo(ctx, root, Math.PI, 0xff66ff);
      buildJumbo(ctx, root, Math.PI * 1.5, 0xffcc33);

      buildBannerRing(ctx, root);

      console.log("[jumbotrons] built ✅");
    },

    update(ctx, { dt }) {
      if (!rootExists(ctx)) return; // toggled OFF
      if (!bannerGroup) return;
      bannerGroup.rotation.y += dt * bannerSpin;
    }
  };
}
