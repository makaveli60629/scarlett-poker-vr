import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

/**
 * Quest hand-tracking polish:
 * - Finds index tip robustly across runtimes.
 * - Provides pinch detection (thumb tip vs index tip).
 */
export function createHandTracker(renderer) {
  const hand0 = renderer.xr.getHand(0);
  const hand1 = renderer.xr.getHand(1);

  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();

  function getJoint(hand, names) {
    for (const n of names) {
      const o = hand.getObjectByName(n);
      if (o) return o;
    }
    return null;
  }

  function getIndexTip(hand) {
    return getJoint(hand, ['index-finger-tip','index_tip','index-finger-phalanx-tip','index-tip']);
  }

  function getThumbTip(hand) {
    return getJoint(hand, ['thumb-tip','thumb_tip','thumb-finger-tip','thumb-tip']);
  }

  function getTipWorld(hand, which='index') {
    const joint = which === 'thumb' ? getThumbTip(hand) : getIndexTip(hand);
    if (!joint) return null;
    joint.getWorldPosition(tmpA);
    return tmpA.clone();
  }

  function getPinchStrength(hand) {
    const idx = getIndexTip(hand);
    const th = getThumbTip(hand);
    if (!idx || !th) return 0;
    idx.getWorldPosition(tmpA);
    th.getWorldPosition(tmpB);
    const d = tmpA.distanceTo(tmpB);
    return THREE.MathUtils.clamp((0.06 - d) / (0.06 - 0.015), 0, 1);
  }

  function getHands() { return [hand0, hand1]; }

  return { hand0, hand1, getHands, getTipWorld, getPinchStrength };
}
