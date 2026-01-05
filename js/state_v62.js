// js/state_v62.js — stable exports for 6.2 (no-cache filename)

const _interactables = new Map();
const _colliders = new Map();

// Interactions
export function registerInteractable(object3D, onActivate) {
  if (!object3D) return;
  _interactables.set(object3D.uuid, {
    object: object3D,
    onActivate: typeof onActivate === "function" ? onActivate : null,
  });
  object3D.userData ||= {};
  object3D.userData.__interactable = true;
}

export function getInteractablesArray() {
  return Array.from(_interactables.values()).map(v => v.object);
}

export function activateObject(object3D) {
  if (!object3D) return false;
  let cur = object3D;
  for (let i = 0; i < 60 && cur; i++) {
    if (cur.userData?.__interactable) break;
    cur = cur.parent;
  }
  if (!cur) return false;

  const entry = _interactables.get(cur.uuid);
  if (entry?.onActivate) {
    try { entry.onActivate(cur); } catch (e) { console.warn(e); }
    return true;
  }
  return false;
}

// Colliders (even if we don’t “use” them yet, exports MUST exist)
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
