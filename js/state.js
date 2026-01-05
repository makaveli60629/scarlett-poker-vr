// js/state.js — STABILIZER (6.2)
// Goal: Never crash on missing exports again.
// Supports BOTH import styles:
//   import { State } from "./state.js"
//   import { registerCollider } from "./state.js"

console.log("[state] stabilizer loaded");

const _interactables = new Map(); // uuid -> { object, onActivate }
const _colliders = new Map();     // uuid -> object

// --------------------
// INTERACTABLES
// --------------------
export function registerInteractable(object3D, onActivate) {
  if (!object3D) return;
  _interactables.set(object3D.uuid, {
    object: object3D,
    onActivate: typeof onActivate === "function" ? onActivate : null,
  });
  object3D.userData ||= {};
  object3D.userData.__interactable = true;
}

export function unregisterInteractable(object3D) {
  if (!object3D) return;
  _interactables.delete(object3D.uuid);
  object3D.userData ||= {};
  object3D.userData.__interactable = false;
}

export function getInteractablesArray() {
  return Array.from(_interactables.values()).map(v => v.object);
}

export function activateObject(object3D) {
  if (!object3D) return false;

  // walk up parents to find an interactable root
  let cur = object3D;
  for (let i = 0; i < 80 && cur; i++) {
    if (cur.userData?.__interactable) break;
    cur = cur.parent;
  }
  if (!cur) return false;

  const entry = _interactables.get(cur.uuid);
  if (entry?.onActivate) {
    try { entry.onActivate(cur); } catch (e) { console.warn("[state] activate error:", e); }
    return true;
  }
  return false;
}

// --------------------
// COLLIDERS
// (Even if we don't fully use collisions yet, exports must exist)
// --------------------
export function registerCollider(object3D) {
  if (!object3D) return;
  _colliders.set(object3D.uuid, object3D);
  object3D.userData ||= {};
  object3D.userData.__collider = true;
}

export function unregisterCollider(object3D) {
  if (!object3D) return;
  _colliders.delete(object3D.uuid);
  object3D.userData ||= {};
  object3D.userData.__collider = false;
}

export function getCollidersArray() {
  return Array.from(_colliders.values());
}

// --------------------
// OPTIONAL COMPAT NAMES (some files may import these)
// --------------------
export const interactables = _interactables;
export const colliders = _colliders;

// --------------------
// STATE OBJECT EXPORT (for `import { State } from "./state.js"`)
// --------------------
export const State = {
  registerInteractable,
  unregisterInteractable,
  getInteractablesArray,
  activateObject,
  registerCollider,
  unregisterCollider,
  getCollidersArray,
  interactables,
  colliders,
};
// ---- REQUIRED COMPAT EXPORT ----
export const State = {
  registerInteractable,
  unregisterInteractable,
  getInteractablesArray,
  activateObject,
  registerCollider,
  unregisterCollider,
  getCollidersArray
};
