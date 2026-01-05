// js/state.js
// Single source of truth for shared runtime state + registries.
// Supports BOTH registerZone(configObject) and registerZone(name, box3, onEnter?, onExit?, meta?)

const _interactables = new Map(); // id -> { object3D, onActivate }
const _colliders = new Map();     // id -> object3D
const _zones = new Map();         // id -> zoneRecord

let _camera = null;
let _renderer = null;
let _scene = null;
let _playerRig = null;

let _zonePrevInside = new Set();

// ---------- Helpers ----------
function _idFor(objOrId) {
  if (!objOrId) return null;
  if (typeof objOrId === "string") return objOrId;
  if (objOrId.uuid) return objOrId.uuid;
  if (objOrId.id != null) return String(objOrId.id);
  return null;
}

function _randId(prefix="id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}`;
}

function _getWorldPosFallback(camOrRig) {
  try {
    if (!camOrRig) return null;
    if (camOrRig.getWorldPosition) {
      const p = { x:0, y:0, z:0 };
      // use THREE.Vector3 if available
      if (typeof THREE !== "undefined" && THREE.Vector3) {
        const v = new THREE.Vector3();
        camOrRig.getWorldPosition(v);
        return v;
      }
    }
  } catch {}
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

// ---------- Zones ----------
/**
 * STYLE A (your project uses this):
 *   registerZone({
 *     name, center, radius, yMin, yMax,
 *     mode: "block"|"info"|"trigger",
 *     message, strength
 *   })
 *
 * STYLE B (Box3 style):
 *   registerZone(name, box3, onEnter?, onExit?, meta?)
 */
export function registerZone(a, b, c, d, e) {
  // Style A: config object
  if (a && typeof a === "object" && !b) {
    const cfg = a;
    const id = _randId(cfg.name || "zone");
    _zones.set(id, {
      id,
      type: "sphere",
      name: cfg.name || id,
      center: cfg.center || { x:0, y:0, z:0 },
      radius: cfg.radius ?? 1.0,
      yMin: cfg.yMin ?? -Infinity,
      yMax: cfg.yMax ?? Infinity,
      mode: cfg.mode || "trigger",
      message: cfg.message || "",
      strength: cfg.strength ?? 0.25,
      onEnter: cfg.onEnter || null,
      onExit: cfg.onExit || null,
      meta: cfg.meta || {}
    });
    return id;
  }

  // Style B: name + box3
  const name = a;
  const box3 = b;
  const onEnter = c;
  const onExit = d;
  const meta = e || {};

  const id = _randId(name || "zone");
  _zones.set(id, {
    id,
    type: "box3",
    name: name || id,
    box3,
    onEnter: typeof onEnter === "function" ? onEnter : null,
    onExit: typeof onExit === "function" ? onExit : null,
    meta
  });
  return id;
}

export function unregisterZone(zoneId) {
  if (!zoneId) return false;
  _zones.delete(zoneId);
  _zonePrevInside.delete(zoneId);
  return true;
}

export function getZonesArray() {
  return Array.from(_zones.values());
}

/**
 * tickZones(worldPos)
 * - Call every frame from main/update loop if you want zone behavior.
 * - For now it only tracks enter/exit and provides data to callers.
 */
export function tickZones(worldPos) {
  if (!worldPos) return;

  const nowInside = new Set();

  for (const z of _zones.values()) {
    let inside = false;

    if (z.type === "sphere") {
      // support THREE.Vector3 or plain {x,y,z}
      const dx = (worldPos.x - z.center.x);
      const dz = (worldPos.z - z.center.z);
      const dy = (worldPos.y - (z.center.y ?? worldPos.y));

      const horiz = Math.sqrt(dx*dx + dz*dz);
      const withinY = worldPos.y >= z.yMin && worldPos.y <= z.yMax;
      inside = withinY && (horiz <= z.radius);
    } else if (z.type === "box3") {
      if (z.box3 && typeof z.box3.containsPoint === "function") {
        inside = z.box3.containsPoint(worldPos);
      }
    }

    if (inside) nowInside.add(z.id);

    const wasInside = _zonePrevInside.has(z.id);

    if (inside && !wasInside && typeof z.onEnter === "function") {
      try { z.onEnter(z); } catch (e) { console.warn("zone onEnter error", e); }
    }
    if (!inside && wasInside && typeof z.onExit === "function") {
      try { z.onExit(z); } catch (e) { console.warn("zone onExit error", e); }
    }
  }

  _zonePrevInside = nowInside;
}

// ---------- Convenience aggregate ----------
export const State = {
  setCamera, getCamera,
  setRenderer, getRenderer,
  setScene, getScene,
  setPlayerRig, getPlayerRig,

  registerInteractable,
  unregisterInteractable,
  getInteractablesArray,
  activateObject,

  registerCollider,
  unregisterCollider,
  getCollidersArray,

  registerZone,
  unregisterZone,
  getZonesArray,
  tickZones
};
