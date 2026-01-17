// js/modules/environmentLighting.module.js
// BUILD: ENV_LIGHTING_FULL_v1
// Purpose: robust lighting that works with ctx OR legacy app objects.

export default {
  name: "environmentLighting",
  init(input = {}, maybeApp) {
    const ctx = normalize(input, maybeApp);
    const { THREE, scene, room, debug } = ctx;

    // Fog for depth (subtle)
    try {
      if (scene && !scene.fog) scene.fog = new THREE.Fog(0x070a10, 10, 120);
    } catch {}

    // Key rigs
    const lights = [];
    function add(light) {
      if (!light || !scene) return;
      scene.add(light);
      lights.push(light);
    }

    // Neutral base
    add(new THREE.AmbientLight(0xffffff, 0.28));
    const hemi = new THREE.HemisphereLight(0xffffff, 0x1b2a3a, 0.85);
    hemi.position.set(0, 12, 0);
    add(hemi);

    // Directional keys
    const key = new THREE.DirectionalLight(0xffffff, 0.95);
    key.position.set(10, 16, 8);
    key.castShadow = false;
    add(key);

    const fill = new THREE.DirectionalLight(0xffffff, 0.45);
    fill.position.set(-10, 10, -8);
    add(fill);

    // Accent neon-ish points near anchors if present
    const anchors = room?.anchors || room?.anchor || {};
    const pts = [
      { k: "table", c: 0x66ffcc, i: 0.35, d: 18, y: 5 },
      { k: "storeZone", c: 0x66ffcc, i: 0.35, d: 18, y: 5 },
      { k: "barZone", c: 0xff66cc, i: 0.28, d: 18, y: 5 },
      { k: "slotsZone", c: 0x00ff88, i: 0.25, d: 18, y: 5 },
      { k: "vipZone", c: 0xffd166, i: 0.25, d: 18, y: 5 },
    ];
    for (const p of pts) {
      const obj = anchors?.[p.k];
      if (!obj) continue;
      const L = new THREE.PointLight(p.c, p.i, p.d);
      L.position.copy(obj.position);
      L.position.y += p.y;
      add(L);
    }

    debug?.log?.("environmentLighting init ✅");

    return {
      name: "environmentLighting",
      dispose() {
        for (const l of lights) {
          try { l.parent?.remove(l); } catch {}
        }
      },
    };
  },
};

function normalize(input, maybeApp) {
  // Supports: init(ctx), init(app), init(ctx, app)
  const ctx = input?.THREE ? input : null;
  const app = (ctx?.app || maybeApp || input?.app || input) || {};
  return {
    THREE: ctx?.THREE || app?.THREE || globalThis.THREE,
    scene: ctx?.scene || app?.scene || globalThis.scene,
    room: ctx?.room || app?.room || globalThis.room,
    ui: ctx?.ui || app?.ui || globalThis.ui,
    debug: ctx?.debug || app?.debug || globalThis.debug,
  };
}
