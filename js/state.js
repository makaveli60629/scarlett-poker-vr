// js/state.js
// Single source of truth for shared runtime state + registries
// IMPORTANT: This file must export the functions other modules import by name.

const _interactables = new Map(); // id -> { object3D, onActivate }
const _colliders = new Map();     // id -> object3D
const _zones = new Map();         // id -> { name, box3, onEnter, onExit, meta }

let _camera = null;
let _renderer = null;
let _scene = null;
let _playerRig = null;

let _lastZoneHits = new Set();

// ---------- Helpers ----------
function _idFor(objOrId) {
  if (!objOrId) return null;
  if (typeof objOrId === "string") return objOrId;
  if (objOrId.uuid) return objOrId.uuid;
  if (objOrId.id != null) return String(objOrId.id);
  return null;
}

// ---------- Camera / Scene / Renderer / Player ----------
export function setCamera(cam) { _camera = cam; }
export function getCamera() { return _camera; }

export function setRenderer(r) { _renderer = r; }
export function getRenderer() { return _renderer; }

export function setScene(s) { _scene = s; }
export function getScene() { return _scene; }

export function setPlayerRig(rig) { _playerRig = rig; }
export function getPlayerRig() { return _playerRig; }

// ---------- Interactables ----------
export function registerInteractable(object3D, onActivate) {
  const id = _idFor(object3D);
  if (!id) return null;
  _interactables.set(id, { object3D, onActivate });
  return id;
}

export function unregisterInteractable(object3DOrId) {
  const id = _idFor(object3DOrId);
  if (!id) return false;
  return _interactables.delete(id);
}

export function getInteractablesArray() {
  return Array.from(_interactables.values()).map(v => v.object3D);
}

// Optional helper some modules use:
export function activateObject(object3D) {
  const id = _idFor(object3D);
  if (!id) return false;
  const entry = _interactables.get(id);
  if (!entry || typeof entry.onActivate !== "function") return false;
  try { entry.onActivate(entry.object3D); return true; }
  catch (e) { console.warn("activateObject error:", e); return false; }
}

// ---------- Colliders ----------
export function registerCollider(object3D) {
  const id = _idFor(object3D);
  if (!id) return null;
  _colliders.set(id, object3D);
  return id;
}

export function unregisterCollider(object3DOrId) {
  const id = _idFor(object3DOrId);
  if (!id) return false;
  return _colliders.delete(id);
}

export function getCollidersArray() {
  return Array.from(_colliders.values());
}

// ---------- Zones (THIS FIXES YOUR ERROR) ----------
/**
 * registerZone(name, box3, onEnter?, onExit?, meta?)
 * - name: string label
 * - box3: THREE.Box3 (or any object with containsPoint(vec3))
 */
export function registerZone(name, box3, onEnter, onExit, meta = {}) {
  const id = `${name || "zone"}_${Math.random().toString(16).slice(2)}`;
  _zones.set(id, { name, box3, onEnter, onExit, meta });
  return id;
}

export function unregisterZone(zoneId) {
  if (!zoneId) return false;
  _zones.delete(zoneId);
  // also clean tracking
  _lastZoneHits.delete(zoneId);
  return true;
}

export function getZonesArray() {
  return Array.from(_zones.entries()).map(([id, z]) => ({ id, ...z }));
}

/**
 * Optional: zone tick utility if any module wants it.
 * Call this each frame with player/camera world position.
 */
export function tickZones(worldPos) {
  if (!worldPos) return;

  const nowHits = new Set();

  for (const [id, z] of _zones.entries()) {
    if (!z?.box3 || typeof z.box3.containsPoint !== "function") continue;

    const inside = z.box3.containsPoint(worldPos);
    if (inside) nowHits.add(id);

    const wasInside = _lastZoneHits.has(id);

    if (inside && !wasInside && typeof z.onEnter === "function") {
      try { z.onEnter({ id, ...z }); } catch (e) { console.warn("zone onEnter error", e); }
    }

    if (!inside && wasInside && typeof z.onExit === "function") {
      try { z.onExit({ id, ...z }); } catch (e) { console.warn("zone onExit error", e); }
    }
  }

  _lastZoneHits = nowHits;
}

// ---------- Convenience aggregate (optional) ----------
export const State = {
  // core
  setCamera, getCamera,
  setRenderer, getRenderer,
  setScene, getScene,
  setPlayerRig, getPlayerRig,

  // interactables
  registerInteractable,
  unregisterInteractable,
  getInteractablesArray,
  activateObject,

  // colliders
  registerCollider,
  unregisterCollider,
  getCollidersArray,

  // zones
  registerZone,
  unregisterZone,
  getZonesArray,
  tickZones,
};
