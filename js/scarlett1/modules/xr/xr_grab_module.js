// /js/scarlett1/modules/xr/xr_grab_module.js
// XR GRAB MODULE (FULL) — Modular Forever
// Honors ctx._interactionPolicy.canGrab and obj.userData.grabbable

export function createXRGrabModule({
  rayDistance = 8.5,
  closeRadius = 0.28,
  holdDistance = 0.10,
  grabDownThreshold = 0.60,
  grabUpThreshold = 0.25,
  keepChipsUpright = true,
  scanEveryNFrames = 4,
} = {}) {
  let built = false;

  const state = {
    frame: 0,
    prevTrig: { left: 0, right: 0 },
    held: { left: null, right: null },
    raycaster: null,
    tmpP: null,
    tmpQ: null,
    cachedTargets: [],
  };

  function ensure(ctx) {
    if (built) return;
    built = true;
    state.raycaster = new ctx.THREE.Raycaster();
    state.tmpP = new ctx.THREE.Vector3();
    state.tmpQ = new ctx.THREE.Quaternion();
  }

  function trigDown(prev, cur) { return cur >= grabDownThreshold && prev < grabDownThreshold; }
  function trigUp(prev, cur) { return cur <= grabUpThreshold && prev > grabUpThreshold; }

  function canGrab(ctx, obj, hand) {
    try {
      if (ctx._interactionPolicy?.canGrab) return !!ctx._interactionPolicy.canGrab(obj, hand);
    } catch {}
    return obj?.userData?.grabbable === true;
  }

  function gather(ctx) {
    // Prefer ctx.interactables list if present
    if (Array.isArray(ctx.interactables) && ctx.interactables.length) {
      return ctx.interactables.filter(o => o?.isObject3D);
    }
    const out = [];
    ctx.scene.traverse((o) => {
      if (!o?.isObject3D || !o.visible) return;
      if (o.userData?.grabbable === true) out.push(o);
    });
    return out;
  }

  function handNode(ctx, hand) {
    return hand === "left" ? ctx.controllers.left : ctx.controllers.right;
  }

  function rayCandidate(ctx, hand, targets) {
    const node = handNode(ctx, hand);
    if (!node) return null;

    node.getWorldPosition(state.tmpP);
    node.getWorldQuaternion(state.tmpQ);

    const dir = new ctx.THREE.Vector3(0, 0, -1).applyQuaternion(state.tmpQ).normalize();
    state.raycaster.far = rayDistance;
    state.raycaster.set(state.tmpP, dir);

    const hits = state.raycaster.intersectObjects(targets, true);
    for (const h of hits) {
      let o = h.object;
      while (o && o !== ctx.scene) {
        if (o.userData?.grabbable === true && canGrab(ctx, o, hand)) return o;
        o = o.parent;
      }
    }
    return null;
  }

  function closeCandidate(ctx, hand, targets) {
    const node = handNode(ctx, hand);
    if (!node) return null;

    const hp = new ctx.THREE.Vector3();
    node.getWorldPosition(hp);

    let best = null;
    let bestD = 1e9;

    for (const o of targets) {
      if (!o || !canGrab(ctx, o, hand)) continue;
      const p = new ctx.THREE.Vector3();
      o.getWorldPosition(p);
      const d = hp.distanceTo(p);
      if (d <= closeRadius && d < bestD) { best = o; bestD = d; }
    }
    return best;
  }

  function attach(ctx, hand, obj) {
    const node = handNode(ctx, hand);
    if (!node || !obj) return;

    if (state.held.left?.obj === obj || state.held.right?.obj === obj) return;

    const prevParent = obj.parent || ctx.scene;

    obj.updateMatrixWorld(true);
    const worldPos = new ctx.THREE.Vector3();
    const worldQuat = new ctx.THREE.Quaternion();
    const worldScale = new ctx.THREE.Vector3();
    obj.matrixWorld.decompose(worldPos, worldQuat, worldScale);

    prevParent.remove(obj);
    node.add(obj);

    obj.position.set(0, 0, -holdDistance);
    obj.quaternion.set(0, 0, 0, 1);
    obj.scale.copy(worldScale);

    obj.userData._held = true;
    obj.userData._heldBy = hand;

    state.held[hand] = { obj, parent: prevParent };

    if (keepChipsUpright && obj.userData?.kind === "chip") obj.userData._keepUpright = true;
    console.log("[xr_grab] grabbed ✅", hand, obj.name || obj.uuid);
  }

  function detach(ctx, hand) {
    const h = state.held[hand];
    if (!h?.obj) return;

    const obj = h.obj;
    const node = handNode(ctx, hand);
    const parent = h.parent || ctx.scene;

    obj.updateMatrixWorld(true);

    const worldPos = new ctx.THREE.Vector3();
    const worldQuat = new ctx.THREE.Quaternion();
    const worldScale = new ctx.THREE.Vector3();
    obj.matrixWorld.decompose(worldPos, worldQuat, worldScale);

    node?.remove(obj);
    parent.add(obj);

    obj.position.copy(worldPos);
    obj.quaternion.copy(worldQuat);
    obj.scale.copy(worldScale);

    if (keepChipsUpright && obj.userData?.kind === "chip") {
      obj.rotation.x = 0;
      obj.rotation.z = 0;
      obj.userData._keepUpright = false;
    }

    obj.userData._held = false;
    obj.userData._heldBy = null;

    state.held[hand] = null;
    console.log("[xr_grab] released ✅", hand, obj.name || obj.uuid);
  }

  function keepUpright() {
    if (!keepChipsUpright) return;
    for (const hand of ["left", "right"]) {
      const h = state.held[hand];
      if (!h?.obj) continue;
      const obj = h.obj;
      if (obj.userData?._keepUpright && obj.userData?.kind === "chip") {
        const yaw = obj.rotation.y;
        obj.rotation.set(0, yaw, 0);
      }
    }
  }

  return {
    name: "xr_grab",

    onEnable(ctx) {
      ensure(ctx);
      state.cachedTargets = gather(ctx);
      console.log("[xr_grab] ready ✅ targets=", state.cachedTargets.length);
    },

    update(ctx, { input }) {
      ensure(ctx);
      state.frame++;

      if (state.frame % scanEveryNFrames === 0) state.cachedTargets = gather(ctx);

      const L = input?.left?.trigger ?? 0;
      const R = input?.right?.trigger ?? 0;

      const Ld = trigDown(state.prevTrig.left, L);
      const Rd = trigDown(state.prevTrig.right, R);

      const Lu = trigUp(state.prevTrig.left, L);
      const Ru = trigUp(state.prevTrig.right, R);

      state.prevTrig.left = L;
      state.prevTrig.right = R;

      if (Lu) detach(ctx, "left");
      if (Ru) detach(ctx, "right");

      if (Ld && !state.held.left) {
        const c = closeCandidate(ctx, "left", state.cachedTargets);
        const r = c || rayCandidate(ctx, "left", state.cachedTargets);
        if (r) attach(ctx, "left", r);
      }

      if (Rd && !state.held.right) {
        const c = closeCandidate(ctx, "right", state.cachedTargets);
        const r = c || rayCandidate(ctx, "right", state.cachedTargets);
        if (r) attach(ctx, "right", r);
      }

      keepUpright();
    },
  };
  }
