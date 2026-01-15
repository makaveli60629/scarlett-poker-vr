// /js/scarlett1/modules/bet_zones_system.js — Update 4.2
// Adds legal bet zones ("pass line" style) around the table as ring segments.
// Chips can snap to these zones via ChipSnapSystem.

export class BetZonesSystem {
  constructor({ THREE, scene }) {
    this.THREE = THREE;
    this.scene = scene;

    this.group = new THREE.Group();
    this.group.name = "BetZonesSystem";

    this.zones = []; // meshes
  }

  async init({ world }) {
    this.scene.add(this.group);

    const table = world?.poker?.table;
    if (!table?.cfg) return;

    const ringR1 = Math.max(table.cfg.radiusX, table.cfg.radiusZ) * 0.78;
    const ringR2 = ringR1 + 0.22;

    const matBase = new this.THREE.MeshStandardMaterial({
      color: 0x08150d,
      emissive: 0x33ff66,
      emissiveIntensity: 0.35,
      roughness: 0.75,
      metalness: 0.1,
      transparent: true,
      opacity: 0.55
    });

    const matHot = new this.THREE.MeshStandardMaterial({
      color: 0x06202a,
      emissive: 0x00e5ff,
      emissiveIntensity: 0.55,
      roughness: 0.75,
      metalness: 0.12,
      transparent: true,
      opacity: 0.7
    });

    // Build 8 segments (matches 8 seats)
    const segments = 8;
    const segArc = (Math.PI * 2) / segments;

    for (let i = 0; i < segments; i++) {
      const a0 = i * segArc + segArc * 0.12;
      const a1 = (i + 1) * segArc - segArc * 0.12;

      const geo = new this.THREE.RingGeometry(ringR1, ringR2, 40, 1, a0, a1 - a0);
      const m = new this.THREE.Mesh(geo, matBase);
      m.rotation.x = -Math.PI / 2;
      m.position.set(0, table.cfg.tableY + 0.035, 0);
      m.userData.betZone = true;
      m.userData.zoneIndex = i;
      m.userData.hotMat = matHot;
      m.userData.baseMat = matBase;

      this.group.add(m);
      this.zones.push(m);
    }

    world.poker = world.poker || {};
    world.poker.betZones = this;
  }

  setHotZone(i) {
    for (const z of this.zones) {
      z.material = (z.userData.zoneIndex === i) ? z.userData.hotMat : z.userData.baseMat;
    }
  }

  update({ world }) {
    // Hot zone = current turn seat index if desired
    const t = world?.poker?.turnUI?.turnIndex ?? 0;
    this.setHotZone(t % this.zones.length);
  }
}
