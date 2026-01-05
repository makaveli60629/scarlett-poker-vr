// js/furniture_pack.js — Plants + couches + lounge chairs + decor props (GitHub-safe)
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { TextureBank } from "./textures.js";
import { registerCollider } from "./state.js";

function makePlant() {
  const g = new THREE.Group();
  g.name = "Plant";

  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.22, 0.22, 16),
    new THREE.MeshStandardMaterial({ color: 0x2a1b12, roughness: 0.9 })
  );
  pot.position.y = 0.11;

  const soil = new THREE.Mesh(
    new THREE.CylinderGeometry(0.165, 0.195, 0.05, 16),
    new THREE.MeshStandardMaterial({ color: 0x15110c, roughness: 1.0 })
  );
  soil.position.y = 0.22;

  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x1c6b3a,
    roughness: 0.85,
    emissive: 0x001a0d,
    emissiveIntensity: 0.18
  });

  for (let i = 0; i < 9; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.45, 10), leafMat);
    const a = (i / 9) * Math.PI * 2;
    leaf.position.set(Math.sin(a) * 0.09, 0.42, Math.cos(a) * 0.09);
    leaf.rotation.y = a;
    leaf.rotation.x = -0.35;
    g.add(leaf);
  }

  g.add(pot, soil);
  return g;
}

function makeCouch() {
  const g = new THREE.Group();
  g.name = "Couch";

  const fabric = TextureBank.matFromTexture("sofa.jpg", 0x4a4a4a, { roughness: 0.95, repeatX: 2, repeatY: 2 });
  const frame = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });

  const seat = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.28, 0.85), fabric);
  seat.position.y = 0.35;

  const back = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.55, 0.22), fabric);
  back.position.set(0, 0.68, -0.315);

  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.45, 0.85), fabric);
  armL.position.set(-0.95, 0.50, 0);

  const armR = armL.clone();
  armR.position.x = 0.95;

  const base = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.12, 0.87), frame);
  base.position.y = 0.18;

  g.add(seat, back, armL, armR, base);
  return g;
}

function makeLoungeChair() {
  const g = new THREE.Group();
  g.name = "LoungeChair";

  const fabric = TextureBank.matFromTexture("chair.jpg", 0x6b6b6b, { roughness: 0.95, repeatX: 2, repeatY: 2 });
  const frame = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.22, 0.72), fabric);
  seat.position.y = 0.30;

  const back = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.45, 0.16), fabric);
  back.position.set(0, 0.55, -0.28);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.12, 16), frame);
  base.position.y = 0.12;

  g.add(seat, back, base);
  return g;
}

function makeWallFrame() {
  const g = new THREE.Group();
  g.name = "WallFrame";

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(1.05, 0.65, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 0.85, emissive: 0x001015, emissiveIntensity: 0.35 })
  );

  const glow = new THREE.Mesh(
    new THREE.BoxGeometry(1.12, 0.72, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x00ffaa, emissive: 0x00ffaa, emissiveIntensity: 1.1, roughness: 0.35, transparent: true, opacity: 0.25 })
  );
  glow.position.z = -0.02;

  g.add(frame, glow);
  return g;
}

export const FurniturePack = {
  group: null,

  build(scene) {
    this.group = new THREE.Group();
    this.group.name = "FurniturePack";

    // IMPORTANT: keep spawn lane clear (spawn around z~6)
    // We'll place furniture along the sides and back.

    // Rugs (placeholder plane; texture optional)
    const rug = new THREE.Mesh(
      new THREE.PlaneGeometry(6.8, 4.6),
      TextureBank.matFromTexture("lobby_carpet.jpg", 0x1b1f2a, { roughness: 1.0, repeatX: 2, repeatY: 2 })
    );
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0, 0.01, 1.2);
    this.group.add(rug);

    // Lounge area left
    const couchL = makeCouch();
    couchL.position.set(-9.5, 0, 3.0);
    couchL.rotation.y = Math.PI / 2;
    this.group.add(couchL);
    try { registerCollider(couchL); } catch {}

    const chairL1 = makeLoungeChair();
    chairL1.position.set(-7.6, 0, 1.8);
    chairL1.rotation.y = Math.PI / 1.7;
    this.group.add(chairL1);

    const chairL2 = makeLoungeChair();
    chairL2.position.set(-7.5, 0, 4.3);
    chairL2.rotation.y = -Math.PI / 1.7;
    this.group.add(chairL2);

    // Lounge area right
    const couchR = makeCouch();
    couchR.position.set(9.5, 0, 3.0);
    couchR.rotation.y = -Math.PI / 2;
    this.group.add(couchR);

    const chairR1 = makeLoungeChair();
    chairR1.position.set(7.6, 0, 1.8);
    chairR1.rotation.y = -Math.PI / 1.7;
    this.group.add(chairR1);

    const chairR2 = makeLoungeChair();
    chairR2.position.set(7.5, 0, 4.3);
    chairR2.rotation.y = Math.PI / 1.7;
    this.group.add(chairR2);

    // Plants (corners + near lounge, not in spawn lane)
    const plantPositions = [
      [-12.5, 0, 9.8], [12.5, 0, 9.8],
      [-12.5, 0, -12.5], [12.5, 0, -12.5],
      [-9.5, 0, 6.6], [9.5, 0, 6.6],
      [-6.2, 0, 9.8], [6.2, 0, 9.8],
    ];
    for (const [x, y, z] of plantPositions) {
      const p = makePlant();
      p.position.set(x, y, z);
      this.group.add(p);
    }

    // Wall frames w/ glow
    const frames = [
      { x: -12.2, y: 1.9, z: 2.2, ry: Math.PI / 2 },
      { x:  12.2, y: 1.9, z: 2.2, ry: -Math.PI / 2 },
      { x: -12.2, y: 1.9, z: -2.2, ry: Math.PI / 2 },
      { x:  12.2, y: 1.9, z: -2.2, ry: -Math.PI / 2 },
    ];
    for (const f of frames) {
      const fr = makeWallFrame();
      fr.position.set(f.x, f.y, f.z);
      fr.rotation.y = f.ry;
      this.group.add(fr);
    }

    scene.add(this.group);
    return this.group;
  }
};
