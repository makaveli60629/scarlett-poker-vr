import * as THREE from "three";

function safeTexture(url) {
  const loader = new THREE.TextureLoader();
  try {
    const tex = loader.load(
      url,
      (t) => {
        t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
        t.colorSpace = THREE.SRGBColorSpace;
      },
      undefined,
      () => {}
    );
    return tex;
  } catch {
    return null;
  }
}

function makeMaterialWithFallback(texturePath, fallbackColor, opts = {}) {
  const tex = texturePath ? safeTexture(texturePath) : null;
  const mat = new THREE.MeshStandardMaterial({
    color: tex ? 0xffffff : fallbackColor,
    map: tex || null,
    roughness: opts.roughness ?? 0.9,
    metalness: opts.metalness ?? 0.05,
  });
  return mat;
}

/**
 * Named export expected by main.js:
 *   import { PokerTable } from "./table.js";
 */
export const PokerTable = {
  colliders: [],
  tableMesh: null,
  tableTopY: 0.78,      // height of tabletop
  noTeleportRadius: 2.2, // keep teleport away from center

  build(scene) {
    this.colliders = [];

    // --- Table group
    const g = new THREE.Group();
    g.name = "PokerTableGroup";
    g.position.set(0, 0, 0);

    // --- Oval table top (nice & smooth)
    const topGeo = new THREE.CylinderGeometry(2.1, 2.1, 0.14, 64);
    const feltMat = makeMaterialWithFallback(
      "assets/textures/table_felt_green.jpg",
      0x1b6b3a,
      { roughness: 0.95, metalness: 0.02 }
    );
    const top = new THREE.Mesh(topGeo, feltMat);
    top.name = "TableTop";
    top.position.set(0, this.tableTopY, 0);
    top.scale.set(1.35, 1, 1.0); // makes it an oval
    top.castShadow = true;
    top.receiveShadow = true;
    g.add(top);

    // --- Trim ring
    const ringGeo = new THREE.TorusGeometry(2.08, 0.08, 18, 84);
    const trimMat = makeMaterialWithFallback(
      "assets/textures/Table_leather_trim.jpg",
      0x1a1410,
      { roughness: 0.65, metalness: 0.08 }
    );
    const ring = new THREE.Mesh(ringGeo, trimMat);
    ring.name = "TableTrim";
    ring.position.set(0, this.tableTopY + 0.02, 0);
    ring.scale.set(1.35, 1.0, 1.0);
    ring.rotation.x = Math.PI / 2;
    ring.castShadow = true;
    ring.receiveShadow = true;
    g.add(ring);

    // --- Base pedestal
    const baseGeo = new THREE.CylinderGeometry(0.65, 0.95, 0.75, 40);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.9,
      metalness: 0.05,
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.name = "TableBase";
    base.position.set(0, 0.38, 0);
    base.castShadow = true;
    base.receiveShadow = true;
    g.add(base);

    // --- Collision volume (so you don't walk through)
    // big invisible collider box around table
    const colGeo = new THREE.BoxGeometry(4.5, 1.2, 3.8);
    const colMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0 });
    const collider = new THREE.Mesh(colGeo, colMat);
    collider.name = "TableCollider";
    collider.position.set(0, 0.6, 0);
    g.add(collider);
    this.colliders.push(collider);

    // --- Seat markers (6 players, not 8)
    // (later you can attach chairs exactly here)
    const seatY = this.tableTopY;
    const seatR = 2.5;
    const seatAngles = [
      0, Math.PI / 3, (2 * Math.PI) / 3,
      Math.PI, (4 * Math.PI) / 3, (5 * Math.PI) / 3
    ];

    const seatDots = new THREE.Group();
    seatDots.name = "SeatMarkers";

    const dotGeo = new THREE.CircleGeometry(0.14, 24);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18 });
    for (let i = 0; i < seatAngles.length; i++) {
      const a = seatAngles[i];
      const d = new THREE.Mesh(dotGeo, dotMat);
      d.name = `Seat_${i}`;
      d.rotation.x = -Math.PI / 2;
      d.position.set(Math.cos(a) * seatR, seatY + 0.01, Math.sin(a) * seatR);
      seatDots.add(d);
    }
    g.add(seatDots);

    scene.add(g);
    this.tableMesh = g;

    return this;
  },

  // Prevent teleport landing in table center area
  isPointInNoTeleportZone(p) {
    const dx = p.x - (this.tableMesh?.position.x || 0);
    const dz = p.z - (this.tableMesh?.position.z || 0);
    const d = Math.sqrt(dx * dx + dz * dz);
    return d < this.noTeleportRadius;
  },

  update() {
    // placeholder for later (cards hover, winner reveal, etc.)
  }
};
