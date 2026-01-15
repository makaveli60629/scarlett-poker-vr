// /js/scarlett1/modules/bots.js — Scarlett Bots v1 (SAFE)
// Drop-in module: adds moving bots in the lobby.
// Usage: Bots.install({ THREE, DIAG, WORLD })

export const Bots = (() => {
  function install({ THREE, DIAG, WORLD }) {
    const D = DIAG || console;
    const W = WORLD || window.__SCARLETT1__;
    if (!W?.scene || !W?.addFrameHook) {
      D.warn("[bots] WORLD missing scene/addFrameHook");
      return;
    }

    const scene = W.scene;

    const botMat = new THREE.MeshStandardMaterial({
      color: 0x0c1222,
      roughness: 0.9,
      metalness: 0.05,
      emissive: 0x0b1a33,
      emissiveIntensity: 0.25
    });

    function makeBot() {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.5, 6, 12), botMat);
      body.position.set(0, 0.65, 0);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), botMat);
      head.position.set(0, 0.98, 0.02);
      g.add(body, head);

      // little glow badge
      const badge = new THREE.Mesh(
        new THREE.CircleGeometry(0.06, 18),
        new THREE.MeshBasicMaterial({ color: 0x2f6bff, transparent: true, opacity: 0.7 })
      );
      badge.position.set(0, 0.78, 0.18);
      g.add(badge);

      g.userData = {
        a: Math.random() * Math.PI * 2,
        r: 12 + Math.random() * 6,
        spd: 0.15 + Math.random() * 0.25,
        wob: Math.random() * Math.PI * 2,
        pause: 0
      };
      return g;
    }

    const bots = [];
    const BOT_COUNT = 6;
    for (let i = 0; i < BOT_COUNT; i++) {
      const b = makeBot();
      scene.add(b);
      bots.push(b);
    }

    W.addFrameHook(({ dt, t }) => {
      for (const b of bots) {
        const u = b.userData;
        if (u.pause > 0) {
          u.pause -= dt;
          b.position.y = 0.02 * Math.sin(t * 2 + u.wob);
          continue;
        }

        u.a += u.spd * dt;

        // Walk the lobby ring
        b.position.x = Math.cos(u.a) * u.r;
        b.position.z = Math.sin(u.a) * u.r;
        b.position.y = 0.02 * Math.sin(t * 2 + u.wob);

        // Face direction of travel
        b.rotation.y = -u.a + Math.PI / 2;

        // Occasionally pause near pit for "watching"
        if (Math.random() < 0.004 * dt) u.pause = 0.8 + Math.random() * 1.2;
      }
    });

    D.log("[bots] installed ✅", { count: BOT_COUNT });
  }

  return { install };
})();
