// /js/teleport_fx.js — lightweight VR-safe teleport FX
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export function createTeleportFX() {
  const g = new THREE.Group();

  // --- Landing ring ---
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.28, 0.36, 40),
    new THREE.MeshBasicMaterial({
      color: 0x33ff99,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  g.add(ring);

  // --- Vertical energy beam ---
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.08, 2.0, 12, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0x66ffcc,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
    })
  );
  beam.visible = false;
  g.add(beam);

  return {
    group: g,
    ring,
    beam,
    active: false,
    t: 0,
  };
}

export function updateTeleportFX(fx, dt) {
  if (!fx.active) return;

  fx.t += dt;

  // ring pulse
  const pulse = 1 + Math.sin(fx.t * 6) * 0.08;
  fx.ring.scale.set(pulse, pulse, pulse);

  // beam fade
  fx.beam.material.opacity = Math.max(0, 0.6 - fx.t * 2);

  // auto stop
  if (fx.t > 0.4) {
    fx.active = false;
    fx.beam.visible = false;
  }
}

export function fireTeleportFX(fx, position) {
  fx.t = 0;
  fx.active = true;

  fx.ring.position.set(position.x, 0.03, position.z);
  fx.ring.visible = true;

  fx.beam.position.set(position.x, 1.0, position.z);
  fx.beam.visible = true;
  fx.beam.material.opacity = 0.6;
}
