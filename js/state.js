// js/state.js
// Single source of truth for shared app state + registries.
// Works with ES module named exports AND a State object export.

let _renderer = null;
let _scene = null;
let _camera = null;
let _playerRig = null;

// Interactables registry: object3D.uuid -> { object3D, onActivate, meta }
const _interactables = new Map();

// Colliders registry: object3D.uuid -> { object3D, meta }
const _colliders = new Map();

// ----------------------
// Core setters/getters
// ----------------------
function setRenderer(r) { _renderer = r; }
function getRenderer() { return _renderer; }

function setScene(s) { _scene = s; }
function getScene() { return _scene; }

function setCamera(c) { _camera = c; }
function getCamera() { return _camera; }

function setPlayerRig(rig) { _playerRig = rig; }
function getPlayerRig() { return _playerRig; }

// ----------------------
// Interactables
// ----------------------
function registerInteractable(object3D, onActivate = null, meta = {}) {
  if (!object3D || !object3D.uuid) return;
  _interactables.set(object3D.uuid, { object3D, onActivate, meta });
}

function unregisterInteractable(object3D) {
  if (!object3D || !object3D.uuid) return;
  _interactables.delete(object3D.uuid);
}

function getInteractablesArray() {
  // Return ONLY Object3Ds (most raycasters want this)
  return Array.from(_interactables.values()).map(v => v.object3D).filter(Boolean);
}

function activateObject(hitObject3D, payload = {}) {
  // Given a hit object from raycast, walk up parents until we find a registered interactable
  let o = hitObject3D;
  while (o) {
    const entry = o.uuid ? _interactables.get(o.uuid) : null;
    if (entry) {
      try {
        if (typeof entry.onActivate === "function") {
          entry.onActivate(entry.object3D, payload);
          return true;
        }
        // If no callback, still count as "activated"
        return true;
      } catch (e) {
        console.warn("activateObject error:", e);
        return false;
      }
    }
    o = o.parent || null;
  }
  return false;
}

// ----------------------
// Colliders
// ----------------------
function registerCollider(object3D, meta = {}) {
  if (!object3D || !object3D.uuid) return;
  _colliders.set(object3D.uuid, { object3D, meta });
}

function unregisterCollider(object3D) {
  if (!object3D || !object3D.uuid) return;
  _colliders.delete(object3D.uuid);
}

function getCollidersArray() {
  // Return ONLY Object3Ds
  return Array.from(_colliders.values()).map(v => v.object3D).filter(Boolean);
}

// ----------------------
// Optional helpers
// ----------------------
function clearAllRegistries() {
  _interactables.clear();
  _colliders.clear();
}

// ----------------------
// STATE OBJECT EXPORT
// ----------------------
export const State = {
  // engine references
  setRenderer, getRenderer,
  setScene, getScene,
  setCamera, getCamera,
  setPlayerRig, getPlayerRig,

  // registries
  registerInteractable,
  unregisterInteractable,
  getInteractablesArray,
  activateObject,

  registerCollider,
  unregisterCollider,
  getCollidersArray,

  // helpers
  clearAllRegistries
};

// ----------------------
// NAMED EXPORTS (compat)
// ----------------------
export {
  setRenderer, getRenderer,
  setScene, getScene,
  setCamera, getCamera,
  setPlayerRig, getPlayerRig,

  registerInteractable,
  unregisterInteractable,
  getInteractablesArray,
  activateObject,

  registerCollider,
  unregisterCollider,
  getCollidersArray,

  clearAllRegistries
};
