// /js/teleport_burst_fx.js — Quest-friendly teleport burst (no shaders)
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export function createTeleportBurstFX({
  ringColor = 0x33ff66,
  sparkColor = 0xb35cff,   // a little purple accent
} = {}) {
  const g = new THREE.Group();
  g.name = "TeleportBurstFX";

  // Ripple ring
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.22, 0.36, 48),
    new THREE.MeshBasicMaterial({
      color: ringColor,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  g.add(ring);

  // Beam
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.20, 2.2, 16, 1, true),
    new THREE.MeshBasicMaterial({
      color: ringColor,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  beam.visible = false;
  g.add(beam);

  // Sparks (single Points object)
  const COUNT = 90;
  const pGeo = new THREE.BufferGeometry();
  const pos = new Float32Array(COUNT * 3);
  const vel = new Float32Array(COUNT * 3);

  for (let i = 0; i < COUNT; i++) {
    pos[i * 3 + 0] = 0;
    pos[i * 3 + 1] = 0.7;
    pos[i * 3 + 2] = 0;

    // random burst direction
    const a = Math.random() * Math.PI * 2;
    const r = 0.4 + Math.random() * 1.0;
    vel[i * 3 + 0] = Math.cos(a) * r * 1.2;
    vel[i * 3 + 1] = 0.6 + Math.random() * 1.3;
    vel[i * 3 + 2] = Math.sin(a) * r * 1.2;
  }

  pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  pGeo.userData.vel = vel;

  const pMat = new THREE.PointsMaterial({
    color: sparkColor,
    size: 0.05,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const sparks = new THREE.Points(pGeo, pMat);
  sparks.visible = false;
  g.add(sparks);

  // FX state
  const fx = {
    group: g,
    ring,
    beam,
    sparks,
    active: false,
    t: 0,
  };

  return fx;
}

export function fireTeleportBurstFX(fx, hitPoint) {
  fx.active = true;
  fx.t = 0;

  fx.group.position.set(hitPoint.x, 0, hitPoint.z);

  fx.ring.visible = true;
  fx.beam.visible = true;
  fx.sparks.visible = true;

  fx.ring.scale.set(1, 1, 1);
  fx.ring.material.opacity = 0.85;

  fx.beam.position.set(0, 1.1, 0);
  fx.beam.material.opacity = 0.55;

  fx.sparks.material.opacity = 0.85;

  // reset sparks positions to origin so burst looks snappy
  const posAttr = fx.sparks.geometry.getAttribute("position");
  for (let i = 0; i < posAttr.count; i++) {
    posAttr.setXYZ(i, 0, 0.7, 0);
  }
  posAttr.needsUpdate = true;
}

export function updateTeleportBurstFX(fx, dt) {
  if (!fx.active) return;

  fx.t += dt;
  const t = fx.t;

  // 0.0 → 0.35 seconds: quick burst
  const ringGrow = 1.0 + t * 2.8;
  fx.ring.scale.set(ringGrow, ringGrow, ringGrow);
  fx.ring.material.opacity = Math.max(0, 0.85 - t * 2.6);

  fx.beam.material.opacity = Math.max(0, 0.55 - t * 2.4);

  // sparks fly out + fall a bit
  const posAttr = fx.sparks.geometry.getAttribute("position");
  const vel = fx.sparks.geometry.userData.vel;

  for (let i = 0; i < posAttr.count; i++) {
    let x = posAttr.getX(i) + vel[i * 3 + 0] * dt;
    let y = posAttr.getY(i) + vel[i * 3 + 1] * dt;
    let z = posAttr.getZ(i) + vel[i * 3 + 2] * dt;

    // gravity-ish
    vel[i * 3 + 1] -= 2.6 * dt;

    posAttr.setXYZ(i, x, y, z);
  }
  posAttr.needsUpdate = true;

  fx.sparks.material.opacity = Math.max(0, 0.85 - t * 3.2);

  // Stop
  if (t > 0.38) {
    fx.active = false;
    fx.ring.visible = false;
    fx.beam.visible = false;
    fx.sparks.visible = false;
  }
}
