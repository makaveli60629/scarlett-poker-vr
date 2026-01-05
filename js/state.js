// js/state.js — Scarlett Poker VR (6.2) (Bulletproof)
// Central registry for interactables (things you can click with grip/pointer)

const _interactables = new Map(); // uuid -> { object, onActivate }
const _tags = new WeakMap();      // object -> true/false (fast marker)

// Register an object as interactable.
// The object can be a Group or Mesh. Children are raycasted; we bubble up to a tagged parent.
export function registerInteractable(object3D, onActivate) {
  if (!object3D) return;

  // Guard: onActivate may be missing
  const handler = (typeof onActivate === "function") ? onActivate : null;

  _interactables.set(object3D.uuid, { object: object3D, onActivate: handler });
  object3D.userData = object3D.userData || {};
  object3D.userData.__interactable = true;
  _tags.set(object3D, true);
}

export function unregisterInteractable(object3D) {
  if (!object3D) return;

  _interactables.delete(object3D.uuid);
  object3D.userData = object3D.userData || {};
  object3D.userData.__interactable = false;
  _tags.delete(object3D);
}

// Return a flat array of root interactables.
// Interactions.js raycasts these (with recursive=true) so children are included.
export function getInteractablesArray() {
  const arr = [];
  for (const v of _interactables.values()) {
    if (v?.object) arr.push(v.object);
  }
  return arr;
}

// Try to activate object3D or one of its interactable ancestors.
export function activateObject(object3D) {
  if (!object3D) return false;

  // Bubble up to a registered root
  let cur = object3D;
  let safety = 0;
  while (cur && safety++ < 50) {
    if (cur.userData?.__interactable || _tags.get(cur)) break;
    cur = cur.parent;
  }
  if (!cur) return false;

  const entry = _interactables.get(cur.uuid);
  if (entry?.onActivate) {
    try { entry.onActivate(cur); } catch (e) { console.warn("[state] onActivate error:", e); }
    return true;
  }
  return false;
}
