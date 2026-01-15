// /js/scarlett1/modules/chips_system.js
// Pinch interaction:
// - Pinch near chip stack => pick up (hold)
// - Pinch again => drop to reticle hit (table center ray) or near hand
// Quest-safe: simple meshes, no physics.

export class ChipsSystem {
  constructor({ THREE, scene }) {
    this.THREE = THREE;
    this.scene = scene;

    this.group = new THREE.Group();
    this.group.name = "ChipsSystem";

    this.chips = []; // interactable chips (meshes)
    this.held = { left: null, right: null };

    this._ray = new THREE.Raycaster();
    this._tmpV = new THREE.Vector3();

    this._handMod = null;
  }

  async init({ world }) {
    this.scene.add(this.group);

    const table = world?.poker?.table;
    if (!table) return;

    // Create stacks at each seat
    const matA = new this.THREE.MeshStandardMaterial({ color: 0x2040ff, roughness: 0.45, metalness: 0.25 });
    const matB = new this.THREE.MeshStandardMaterial({ color: 0xff2bd6, roughness: 0.45, metalness: 0.25 });
    const matC = new this.THREE.MeshStandardMaterial({ color: 0x33ff66, roughness: 0.45, metalness: 0.25 });

    const chipGeo = new this.THREE.CylinderGeometry(0.045, 0.045, 0.012, 18);

    const addChip = (pos, mat) => {
      const c = new this.THREE.Mesh(chipGeo, mat);
      c.position.copy(pos);
      c.userData.isChip = true;
      this.group.add(c);
      this.chips.push(c);
      return c;
    };

    for (const s of table.anchors.seats) {
      for (let k = 0; k < 10; k++) {
        const p = s.chipZone.clone();
        p.y += k * 0.013;
        addChip(p, (k % 3 === 0) ? matA : (k % 3 === 1) ? matB : matC);
      }
    }

    // Subscribe to pinch
    this._handMod = world.bus.mods.find(m => m?.constructor?.name === "HandInput");
    if (this._handMod?.addPinchListener) {
      this._handMod.addPinchListener((e) => this.onPinch(e, world));
    }

    world.poker = world.poker || {};
    world.poker.chips = this;
  }

  onPinch(e, world) {
    const hand = e.handedness || "right";

    // If holding, drop
    if (this.held[hand]) {
      this._drop(hand, world);
      return;
    }

    // Try pick up near fingertip
    const pick = this._findNearestChip(e.jointPos, 0.12);
    if (pick) {
      this._pick(hand, pick);
    }
  }

  _pick(hand, chip) {
    this.held[hand] = chip;
    chip.userData.held = hand;
  }

  _drop(hand, world) {
    const chip = this.held[hand];
    if (!chip) return;

    // Drop to center ray hit on teleport surfaces if possible
    const hit = this._centerRayHit(world);
    if (hit?.point) {
      chip.position.copy(hit.point);
      chip.position.y += 0.06;
    } else {
      // Otherwise drop near camera forward
      const cam = world.camera;
      cam.getWorldPosition(this._tmpV);
      const dir = new this.THREE.Vector3();
      cam.getWorldDirection(dir);
      this._tmpV.add(dir.multiplyScalar(1.2));
      chip.position.set(this._tmpV.x, 0.9, this._tmpV.z);
    }

    chip.userData.held = null;
    this.held[hand] = null;
  }

  _findNearestChip(pos, r) {
    let best = null;
    let bestD = 1e9;
    for (const c of this.chips) {
      if (!c || c.userData.held) continue;
      const d = c.position.distanceTo(pos);
      if (d < r && d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  _centerRayHit(world) {
    this._ray.setFromCamera({ x: 0, y: 0 }, world.camera);
    this._ray.far = 25;

    const surfaces = world.worldData?.teleportSurfaces || [];
    if (!surfaces.length) return null;

    const hits = this._ray.intersectObjects(surfaces, true);
    if (!hits?.length) return null;
    return hits[0];
  }

  update({ dt, world }) {
    // Follow hand if held
    const hm = this._handMod;
    if (!hm?.hands?.length) return;

    // left=0 right=1 in our heuristic
    const leftHand = hm.hands[0];
    const rightHand = hm.hands[1];

    const apply = (handKey, handObj) => {
      const chip = this.held[handKey];
      if (!chip || !handObj?.joints?.["index-finger-tip"]) return;

      const jt = handObj.joints["index-finger-tip"];
      jt.getWorldPosition(this._tmpV);
      chip.position.lerp(this._tmpV, 1 - Math.pow(0.0001, dt));
    };

    apply("left", leftHand);
    apply("right", rightHand);
  }
}
