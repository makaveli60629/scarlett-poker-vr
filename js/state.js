// js/state.js — unified, no-missing-export state hub

let _scene = null;
let _camera = null;
let _playerRig = null;

let _currentRoom = "VIP";

const _zones = new Map();        // name -> zoneConfig
const _colliders = new Set();    // Object3D
const _interactables = new Map();// id -> { obj, onActivate }

function _sid(obj) {
  if (!obj) return null;
  if (!obj.userData) obj.userData = {};
  if (!obj.userData.__sid) obj.userData.__sid = "sid_" + Math.random().toString(36).slice(2);
  return obj.userData.__sid;
}

// Scene / Camera / Player
export function setScene(s) { _scene = s; }
export function getScene() { return _scene; }

export function setCamera(c) { _camera = c; }
export function getCamera() { return _camera; }

export function setPlayerRig(r) { _playerRig = r; }
export function getPlayerRig() { return _playerRig; }

// Rooms
export function setCurrentRoom(name) { _currentRoom = String(name || "VIP"); }
export function getCurrentRoom() { return _currentRoom; }

// Zones (config-object style)
export function registerZone(cfg) {
  if (!cfg || !cfg.name) return null;
  _zones.set(cfg.name, cfg);
  return cfg.name;
}
export function unregisterZone(name) { return _zones.delete(name); }
export function getZonesArray() { return Array.from(_zones.values()); }

// Colliders
export function registerCollider(obj) { if (obj) _colliders.add(obj); return obj || null; }
export function unregisterCollider(obj) { return _colliders.delete(obj); }
export function getCollidersArray() { return Array.from(_colliders); }

// Interactables
export function registerInteractable(obj, onActivate) {
  const id = _sid(obj);
  if (!id) return null;
  _interactables.set(id, { obj, onActivate: typeof onActivate === "function" ? onActivate : null });
  return id;
}
export function unregisterInteractable(obj) { return _interactables.delete(_sid(obj)); }
export function getInteractablesArray() { return Array.from(_interactables.values()).map(v => v.obj); }
export function activateObject(obj, payload = {}) {
  const id = _sid(obj);
  const entry = id ? _interactables.get(id) : null;
  if (entry?.onActivate) { try { entry.onActivate(obj, payload); } catch {} return true; }
  return false;
}

// Convenience export some modules like
export const State = {
  setScene, getScene,
  setCamera, getCamera,
  setPlayerRig, getPlayerRig,
  setCurrentRoom, getCurrentRoom,
  registerZone, unregisterZone, getZonesArray,
  registerCollider, unregisterCollider, getCollidersArray,
  registerInteractable, unregisterInteractable, getInteractablesArray, activateObject,
};
