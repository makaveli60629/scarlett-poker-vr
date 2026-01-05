// js/state_v62.js — stable exports for 6.2 (no-cache filename)
// Provides both correct names + backward-compatible aliases

const _interactables = new Map(); // id -> { object3D, onActivate }
const _colliders = new Map();     // id -> object3D
let _id = 1;

function _getId(obj) {
  if (!obj) return null;
  if (!obj.userData) obj.userData = {};
  if (!obj.userData.__stateId) obj.userData.__stateId = `o${_id++}`;
  return obj.userData.__stateId;
}

// --------------------------
// Interactables
// --------------------------
export function registerInteractable(object3D, onActivate) {
  const id = _getId(object3D);
  if (!id) return null;
  _interactables.set(id, { object3D, onActivate });
  return id;
}

export function unregisterInteractable(object3D) {
  const id = object3D?.userData?.__stateId;
  if (!id) return false;
  return _interactables.delete(id);
}

// BACKWARD COMPAT ALIAS (typo some modules use)
export const unregisteredInteractable = unregisterInteractable;

export function getInteractablesArray() {
  return Array.from(_interactables.values()).map(v => v.object3D);
}

export function activateObject(object3D) {
  const id = object3D?.userData?.__stateId;
  if (!id) return false;
  const entry = _interactables.get(id);
  if (!entry || typeof entry.onActivate !== "function") return false;
  try {
    entry.onActivate(object3D);
    return true;
  } catch (e) {
    console.warn("activateObject error:", e);
    return false;
  }
}

// --------------------------
// Colliders
// --------------------------
export function registerCollider(object3D) {
  const id = _getId(object3D);
  if (!id) return null;
  _colliders.set(id, object3D);
  return id;
}

export function unregisterCollider(object3D) {
  const id = object3D?.userData?.__stateId;
  if (!id) return false;
  return _colliders.delete(id);
}

export function getCollidersArray() {
  return Array.from(_colliders.values());
}

// Optional debug helpers
export function _stateCounts() {
  return { interactables: _interactables.size, colliders: _colliders.size };
}
