// /js/water_fountain.js — Scarlett VR Poker (Compat Build)
// Accepts build(ctx) OR build(scene) OR build(THREE, scene)

function _ctxScene(a, b){
  if (a && a.scene && typeof a.scene.add === "function") return a.scene;
  if (a && typeof a.add === "function") return a;
  if (b && typeof b.add === "function") return b;
  return null;
}
function _ctxTHREE(a, b){
  if (a && a.THREE) return a.THREE;
  return a; // (THREE, scene)
}

export const WaterFountain = {
  build(a, b){
    const scene = _ctxScene(a, b);
    const THREE = _ctxTHREE(a, b);

    if (!scene) throw new Error("WaterFountain.build: scene not found");
    if (!THREE) throw new Error("WaterFountain.build: THREE not found");

    if (scene.userData.__water_fountain_built) return;
    scene.userData.__water_fountain_built = true;

    // Simple fountain object (visual placeholder that proves build works)
    const group = new THREE.Group();
    group.name = "water_fountain";
    group.position.set(-8, 0, -8);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 1.1, 0.35, 32),
      new THREE.MeshStandardMaterial({ color: 0x20263d, roughness: 0.85, metalness: 0.1 })
    );
    base.position.y = 0.18;
    group.add(base);

    const bowl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 0.95, 0.22, 32),
      new THREE.MeshStandardMaterial({ color: 0x2a3252, roughness: 0.75, metalness: 0.12 })
    );
    bowl.position.y = 0.42;
    group.add(bowl);

    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(0.72, 0.72, 0.06, 24),
      new THREE.MeshStandardMaterial({ color: 0x3ad6ff, roughness: 0.15, metalness: 0.0, transparent:true, opacity:0.65 })
    );
    water.position.y = 0.52;
    group.add(water);

    const jet = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.6, 16),
      new THREE.MeshStandardMaterial({ color: 0x7fe7ff, roughness: 0.2, metalness: 0.0, transparent:true, opacity:0.55 })
    );
    jet.position.y = 0.85;
    group.add(jet);

    const glow = new THREE.PointLight(0x7fe7ff, 0.8, 6);
    glow.position.set(0, 1.0, 0);
    group.add(glow);

    scene.add(group);
  }
};
