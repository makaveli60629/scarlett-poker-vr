// /js/lights_pack.js — Scarlett VR Poker (Compat Build)
// Accepts build(ctx) OR build(scene) OR build(THREE, scene)

function _ctxScene(a, b){
  if (a && a.scene && typeof a.scene.add === "function") return a.scene; // ctx
  if (a && typeof a.add === "function") return a; // scene
  if (b && typeof b.add === "function") return b; // (THREE, scene)
  return null;
}
function _ctxTHREE(a, b){
  if (a && a.THREE) return a.THREE;      // ctx
  if (a && a.Scene) return a;           // THREE-ish
  if (b && b.Scene) return b;
  return a; // (THREE, scene) -> a is THREE
}

export const LightsPack = {
  build(a, b){
    const scene = _ctxScene(a, b);
    const THREE = _ctxTHREE(a, b);

    if (!scene) throw new Error("LightsPack.build: scene not found (expected ctx.scene or scene)");
    if (!THREE) throw new Error("LightsPack.build: THREE not found");

    // Prevent double-build
    if (scene.userData.__lights_pack_built) return;
    scene.userData.__lights_pack_built = true;

    // Soft ambient
    const amb = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(amb);

    // Main directional
    const key = new THREE.DirectionalLight(0xffffff, 1.0);
    key.position.set(8, 12, 6);
    key.castShadow = false;
    scene.add(key);

    // Fill
    const fill = new THREE.DirectionalLight(0xffffff, 0.45);
    fill.position.set(-10, 7, -8);
    scene.add(fill);

    // Rim
    const rim = new THREE.DirectionalLight(0x7fe7ff, 0.35);
    rim.position.set(0, 10, -14);
    scene.add(rim);

    // A few neon point lights to help show the world
    const p1 = new THREE.PointLight(0xff2d7a, 1.25, 22);
    p1.position.set(6, 2.4, 3);
    scene.add(p1);

    const p2 = new THREE.PointLight(0x7fe7ff, 1.25, 22);
    p2.position.set(-6, 2.4, -3);
    scene.add(p2);
  }
};
