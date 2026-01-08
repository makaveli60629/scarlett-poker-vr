// js/avatars.js
import * as THREE from "three";

export class SimpleAvatar {
  constructor(color = 0x8aa0ff) {
    this.root = new THREE.Group();
    this.root.name = "bot_avatar";

    const skin = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
    const cloth = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.95 });

    // ====== Body proportions (tuned for chair sit) ======
    this.hipHeightStanding = 0.95;  // hips when standing
    this.hipHeightSitting = 0.62;   // hips when sitting
    this.legUpper = 0.38;
    this.legLower = 0.38;

    // Pelvis (anchor)
    this.pelvis = new THREE.Group();
    this.pelvis.position.y = this.hipHeightStanding;
    this.root.add(this.pelvis);

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.42, 0.18), cloth);
    torso.position.y = 0.30;
    this.pelvis.add(torso);

    // Head (correctly above torso)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 18), skin);
    head.position.y = 0.56;
    this.pelvis.add(head);

    // Simple neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.08, 14), skin);
    neck.position.y = 0.47;
    this.pelvis.add(neck);

    // Legs (L/R)
    this.leftLeg = this._makeLeg(cloth);
    this.rightLeg = this._makeLeg(cloth);

    this.leftLeg.hip.position.set(-0.10, 0.02, 0.00);
    this.rightLeg.hip.position.set( 0.10, 0.02, 0.00);

    this.root.add(this.leftLeg.root);
    this.root.add(this.rightLeg.root);

    // Feet anchors are implicit by leg lengths; we keep them near floor by pose math
    this._sitAmount = 0; // 0 standing, 1 sitting
  }

  _makeLeg(mat) {
    const root = new THREE.Group();
    const hip = new THREE.Group();
    root.add(hip);

    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, this.legUpper, 12), mat);
    upper.position.y = -this.legUpper / 2;
    hip.add(upper);

    const knee = new THREE.Group();
    knee.position.y = -this.legUpper;
    hip.add(knee);

    const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.052, this.legLower, 12), mat);
    lower.position.y = -this.legLower / 2;
    knee.add(lower);

    // tiny foot
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.04, 0.20), mat);
    foot.position.set(0, -this.legLower - 0.02, 0.07);
    hip.add(foot);

    return { root, hip, knee };
  }

  setWorldPose(position, lookAtTarget) {
    this.root.position.copy(position);
    if (lookAtTarget) {
      const t = lookAtTarget.clone();
      t.y = position.y; // keep flat
      this.root.lookAt(t);
    }
  }

  // Smoothly pose sit/stand
  setSitAmount(a) {
    this._sitAmount = Math.max(0, Math.min(1, a));

    // Lower pelvis when sitting
    this.pelvis.position.y = THREE.MathUtils.lerp(this.hipHeightStanding, this.hipHeightSitting, this._sitAmount);

    // Sitting: hips rotate slightly back, knees bend ~90°, feet forward
    const hipBend = THREE.MathUtils.lerp(0.0, -0.55, this._sitAmount);
    const kneeBend = THREE.MathUtils.lerp(0.0, 1.20, this._sitAmount);

    this.leftLeg.hip.rotation.x = hipBend;
    this.rightLeg.hip.rotation.x = hipBend;

    this.leftLeg.knee.rotation.x = kneeBend;
    this.rightLeg.knee.rotation.x = kneeBend;

    // Shift legs forward so feet don’t intersect chair/table
    const legForward = THREE.MathUtils.lerp(0.00, 0.22, this._sitAmount);
    this.leftLeg.root.position.set(0, 0, legForward);
    this.rightLeg.root.position.set(0, 0, legForward);
  }

  update(dt) {
    // optional idle animation later (breathing, head turn)
  }
}
