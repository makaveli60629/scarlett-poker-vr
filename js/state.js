// js/state.js — Shared State + Zones (STABLE EXPORTS)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const S = {
  camera: null,
  currentRoom: "VIP_ROOM",
  zones: [], // { name, center, radius, yMin, yMax, mode, message, strength }
};

export function setCamera(cam) {
  S.camera = cam;
}

export function getCamera() {
  return S.camera;
}

export function setCurrentRoom(name) {
  S.currentRoom = String(name || "VIP_ROOM");
}

export function getCurrentRoom() {
  return S.currentRoom;
}

// Used by BossTable (and future room blockers)
export function registerZone(zone) {
  if (!zone || !zone.center) return;
  S.zones.push({
    name: zone.name || `zone_${S.zones.length}`,
    center: zone.center.clone ? zone.center.clone() : new THREE.Vector3(zone.center.x, zone.center.y, zone.center.z),
    radius: zone.radius ?? 2,
    yMin: zone.yMin ?? -10,
    yMax: zone.yMax ?? 10,
    mode: zone.mode || "block", // "block" for now
    message: zone.message || "",
    strength: zone.strength ?? 0.25,
  });
}

export function clearZones() {
  S.zones.length = 0;
}

// Pushes player OUT of restricted circles
export function applyZonesToPosition(pos) {
  if (!pos) return null;

  const out = new THREE.Vector3(0, 0, 0);
  for (const z of S.zones) {
    if (pos.y < z.yMin || pos.y > z.yMax) continue;

    const dx = pos.x - z.center.x;
    const dz = pos.z - z.center.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < z.radius) {
      // push outward
      const nx = dist === 0 ? 1 : dx / dist;
      const nz = dist === 0 ? 0 : dz / dist;
      const push = (z.radius - dist) + 0.08;
      out.x += nx * push;
      out.z += nz * push;
    }
  }
  return out.lengthSq() > 0 ? out : null;
}
