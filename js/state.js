// js/state.js — Scarlett Poker VR (6.2)
// Simple global registry for interactable objects (click/grip actions)

const _interactables = new Map(); // object3D.uuid -> { object, onActivate }

export function registerInteractable(object3D, onActivate) {
  if (!object3D) return;
  _interactables.set(object3D.uuid, { object: object3D, onActivate });
  object3D.userData.__interactable = true;
}

export function unregisterInteractable(object3D) {
  if (!object3D) return;
  _interactables.delete(object3D.uuid);
  object3D.userData.__interactable = false;
}

export function getInteractablesArray() {
  return Array.from(_interactables.values()).map(x => x.object);
}

export function activateObject(object3D) {
  if (!object3D) return false;
  const entry = _interactables.get(object3D.uuid);
  if (entry?.onActivate) {
    try { entry.onActivate(object3D); } catch (e) { console.warn("[state] onActivate error", e); }
    return true;
  }
  return false;
}
