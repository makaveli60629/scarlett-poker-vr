import * as THREE from "three";

const JOINTS = {
  wrist: "wrist",
  thumbTip: "thumb-tip",
  indexTip: "index-finger-tip",
  middleTip: "middle-finger-tip",
  ringTip: "ring-finger-tip",
  pinkyTip: "pinky-finger-tip",
  indexMetacarpal: "index-finger-metacarpal"
};

function dist(a, b) { return a.distanceTo(b); }

function getJointWorldPos(handObj, jointName, out) {
  // WebXR Hands (three.js) creates joint objects as children of handObj
  const j = handObj?.joints?.[jointName] || handObj?.children?.find?.(c => c.jointName === jointName) || null;
  if (!j) return false;
  j.getWorldPosition(out);
  return true;
}

export async function init(ctx) {
  ctx.gestures = {
    left: { pinch: false, fist: false, pinchDown: false, fistDown: false },
    right: { pinch: false, fist: false, pinchDown: false, fistDown: false },
  };

  ctx._gestureTmp = {
    a: new THREE.Vector3(),
    b: new THREE.Vector3(),
    c: new THREE.Vector3(),
    d: new THREE.Vector3(),
    e: new THREE.Vector3(),
    f: new THREE.Vector3(),
  };

  ctx.LOG?.push?.("log", "[GestureEngine] init ✅");
}

export function update(dt, ctx) {
  if (!ctx.renderer?.xr?.isPresenting) return;

  const hands = ctx.hands;
  if (!hands?.left || !hands?.right) return;

  _updateHand("left", hands.left, ctx);
  _updateHand("right", hands.right, ctx);
}

function _updateHand(side, handObj, ctx) {
  const st = ctx.gestures[side];
  const tmp = ctx._gestureTmp;

  const hasThumb = getJointWorldPos(handObj, JOINTS.thumbTip, tmp.a);
  const hasIndex = getJointWorldPos(handObj, JOINTS.indexTip, tmp.b);

  const hasWrist = getJointWorldPos(handObj, JOINTS.wrist, tmp.c);
  const hasMid = getJointWorldPos(handObj, JOINTS.middleTip, tmp.d);
  const hasRing = getJointWorldPos(handObj, JOINTS.ringTip, tmp.e);
  const hasPinky = getJointWorldPos(handObj, JOINTS.pinkyTip, tmp.f);

  const prevPinch = st.pinch;
  const prevFist = st.fist;

  // PINCH: thumb-tip close to index-tip
  let pinch = false;
  if (hasThumb && hasIndex) {
    const dTI = dist(tmp.a, tmp.b);
    pinch = dTI < 0.022; // tweak if needed
  }

  // FIST: finger tips near wrist/palm-ish (cheap heuristic)
  let fist = false;
  if (hasWrist && hasIndex && hasMid && hasRing && hasPinky) {
    const d1 = dist(tmp.b, tmp.c);
    const d2 = dist(tmp.d, tmp.c);
    const d3 = dist(tmp.e, tmp.c);
    const d4 = dist(tmp.f, tmp.c);
    const avg = (d1 + d2 + d3 + d4) / 4;
    fist = avg < 0.09;
  }

  st.pinch = pinch;
  st.fist = fist;

  st.pinchDown = (!prevPinch && pinch);
  st.fistDown = (!prevFist && fist);
}
