import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

function chipMat(url, fallback) {
  const m = new THREE.MeshStandardMaterial({ color: fallback, roughness: 0.7, metalness: 0.05 });
  try {
    const t = new THREE.TextureLoader().load(url, (tx) => {
      tx.colorSpace = THREE.SRGBColorSpace;
    });
    m.map = t;
    m.color.set(0xffffff);
  } catch {}
  return m;
}

export const EventChips = {
  init(ctx) {
    this.ctx = ctx;
    this.chips = [];
    this.vel = new Map();

    ctx.api = ctx.api || {};
    ctx.api.eventChips = this;

    // public spawn callable from UI
    this.spawnChips = (ctx2) => this.spawn(ctx2 || ctx);

    return this;
  },

  spawn(ctx) {
    const TEX = "assets/textures/";
    const types = [
      { file: "chip_1000.jpg", color: 0x44ccff },
      { file: "chip_5000.jpg", color: 0xff44cc },
      { file: "chip_10000.jpg", color: 0x00ff99 },
    ];

    // Spawn near player in current room
    const rig = ctx.rig;
    const pos = rig.position.clone();
    pos.y = 1.2;

    for (let i = 0; i < 10; i++) {
      const t = types[i % types.length];
      const chip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.02, 24),
        chipMat(`${TEX}${t.file}`, t.color)
      );
      chip.castShadow = true;
      chip.receiveShadow = true;

      chip.position.set(
        pos.x + (Math.random() - 0.5) * 0.6,
        pos.y + Math.random() * 0.3,
        pos.z + (Math.random() - 0.5) * 0.6
      );

      ctx.scene.add(chip);
      this.chips.push(chip);
      this.vel.set(chip.uuid, new THREE.Vector3((Math.random()-0.5)*0.2, 0, (Math.random()-0.5)*0.2));
    }
  },

  update(dt, ctx) {
    const floors = ctx.floorPlanes || [];
    if (!floors.length) return;

    // Find nearest floor height (all your floors are y=0 anyway)
    const floorY = 0.02;

    for (const chip of this.chips) {
      const v = this.vel.get(chip.uuid) || new THREE.Vector3();
      v.y -= 3.5 * dt; // gravity

      chip.position.addScaledVector(v, dt);

      // collide with floor
      if (chip.position.y <= floorY) {
        chip.position.y = floorY;
        v.y = 0;
        // friction
        v.x *= 0.92;
        v.z *= 0.92;

        // settle
        if (Math.abs(v.x) + Math.abs(v.z) < 0.02) {
          v.x = v.z = 0;
        }
      }

      this.vel.set(chip.uuid, v);
    }
  },
};

export default EventChips;
