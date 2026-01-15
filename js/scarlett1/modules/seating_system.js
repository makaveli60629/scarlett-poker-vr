// /js/scarlett1/modules/seating_system.js — Update 4.2
// Pinch interaction on seat pads:
// - pinch a seat "sit pad" => rig snaps to seated position
// - pinch again while seated => stand back to lobby position
// Also informs TurnUI (active seat highlight) and HandBoxes.

export class SeatingSystem {
  constructor({ THREE, scene }) {
    this.THREE = THREE;
    this.scene = scene;

    this.group = new THREE.Group();
    this.group.name = "SeatingSystem";

    this.sitPads = []; // meshes
    this.isSeated = false;
    this.seatIndex = 0;

    this._handMod = null;
    this._tmpV = new THREE.Vector3();
  }

  async init({ world }) {
    this.scene.add(this.group);

    const table = world?.poker?.table;
    if (!table?.anchors?.seats?.length) return;

    // Build invisible-but-visible pads at each seat
    const padMat = new this.THREE.MeshStandardMaterial({
      color: 0x061a22,
      emissive: 0x00e5ff,
      emissiveIntensity: 0.55,
      roughness: 0.7,
      metalness: 0.15,
      transparent: true,
      opacity: 0.55
    });

    const geo = new this.THREE.CylinderGeometry(0.32, 0.32, 0.06, 22);

    for (const s of table.anchors.seats) {
      const pad = new this.THREE.Mesh(geo, padMat);
      pad.name = `SIT_PAD_${s.i}`;
      pad.position.set(s.seat.x, 0.03, s.seat.z);
      pad.userData.sitPad = true;
      pad.userData.seatIndex = s.i;
      this.group.add(pad);
      this.sitPads.push(pad);
    }

    // Subscribe pinch
    this._handMod = world.bus.mods.find(m => m?.constructor?.name === "HandInput");
    if (this._handMod?.addPinchListener) {
      this._handMod.addPinchListener((e) => this.onPinch(e, world));
    }

    world.poker = world.poker || {};
    world.poker.seating = this;

    // Standing position fallback
    this._standPos = world.rig.position.clone();
    this._standYaw = world.rig.rotation.y;
  }

  onPinch(e, world) {
    // If seated => pinch anywhere to stand (comfort)
    if (this.isSeated) {
      this.stand(world);
      return;
    }

    // Not seated: pinch near a sit pad
    const hit = this._nearestPad(e.jointPos, 0.25);
    if (!hit) return;

    const seatIndex = hit.userData.seatIndex ?? 0;
    this.sit(world, seatIndex);
  }

  sit(world, seatIndex) {
    const table = world?.poker?.table;
    const seat = table?.anchors?.seats?.[seatIndex];
    if (!seat) return;

    // Save standing pose if first sit
    this._standPos = world.rig.position.clone();
    this._standYaw = world.rig.rotation.y;

    // Rig seated: place just behind seat point, face table center
    const back = seat.seat.clone();
    const dirToCenter = new this.THREE.Vector3(-seat.seat.x, 0, -seat.seat.z).normalize();
    back.add(dirToCenter.multiplyScalar(0.65)); // push toward center to sit closer

    world.rig.position.set(back.x, world.rig.position.y, back.z);

    const yaw = Math.atan2(-back.x, -back.z);
    world.rig.rotation.y = yaw;

    this.isSeated = true;
    this.seatIndex = seatIndex;

    // Inform Turn UI and HandBoxes
    if (world?.poker?.turnUI?.setActiveSeat) world.poker.turnUI.setActiveSeat(seatIndex);
    if (world?.poker?.handBoxes?.setSeat) world.poker.handBoxes.setSeat(seatIndex);

    if (world?.poker?.turnUI?._draw) world.poker.turnUI._draw(world);
  }

  stand(world) {
    world.rig.position.copy(this._standPos);
    world.rig.rotation.y = this._standYaw;

    this.isSeated = false;

    if (world?.poker?.turnUI?.setActiveSeat) world.poker.turnUI.setActiveSeat(null);
    if (world?.poker?.handBoxes?.setSeat) world.poker.handBoxes.setSeat(null);

    if (world?.poker?.turnUI?._draw) world.poker.turnUI._draw(world);
  }

  _nearestPad(pos, r) {
    let best = null;
    let bestD = 1e9;
    for (const p of this.sitPads) {
      const d = p.position.distanceTo(pos);
      if (d < r && d < bestD) { bestD = d; best = p; }
    }
    return best;
  }

  update() {}
}
