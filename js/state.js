// js/state.js — Unified State Hub (prevents export-mismatch crashes)

const _interactables = new Map(); // id -> { obj, onActivate }
const _colliders = new Map();     // id -> obj
const _zones = new Map();         // name -> zone
let _camera = null;
let _currentRoom = "lobby";

function _idFor(obj) {
  if (!obj) return null;
  if (!obj.userData) obj.userData = {};
  if (!obj.userData.__sid) obj.userData.__sid = "sid_" + Math.random().toString(36).slice(2);
  return obj.userData.__sid;
}

// ---- Camera ----
export function setCamera(cam) { _camera = cam; }
export function getCamera() { return _camera; }

// ---- Rooms ----
export function setCurrentRoom(name) { _currentRoom = String(name || "lobby"); }
export function getCurrentRoom() { return _currentRoom; }

// ---- Interactables ----
export function registerInteractable(object3D, onActivate) {
  const id = _idFor(object3D);
  if (!id) return null;
  _interactables.set(id, { obj: object3D, onActivate: typeof onActivate === "function" ? onActivate : null });
  return id;
}

export function unregisterInteractable(object3D) {
  const id = _idFor(object3D);
  if (!id) return false;
  return _interactables.delete(id);
}

export function getInteractablesArray() {
  return Array.from(_interactables.values()).map(v => v.obj).filter(Boolean);
}

export function activateObject(object3D, payload = {}) {
  const id = _idFor(object3D);
  const entry = id ? _interactables.get(id) : null;
  if (entry?.onActivate) {
    try { entry.onActivate(object3D, payload); }
    catch (e) { console.warn("activateObject error:", e); }
    return true;
  }
  return false;
}

// ---- Colliders ----
export function registerCollider(object3D) {
  const id = _idFor(object3D);
  if (!id) return null;
  _colliders.set(id, object3D);
  return id;
}

export function unregisterCollider(object3D) {
  const id = _idFor(object3D);
  if (!id) return false;
  return _colliders.delete(id);
}

export function getCollidersArray() {
  return Array.from(_colliders.values()).filter(Boolean);
}

// ---- Zones (for VIP rail / no-entry areas etc.) ----
export function registerZone(zone) {
  if (!zone || !zone.name) return null;
  _zones.set(zone.name, zone);
  return zone.name;
}

export function unregisterZone(name) {
  return _zones.delete(name);
}

export function getZonesArray() {
  return Array.from(_zones.values());
}

// Optional convenience object exports (some files import { State }).
export const State = {
  setCamera, getCamera,
  setCurrentRoom, getCurrentRoom,
  registerInteractable, unregisterInteractable, getInteractablesArray, activateObject,
  registerCollider, unregisterCollider, getCollidersArray,
  registerZone, unregisterZone, getZonesArray,
};
