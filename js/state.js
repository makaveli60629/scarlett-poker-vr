// js/state.js — CLEAN MINIMAL (no collider system)

const _interactables = new Map();

export function registerInteractable(object3D, onActivate) {
  if (!object3D) return;
  _interactables.set(object3D.uuid, {
    object: object3D,
    onActivate: typeof onActivate === "function" ? onActivate : null
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
  for (let i = 0; i < 50 && cur; i++) {
    if (cur.userData?.__interactable) break;
    cur = cur.parent;
  }
  if (!cur) return false;

  const entry = _interactables.get(cur.uuid);
  if (entry?.onActivate) {
    try { entry.onActivate(cur); } catch {}
    return true;
  }
  return false;
}
