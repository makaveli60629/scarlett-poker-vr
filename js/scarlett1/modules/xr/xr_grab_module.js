// /js/scarlett1/modules/xr/xr_grab_module.js
// XR GRAB MODULE (FULL) — Modular Forever (Registry + Policy Compatible)
//
// - Ray grab + close grab
// - Uses ctx.controllers.left/right inputSources OR controller Object3D (if your XR rig provides)
// - Uses ctx.input.left/right.trigger (Quest mapper populates this in world.js)
// - Honors ctx.canGrab or ctx._interactionPolicy.canGrab if present
// - Uses ctx.interactables registry (ctx.interactables.all OR .objects())
// - Respects obj.userData.grabbable=false AND registry meta.grabbable=false
//
// NOTE: This module expects ctx.controllers.left/right to be some node with getWorldPosition/getWorldQuaternion.
// If your system stores inputSources (not Object3D), your locomotion module likely provides nodes.
// If ctx.controllers.* isn't a 3D node, it will safely do nothing.

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
    held: { left: null, right: null }, // { obj, parent }
    raycaster: null,
    v1: null,
    v2: null,
    q1: null,
    cachedTargets: [],
  };

  function ensureRoot(ctx) {
    if (built) return;
    built = true;

    const root = new ctx.THREE.Group();
    root.name = "xr_grab_ROOT";
    ctx.scene.add(root);

    state.raycaster = new ctx.THREE.Raycaster();
    state.v1 = new ctx.THREE.Vector3();
    state.v2 = new ctx.THREE.Vector3();
    state.q1 = new ctx.THREE.Quaternion();
  }

  function rootExists(ctx) {
    let found = false;
    ctx.scene.traverse(o => { if (o.name === "xr_grab_ROOT") found = true; });
    return found;
  }

  function isTriggerDown(prev, cur) {
    return cur >= grabDownThreshold && prev < grabDownThreshold;
  }
  function isTriggerUp(prev, cur) {
    return cur <= grabUpThreshold && prev > grabUpThreshold;
  }

  function canGrab(ctx, obj, hand) {
    try {
      if (typeof ctx.canGrab === "function") return !!ctx.canGrab(obj, hand);
      if (ctx._interactionPolicy?.canGrab) return !!ctx._interactionPolicy.canGrab(obj, hand);
    } catch {}
    return true;
  }

  function isGrabbableFast(obj) {
    if (!obj) return false;
    if (obj.userData?.grabbable === false) return false;

    // If explicitly true, accept.
    if (obj.userData?.grabbable === true) return true;

    const k = obj.userData?.kind;
    // Default allow for chips/dealer/props; cards are controlled by policy tagging
    return (k === "chip" || k === "dealer" || k === "prop");
  }

  function getRegistryTargets(ctx) {
    const reg = ctx.interactables;
    if (!reg) return null;

    // reg.all is a getter returning array of objects
    if (Array.isArray(reg.all) && reg.all.length) return reg.all;
    if (typeof reg.objects === "function") return reg.objects();
    return null;
  }

  function gatherTargets(ctx) {
    // Prefer registry objects
    const regTargets = getRegistryTargets(ctx);
    if (Array.isArray(regTargets) && regTargets.length) return regTargets;

    // Fallback: scan scene (filtered)
    const out = [];
    ctx.scene.traverse((o) => {
      if (!o?.isObject3D) return;
      if (!o.visible) return;
      if (!o.isMesh && !o.isGroup) return;
      if (!isGrabbableFast(o)) return;
      out.push(o);
    });
    return out;
  }

  function getHandNode(ctx, hand) {
    const node = hand === "left" ? ctx.controllers?.left : ctx.controllers?.right;
    // must look like Object3D
    if (!node || typeof node.getWorldPosition !== "function" || typeof node.getWorldQuaternion !== "function") return null;
    return node;
  }

  function getRayFromHand(ctx, hand) {
    const node = getHandNode(ctx, hand);
    if (!node) return null;

    node.getWorldPosition(state.v1);
    node.getWorldQuaternion(state.q1);

    const origin = state.v1.clone(); // small alloc, ok
    const dir = new ctx.THREE.Vector3(0, 0, -1).applyQuaternion(state.q1).normalize(); // alloc, ok
    return { origin, dir, node };
  }

  function findCloseCandidate(ctx, hand, targets) {
    const node = getHandNode(ctx, hand);
    if (!node) return null;

    node.getWorldPosition(state.v1);
    const handPos = state.v1;

    let best = null;
    let bestD = 1e9;

    for (const o of targets) {
      if (!o) continue;
      if (!canGrab(ctx, o, hand)) continue;

      // Respect policy: registry meta may mark grabbable=false
      const meta = ctx.interactables?.list?.().find(m => m.object === o);
      if (meta && meta.grabbable === false) continue;
      if (o.userData?.grabbable === false) continue;

      o.getWorldPosition(state.v2);
      const d = handPos.distanceTo(state.v2);
      if (d <= closeRadius && d < bestD) {
        best = o;
        bestD = d;
      }
    }
    return best;
  }

  function findRayCandidate(ctx, hand, targets) {
    const r = getRayFromHand(ctx, hand);
    if (!r) return null;

    state.raycaster.far = rayDistance;
    state.raycaster.set(r.origin, r.dir);

    const hits = state.raycaster.intersectObjects(targets, true);
    if (!hits.length) return null;

    for (const h of hits) {
      let o = h.object;
      while (o && o !== ctx.scene) {
        // policy guard
        if (o.userData?.grabbable === false) { o = o.parent; continue; }

        // registry meta guard (if registered)
        const meta = ctx.interactables?.list?.().find(m => m.object === o);
        if (meta && meta.grabbable === false) { o = o.parent; continue; }

        if (isGrabbableFast(o) && canGrab(ctx, o, hand)) return o;
        o = o.parent;
      }
    }
    return null;
  }

  function attachToHand(ctx, hand, obj) {
    const node = getHandNode(ctx, hand);
    if (!node || !obj) return;

    if (state.held.left?.obj === obj || state.held.right?.obj === obj) return;

    const prevParent = obj.parent || ctx.scene;

    prevParent.remove(obj);
    node.add(obj);

    obj.position.set(0, 0, -holdDistance);
    obj.quaternion.set(0, 0, 0, 1);

    obj.userData._held = true;
    obj.userData._heldBy = hand;

    state.held[hand] = { obj, parent: prevParent };

    if (keepChipsUpright && obj.userData?.kind === "chip") obj.userData._keepUpright = true;

    console.log("[xr_grab] grabbed ✅", hand, obj.name || obj.uuid);
  }

  function detachFromHand(ctx, hand) {
    const h = state.held[hand];
    if (!h?.obj) return;

    const obj = h.obj;
    const node = getHandNode(ctx, hand);
    const parent = h.parent || ctx.scene;

    // preserve world transform
    obj.updateMatrixWorld(true);
    obj.getWorldPosition(state.v1);
    obj.getWorldQuaternion(state.q1);

    node?.remove(obj);
    parent.add(obj);

    obj.position.copy(state.v1);
    obj.quaternion.copy(state.q1);

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

  function updateHeldUpright() {
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
      ensureRoot(ctx);
      state.cachedTargets = gatherTargets(ctx);
      console.log("[xr_grab] ready ✅ targets=", state.cachedTargets.length);
    },

    update(ctx, { input }) {
      if (!rootExists(ctx)) return;

      state.frame++;

      if (state.frame % scanEveryNFrames === 0) {
        state.cachedTargets = gatherTargets(ctx);
      }

      const leftTrig = input?.left?.trigger ?? 0;
      const rightTrig = input?.right?.trigger ?? 0;

      const leftDown = isTriggerDown(state.prevTrig.left, leftTrig);
      const rightDown = isTriggerDown(state.prevTrig.right, rightTrig);

      const leftUp = isTriggerUp(state.prevTrig.left, leftTrig);
      const rightUp = isTriggerUp(state.prevTrig.right, rightTrig);

      state.prevTrig.left = leftTrig;
      state.prevTrig.right = rightTrig;

      if (leftUp) detachFromHand(ctx, "left");
      if (rightUp) detachFromHand(ctx, "right");

      if (leftDown && !state.held.left) {
        const close = findCloseCandidate(ctx, "left", state.cachedTargets);
        const ray = close || findRayCandidate(ctx, "left", state.cachedTargets);
        if (ray) attachToHand(ctx, "left", ray);
      }

      if (rightDown && !state.held.right) {
        const close = findCloseCandidate(ctx, "right", state.cachedTargets);
        const ray = close || findRayCandidate(ctx, "right", state.cachedTargets);
        if (ray) attachToHand(ctx, "right", ray);
      }

      updateHeldUpright();
    },
  };
    }
