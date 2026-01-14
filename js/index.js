/**
 * Update 4.0 - Permanent Fix: Reticle Direction Alignment
 * This replaces the previous updateReticleFromRightGrip to ensure 
 * the green circle matches the hand's forward direction on Quest.
 */
function updateReticleFromRightGrip() {
  const grip = state.grip.right || state.ctrl.right;
  const reticle = state.reticle;
  if (!grip || !reticle) return;

  // 1. Get starting position of the hand
  grip.getWorldPosition(tmp.origin);

  // 2. Set direction: Quest hand tracking often uses +Z as forward.
  // We start with +Z and then verify against the headset orientation.
  tmp.dir.set(0, 0, 1); 
  grip.getWorldQuaternion(tmp.q);
  tmp.dir.applyQuaternion(tmp.q).normalize();

  // 3. Alignment Check: Compare hand direction with HMD forward
  const hmdFwd = tmp.v.set(0, 0, -1).applyQuaternion(camera.quaternion);
  hmdFwd.y = 0; 
  hmdFwd.normalize();

  const dFlat = tmp.dir.clone();
  dFlat.y = 0; 
  dFlat.normalize();

  // If the hand is pointing "backwards" relative to the face, flip it
  if (dFlat.lengthSq() > 1e-6 && dFlat.dot(hmdFwd) < 0) {
    tmp.dir.multiplyScalar(-1);
  }

  // 4. Raycast to Floor (y=0)
  const y0 = 0;
  if (Math.abs(tmp.dir.y) < 1e-5) {
    reticle.visible = false;
    return;
  }

  const t = (y0 - tmp.origin.y) / tmp.dir.y;
  
  // Only show if pointing downward and within a reasonable range
  if (t <= 0) {
    reticle.visible = false;
    return;
  }

  const hit = tmp.origin.clone().add(tmp.dir.clone().multiplyScalar(t));
  const dist = hit.distanceTo(tmp.origin);

  // Limit teleport/aim distance to 12 units for gameplay balance
  if (dist > 12) {
    reticle.visible = false;
    return;
  }

  // 5. Final Placement
  reticle.position.copy(hit);
  reticle.visible = true;
}
