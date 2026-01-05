// ===============================
// Skylark Poker VR — js/state.js (STABLE EXPORTS)
// Provides: State + registerCollider/registerInteractable + arrays + activateObject
// ===============================

const _interactables = new Map(); // id -> { object3D, onActivate }
const _colliders = new Map();     // id -> object3D (or any collider object)

let _idCounter = 1;

let _playerRig = null;
let _renderer = null;
let _scene = null;
let _camera = null;

function _idFor(obj) {
  if (!obj) return `null-${_idCounter++}`;
  if (!obj.userData) obj.userData = {};
  if (!obj.userData.__skylark_id) obj.userData.__skylark_id = `obj-${_idCounter++}`;
  return obj.userData.__skylark_id;
}

// ---------- Interactables ----------
export function registerInteractable(object3D, onActivate) {
  const id = _idFor(object3D);
  _interactables.set(id, { object3D, onActivate: typeof onActivate === "function" ? onActivate : null });
  return id;
}

export function unregisterInteractable(object3DOrId) {
  const id = typeof object3DOrId === "string" ? object3DOrId : _idFor(object3DOrId);
  _interactables.delete(id);
}

export function getInteractablesArray() {
  return Array.from(_interactables.values()).map(v => v.object3D).filter(Boolean);
}

export function getInteractablesEntries() {
  return Array.from(_interactables.values());
}

export function activateObject(hitObject3D) {
  if (!hitObject3D) return false;

  // Walk up the parent chain to find something registered
  let cur = hitObject3D;
  while (cur) {
    const id = cur?.userData?.__skylark_id;
    if (id && _interactables.has(id)) {
      const entry = _interactables.get(id);
      try { entry?.onActivate?.(entry.object3D); } catch (e) { console.warn("activateObject error:", e); }
      return true;
    }
    cur = cur.parent || null;
  }
  return false;
}

// ---------- Colliders ----------
export function registerCollider(object3D) {
  const id = _idFor(object3D);
  _colliders.set(id, object3D);
  return id;
}

export function unregisterCollider(object3DOrId) {
  const id = typeof object3DOrId === "string" ? object3DOrId : _idFor(object3DOrId);
  _colliders.delete(id);
}

export function getCollidersArray() {
  return Array.from(_colliders.values()).filter(Boolean);
}

// ---------- Engine references ----------
export function setPlayerRig(rig) { _playerRig = rig; }
export function getPlayerRig() { return _playerRig; }

export function setRenderer(r) { _renderer = r; }
export function getRenderer() { return _renderer; }

export function setScene(s) { _scene = s; }
export function getScene() { return _scene; }

export function setCamera(c) { _camera = c; }
export function getCamera() { return _camera; }

// ---------- Convenience State object (some files import { State }) ----------
export const State = {
  // interactables
  registerInteractable,
  unregisterInteractable,
  getInteractablesArray,
  getInteractablesEntries,
  activateObject,

  // colliders
  registerCollider,
  unregisterCollider,
  getCollidersArray,

  // engine refs
  setPlayerRig,
  getPlayerRig,
  setRenderer,
  getRenderer,
  setScene,
  getScene,
  setCamera,
  getCamera,
};
