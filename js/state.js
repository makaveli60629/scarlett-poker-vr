// js/state.js — Patch 7.0 FULL (single source of truth, no duplicate exports)
// Fixes: "already declared" + missing exports like registerCollider / unregisterInteractable
// Keeps it lightweight so every module can import safely on GitHub.

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

let _scene = null;
let _camera = null;
let _playerRig = null;

// --- registries (optional but prevents import errors) ---
const _colliders = new Set();
const _interactables = new Set();

// --- zones (optional) ---
let _currentRoom = "Lobby";

export function setScene(scene) { _scene = scene; }
export function getScene() { return _scene; }

export function setCamera(camera) { _camera = camera; }
export function getCamera() { return _camera; }

export function setPlayerRig(rig) { _playerRig = rig; }
export function getPlayerRig() { return _playerRig; }

export function setCurrentRoom(name) { _currentRoom = name || "Lobby"; }
export function getCurrentRoom() { return _currentRoom; }

// Colliders API (safe no-op if unused)
export function registerCollider(obj) {
  if (obj) _colliders.add(obj);
}
export function unregisterCollider(obj) {
  if (obj) _colliders.delete(obj);
}
export function getCollidersArray() {
  return Array.from(_colliders);
}

// Interactables API (safe no-op if unused)
export function registerInteractable(obj) {
  if (obj) _interactables.add(obj);
}
export function unregisterInteractable(obj) {
  if (obj) _interactables.delete(obj);
}
export function getInteractablesArray() {
  return Array.from(_interactables);
}

// Simple “zone update” hook used in main loop
export function updateZones(playerRig, onRoomChange) {
  // This stays conservative: room changes are managed by RoomManager,
  // but we keep the function so imports never break.
  if (!playerRig) return;
  if (typeof onRoomChange === "function") {
    // no automatic room switching here in 7.0
  }
}

// Utility for modules that need a reusable vector
export const V3 = {
  tmp: new THREE.Vector3(),
  tmp2: new THREE.Vector3()
};
