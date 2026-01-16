// /js/scarlett1/modules/xr/xr_grab_module.js
// XR GRAB MODULE (FULL) — Modular Forever
// - Ray grab + close grab
// - Uses ctx.controllers.left/right (Object3D), ctx.input.left/right.trigger
// - Honors ctx.canGrab or ctx._interactionPolicy.canGrab if present
// - Uses ctx.interactables if provided, otherwise traverses scene (cheap filtered)
// - Toggle-safe marker root: xr_grab_ROOT

export function createXRGrabModule({
  // distances
  rayDistance = 8.5,
  closeRadius = 0.28,          // close-grab sphere
  holdDistance = 0.10,         // small forward offset for ray grab when attaching

  // trigger threshold
  grabDownThreshold = 0.60,
  grabUpThreshold = 0.25,

  // “chip stabilization”
  keepChipsUpright = true,

  // performance
  scanEveryNFrames = 4,
} = {}) {
  let built = false;

  const state = {
    frame: 0,
    prevTrig: { left: 0, right: 0 },
    held: { left: null, right: null },          // { obj, parent, worldMatrix, localOffset? }
    raycaster: null,
    tmpV: null,
    tmpQ: null,
    tmpM: null,
    tmpM2: null,
    tmpP: null,
    tmpP2: null,
    cachedTargets: [],
  };

  function ensureRoot(ctx) {
    if (built) return;
    built = true;
    const root = new ctx.THREE.Group();
    root.name = "xr_grab_ROOT";
    ctx.scene.add(root);

    state.raycaster = new ctx.THREE.Raycaster();
    state.tmpV = new ctx.THREE.Vector3();
    state.tmpQ = new ctx.THREE.Quaternion();
    state.tmpM = new ctx.THREE.Matrix4();
    state.tmpM2 = new ctx.THREE.Matrix4();
    state.tmpP = new ctx.THREE.Vector3();
    state.tmpP2 = new ctx.THREE.Vector3();
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

  function isGrabbable(obj) {
    if (!obj) return false;
    if (obj.userData?.grabbable === true) return true;

    const k = obj.userData?.kind;
    if (k === "chip" || k === "dealer" || k === "card" || k === "prop") return true;

    return false;
  }

  function canGrab(ctx, obj, hand) {
    try {
      if (typeof ctx.canGrab === "function") return !!ctx.canGrab(obj, hand);
      if (ctx._interactionPolicy?.canGrab) return !!ctx._interactionPolicy.canGrab(obj, hand);
    } catch {}
    return true;
  }

  function gatherTargets(ctx) {
    // Prefer explicit registry
    if (Array.isArray(ctx.interactables) && ctx.interactables.length) {
      return ctx.interactables.filter(o => o && o.isObject3D);
    }

    // Otherwise: scan scene but filter hard
    const out = [];
    ctx.scene.traverse((o) => {
      if (!o?.isObject3D) return;
      if (!o.visible) return;
      if (!o.isMesh && !o.isGroup) return;
      if (!isGrabbable(o)) return;
      out.push(o);
    });
    return out;
  }

  function getHandNode(ctx, hand) {
    return hand === "left" ? ctx.controllers.left : ctx.controllers.right;
  }

  function getRayFromHand(ctx, hand) {
    const node = getHandNode(ctx, hand);
    if (!node) return null;

    const origin = state.tmpP.clone();
    node.getWorldPosition(origin);

    const q = state.tmpQ.clone();
    node.getWorldQuaternion(q);

    const dir = new ctx.THREE.Vector3(0, 0, -1).applyQuaternion(q).normalize();
    return { origin, dir, q, node };
  }

  function distXZ(a, b) {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return Math.hypot(dx, dz);
  }

  function findCloseCandidate(ctx, hand, targets) {
    const node = getHandNode(ctx, hand);
    if (!node) return null;

    const handPos = state.tmpP.clone();
    node.getWorldPosition(handPos);

    let best = null;
    let bestD = 1e9;

    for (const o of targets) {
      if (!o) continue;
      if (!canGrab(ctx, o, hand)) continue;

      const p = state.tmpP2.clone();
      o.getWorldPosition(p);

      const d = handPos.distanceTo(p);
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

    // Raycaster wants meshes — but we may store groups. IntersectObjects handles children if recursive=true
    const hits = state.raycaster.intersectObjects(targets, true);
    if (!hits.length) return null;

    // Find first hit whose object (or parent) is grabbable
    for (const h of hits) {
      let o = h.object;
      while (o && o !== ctx.scene) {
        if (isGrabbable(o) && canGrab(ctx, o, hand)) return o;
        o = o.parent;
      }
    }
    return null;
  }

  function attachToHand(ctx, hand, obj) {
    const node = getHandNode(ctx, hand);
    if (!node || !obj) return;

    // Already held by other hand?
    if (state.held.left?.obj === obj || state.held.right?.obj === obj) return;

    // Save parent + world transform
    const prevParent = obj.parent || ctx.scene;
    obj.updateMatrixWorld(true);

    const worldPos = new ctx.THREE.Vector3();
    const worldQuat = new ctx.THREE.Quaternion();
    const worldScale = new ctx.THREE.Vector3();
    obj.matrixWorld.decompose(worldPos, worldQuat, worldScale);

    // Detach & attach under controller
    prevParent.remove(obj);
    node.add(obj);

    // Place slightly in front of controller
    obj.position.set(0, 0, -holdDistance);
    obj.quaternion.set(0, 0, 0, 1);
    obj.scale.copy(worldScale);

    // Tag
    obj.userData._held = true;
    obj.userData._heldBy = hand;

    state.held[hand] = {
      obj,
      parent: prevParent,
      worldPos,
      worldQuat,
      worldScale,
    };

    // Optional: keep chips upright while held
    if (keepChipsUpright && obj.userData?.kind === "chip") {
      obj.userData._keepUpright = true;
    }

    console.log("[xr_grab] grabbed ✅", hand, obj.name || obj.uuid);
  }

  function detachFromHand(ctx, hand) {
    const h = state.held[hand];
    if (!h?.obj) return;

    const obj = h.obj;
    const node = getHandNode(ctx, hand);
    const parent = h.parent || ctx.scene;

    // Compute current world transform while still under hand
    obj.updateMatrixWorld(true);

    const worldPos = new ctx.THREE.Vector3();
    const worldQuat = new ctx.THREE.Quaternion();
    const worldScale = new ctx.THREE.Vector3();
    obj.matrixWorld.decompose(worldPos, worldQuat, worldScale);

    // Detach
    node?.remove(obj);
    parent.add(obj);

    // Apply world transform back into parent space
    obj.position.copy(worldPos);
    obj.quaternion.copy(worldQuat);
    obj.scale.copy(worldScale);

    // If chips: drop flat (optional)
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

  function updateHeldUpright(ctx) {
    if (!keepChipsUpright) return;
    for (const hand of ["left", "right"]) {
      const h = state.held[hand];
      if (!h?.obj) continue;
      const obj = h.obj;
      if (obj.userData?._keepUpright && obj.userData?.kind === "chip") {
        // Keep roll/pitch near zero, allow yaw
        const yaw = obj.rotation.y;
        obj.rotation.set(0, yaw, 0);
      }
    }
  }

  return {
    name: "xr_grab",

    onEnable(ctx) {
      ensureRoot(ctx);

      // Build target cache (and refresh periodically)
      state.cachedTargets = gatherTargets(ctx);

      console.log("[xr_grab] ready ✅ targets=", state.cachedTargets.length);
    },

    update(ctx, { dt, input }) {
      if (!rootExists(ctx)) return; // toggled OFF

      state.frame++;

      // Refresh target list occasionally (for newly spawned chips/cards)
      if (state.frame % scanEveryNFrames === 0) {
        state.cachedTargets = gatherTargets(ctx);
      }

      // Must have XR + controllers
      // (Grab can still work in non-XR for debug if controllers exist, but you’re XR-focused.)
      const leftTrig = input?.left?.trigger ?? 0;
      const rightTrig = input?.right?.trigger ?? 0;

      const leftDown = isTriggerDown(state.prevTrig.left, leftTrig);
      const rightDown = isTriggerDown(state.prevTrig.right, rightTrig);

      const leftUp = isTriggerUp(state.prevTrig.left, leftTrig);
      const rightUp = isTriggerUp(state.prevTrig.right, rightTrig);

      state.prevTrig.left = leftTrig;
      state.prevTrig.right = rightTrig;

      // Release if trigger up
      if (leftUp) detachFromHand(ctx, "left");
      if (rightUp) detachFromHand(ctx, "right");

      // Grab if trigger down and not already holding something
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

      updateHeldUpright(ctx);
    },
  };
  }
