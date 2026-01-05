// js/state.js
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const _state = {
  camera: null,
  currentRoom: "vip_room",
  zones: [],
};

export function setCamera(cam) {
  _state.camera = cam || null;
}

export function getCamera() {
  return _state.camera;
}

export function setCurrentRoom(name) {
  _state.currentRoom = String(name || "vip_room");
}

export function getCurrentRoom() {
  return _state.currentRoom;
}

/**
 * Zones: { name, center: THREE.Vector3, radius, yMin, yMax, mode:"block", message, strength }
 */
export function registerZone(z) {
  if (!z) return;
  const zone = {
    name: z.name || `zone_${_state.zones.length}`,
    center: (z.center instanceof THREE.Vector3) ? z.center.clone() : new THREE.Vector3(),
    radius: Number.isFinite(z.radius) ? z.radius : 1.0,
    yMin: Number.isFinite(z.yMin) ? z.yMin : -999,
    yMax: Number.isFinite(z.yMax) ? z.yMax : 999,
    mode: z.mode || "block",
    message: z.message || "",
    strength: Number.isFinite(z.strength) ? z.strength : 0.25,
  };
  _state.zones.push(zone);
}

export function clearZones() {
  _state.zones.length = 0;
}

/**
 * Push player out of "block" zones
 */
export function applyZonesToPlayer(playerPos) {
  if (!playerPos) return;

  for (const z of _state.zones) {
    const y = playerPos.y;
    if (y < z.yMin || y > z.yMax) continue;

    const dx = playerPos.x - z.center.x;
    const dz = playerPos.z - z.center.z;
    const d2 = dx * dx + dz * dz;
    const r = z.radius;

    if (d2 < r * r) {
      // push out
      const d = Math.max(Math.sqrt(d2), 0.0001);
      const nx = dx / d;
      const nz = dz / d;
      const target = r + 0.03;

      playerPos.x = z.center.x + nx * target;
      playerPos.z = z.center.z + nz * target;
    }
  }
}
