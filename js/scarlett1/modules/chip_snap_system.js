// /js/scarlett1/modules/chip_snap_system.js — Update 4.2
// Snaps dropped chips into:
// - nearest bet zone segment
// - or nearest seat chipZone
// Also auto-stacks chips into neat piles.

export class ChipSnapSystem {
  constructor({ THREE, scene }) {
    this.THREE = THREE;
    this.scene = scene;

    this._lastScan = 0;
    this._tmp = new THREE.Vector3();
  }

  async init({ world }) {
    world.poker = world.poker || {};
    world.poker.chipSnap = this;
  }

  update({ dt, world }) {
    this._lastScan += dt;
    if (this._lastScan < 0.25) return;
    this._lastScan = 0;

    const chipsSys = world?.poker?.chips;
    const table = world?.poker?.table;
    const zonesSys = world?.poker?.betZones;

    if (!chipsSys?.chips?.length || !table) return;

    // Build “snap targets”
    const targets = [];

    // seat chip zones
    for (const s of table.anchors.seats) {
      targets.push({ pos: s.chipZone, type: "seat", seatIndex: s.i });
    }

    // bet zones center points (roughly)
    if (zonesSys?.zones?.length) {
      for (const z of zonesSys.zones) {
        const ang = (z.userData.zoneIndex / zonesSys.zones.length) * Math.PI * 2 + (Math.PI / zonesSys.zones.length);
        const r = Math.max(table.cfg.radiusX, table.cfg.radiusZ) * 0.88;
        const p = new this.THREE.Vector3(Math.cos(ang) * r, table.cfg.tableY + 0.05, Math.sin(ang) * r);
        targets.push({ pos: p, type: "bet", zoneIndex: z.userData.zoneIndex });
      }
    }

    // For each chip not held: snap + stack
    for (const c of chipsSys.chips) {
      if (!c || c.userData.held) continue;

      // Only snap chips that are near table height (prevents messing with lobby chips later)
      if (c.position.y < table.cfg.tableY - 0.05 || c.position.y > table.cfg.tableY + 0.25) continue;

      const nearest = this._nearestTarget(c.position, targets, 0.55);
      if (nearest) {
        this._snapAndStack(c, nearest, chipsSys.chips, table.cfg.tableY);
      }
    }
  }

  _nearestTarget(pos, targets, r) {
    let best = null, bestD = 1e9;
    for (const t of targets) {
      const d = pos.distanceTo(t.pos);
      if (d < r && d < bestD) { bestD = d; best = t; }
    }
    return best;
  }

  _snapAndStack(chip, target, allChips, tableY) {
    // stack within small radius of target center
    const stackRadius = 0.12;

    // find existing chips near the same target point
    let count = 0;
    for (const c of allChips) {
      if (!c || c === chip || c.userData.held) continue;
      if (c.position.distanceTo(target.pos) < stackRadius) count++;
    }

    const h = 0.012; // chip thickness
    chip.position.x = target.pos.x;
    chip.position.z = target.pos.z;
    chip.position.y = tableY + 0.06 + count * (h + 0.001);

    chip.userData.snapType = target.type;
    if (target.type === "bet") chip.userData.zoneIndex = target.zoneIndex;
    if (target.type === "seat") chip.userData.seatIndex = target.seatIndex;
  }
}
