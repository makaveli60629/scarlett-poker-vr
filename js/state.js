// js/state.js — Canonical Core (GitHub Pages SAFE)
export const State = {
  scene: null,
  camera: null,
  playerRig: null,

  colliders: new Set(),
  interactables: new Map(), // object -> handler

  zones: [], // { name, center, radius, yMin, yMax, mode, message, strength }
};

export function setScene(scene) {
  State.scene = scene;
}

export function setCamera(camera) {
  State.camera = camera;
}

export function setPlayerRig(playerRig) {
  State.playerRig = playerRig;
}

/**
 * Collider registry (lightweight placeholder).
 * You can later replace with real physics/collision.
 */
export function registerCollider(obj) {
  if (!obj) return;
  State.colliders.add(obj);
}

/**
 * Interactable registry (placeholder).
 * Your interactions.js can use this later.
 */
export function registerInteractable(obj, handler) {
  if (!obj || typeof handler !== "function") return;
  State.interactables.set(obj, handler);
}

/**
 * Zone system: keep player out of restricted areas (boss table).
 * mode: "block" (push out)
 */
export function registerZone(zone) {
  // zone: { name, center, radius, yMin, yMax, mode, message, strength }
  if (!zone?.center || !zone?.radius) return;
  State.zones.push({
    name: zone.name || "zone",
    center: zone.center.clone ? zone.center.clone() : zone.center,
    radius: zone.radius,
    yMin: zone.yMin ?? -999,
    yMax: zone.yMax ?? 999,
    mode: zone.mode || "block",
    message: zone.message || "",
    strength: zone.strength ?? 0.28,
  });
}

export function updateZones(playerRig, onMessage) {
  if (!playerRig) return;

  const p = playerRig.position;
  for (const z of State.zones) {
    if (p.y < z.yMin || p.y > z.yMax) continue;

    const dx = p.x - z.center.x;
    const dz = p.z - z.center.z;
    const dist = Math.hypot(dx, dz);

    if (dist < z.radius) {
      // Push out gently (soft boundary)
      const nx = dist > 0.0001 ? dx / dist : 0;
      const nz = dist > 0.0001 ? dz / dist : 1;

      const targetX = z.center.x + nx * (z.radius + 0.02);
      const targetZ = z.center.z + nz * (z.radius + 0.02);

      // Lerp push (comfort)
      p.x += (targetX - p.x) * z.strength;
      p.z += (targetZ - p.z) * z.strength;

      if (typeof onMessage === "function" && z.message) onMessage(z.message);
    }
  }
}
