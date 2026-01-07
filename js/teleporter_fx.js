// /js/teleporter_fx.js — Quest-friendly teleporter FX (no postprocessing)
import * as THREE from "./three.js";

export function createTeleporterFX({
  position = new THREE.Vector3(0, 0, 0),
  radius = 0.85,
  height = 2.2,
  color = 0xb35cff, // purple
} = {}) {
  const g = new THREE.Group();
  g.name = "TeleporterFX";
  g.position.copy(position);

  // ---------- Ring (electric) ----------
  const ringGeo = new THREE.RingGeometry(radius * 0.85, radius, 64);
  const ringMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  ring.name = "fx_ring";
  g.add(ring);

  // ---------- Inner swirl (very subtle) ----------
  const swirlGeo = new THREE.RingGeometry(radius * 0.25, radius * 0.8, 64);
  const swirlMat = new THREE.MeshBasicMaterial({
    color: 0x6a2cff,
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const swirl = new THREE.Mesh(swirlGeo, swirlMat);
  swirl.rotation.x = -Math.PI / 2;
  swirl.position.y = 0.031;
  swirl.name = "fx_swirl";
  g.add(swirl);

  // ---------- Glow column (fake volumetric beam) ----------
  const beamGeo = new THREE.CylinderGeometry(radius * 0.35, radius * 0.55, height, 24, 1, true);
  const beamMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.10,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.y = height * 0.5;
  beam.name = "fx_beam";
  g.add(beam);

  // ---------- Particles (single Points object) ----------
  const particleCount = 80;
  const pGeo = new THREE.BufferGeometry();
  const pos = new Float32Array(particleCount * 3);
  const vel = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    // spawn around ring
    const a = Math.random() * Math.PI * 2;
    const r = radius * (0.35 + Math.random() * 0.65);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const y = 0.05 + Math.random() * height;

    pos[i * 3 + 0] = x;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = z;

    // slow upward drift + gentle swirl
    vel[i * 3 + 0] = (Math.random() - 0.5) * 0.08;
    vel[i * 3 + 1] = 0.06 + Math.random() * 0.10;
    vel[i * 3 + 2] = (Math.random() - 0.5) * 0.08;
  }

  pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  pGeo.userData.vel = vel;

  const pMat = new THREE.PointsMaterial({
    color: 0xe7c7ff,
    size: 0.045,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const points = new THREE.Points(pGeo, pMat);
  points.name = "fx_particles";
  g.add(points);

  // ---------- A soft point light (cheap, looks good) ----------
  const light = new THREE.PointLight(color, 0.65, 6.5);
  light.position.set(0, 1.2, 0);
  light.name = "fx_light";
  g.add(light);

  // State for update + bursts
  g.userData._t = 0;
  g.userData._radius = radius;
  g.userData._height = height;

  // Public API
  g.userData.update = (dt) => updateTeleporterFX(g, dt);
  g.userData.pulse = () => pulseTeleporterFX(g);

  return g;
}

export function updateTeleporterFX(group, dt) {
  const t = (group.userData._t += dt);

  const ring = group.getObjectByName("fx_ring");
  const swirl = group.getObjectByName("fx_swirl");
  const beam = group.getObjectByName("fx_beam");
  const points = group.getObjectByName("fx_particles");
  const light = group.getObjectByName("fx_light");

  // Smooth pulse
  const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
  if (ring) ring.material.opacity = 0.42 + pulse * 0.22;
  if (swirl) swirl.material.opacity = 0.10 + pulse * 0.12;

  // Gentle rotation
  if (ring) ring.rotation.z = t * 0.35;
  if (swirl) swirl.rotation.z = -t * 0.55;

  // Beam breathe
  if (beam) beam.material.opacity = 0.07 + pulse * 0.06;

  // Light flicker (tiny)
  if (light) light.intensity = 0.55 + pulse * 0.35;

  // Particle drift (wrap around top)
  if (points) {
    const posAttr = points.geometry.getAttribute("position");
    const vel = points.geometry.userData.vel;
    const h
