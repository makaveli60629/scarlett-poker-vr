// /js/table_6_oval.js
// Scarlett Poker VR — 6-Seat OVAL Table (uses FeltGenerator + TableFactory style)
// Drop-in builder that returns: { group, seatPositions, passRing, potRing, top, rail }

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { FeltGenerator } from "./felt_generator.js";

export const Table6Oval = {
  build({
    scene,
    position = new THREE.Vector3(0, 0, 0),
    tableY = 0.95,
    theme = "classic_green", // classic_green / emerald_lux / black_gold / custom
    feltSize = 2048,
    title = "SCARLETT POKER",
    subtitle = "NO LIMIT HOLD'EM",
  } = {}) {
    if (!scene) throw new Error("Table6Oval.build requires { scene }");

    const group = new THREE.Group();
    group.position.copy(position);
    scene.add(group);

    // --- Felt texture (OVAL + 6 seats) ---
    const felt = FeltGenerator.make({
      theme,
      seats: 6,
      shape: "oval",
      size: feltSize,
      title,
      subtitle,
    });

    // --- Dimensions ---
    const radius = 2.35;        // base radius used everywhere
    const ovalX  = 1.35;        // oval stretch factor on X
    const seatCount = 6;

    // --- Materials ---
    const feltMat = new THREE.MeshStandardMaterial({
      map: felt.texture,
      roughness: 0.92,
      metalness: 0.02,
    });

    const railMat = new THREE.MeshStandardMaterial({
      color: 0x101010,
      roughness: 0.55,
      metalness: 0.12,
    });

    const glowColor = new THREE.Color(felt.theme.glow);
    const glowMat = new THREE.MeshStandardMaterial({
      color: glowColor,
      emissive: glowColor,
      emissiveIntensity: 2.2,
      roughness: 0.25,
      metalness: 0.08,
      transparent: true,
      opacity: 0.95,
    });

    // --- Table top (felt) ---
    const top = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.18, 64), feltMat);
    top.position.y = tableY;
    top.scale.set(ovalX, 1, 1); // OVAL
    group.add(top);

    // --- Rail ---
    const rail = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.14, 18, 80), railMat);
    rail.rotation.x = Math.PI / 2;
    rail.position.y = tableY + 0.10;
    rail.scale.set(ovalX, 1, 1);
    group.add(rail);

    // --- Pedestal ---
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 0.9, 24), railMat);
    pedestal.position.y = 0.45;
    group.add(pedestal);

    // --- Pass line ring (chip line) ---
    const passRing = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.70, 0.028, 12, 120), glowMat);
    passRing.rotation.x = Math.PI / 2;
    passRing.position.y = tableY + 0.02;
    passRing.scale.set(ovalX, 1, 1);
    group.add(passRing);

    // --- Pot ring (drop zone) ---
    const potRing = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.22, 0.020, 12, 100), glowMat.clone());
    potRing.material.emissiveIntensity = 1.6;
    potRing.rotation.x = Math.PI / 2;
    potRing.position.y = tableY + 0.02;
    potRing.scale.set(1.20, 1, 1); // slightly oval but less than the table
    group.add(potRing);

    // --- Seat positions (6) — world coordinates + facing ---
    // seatRadius is tuned for the oval stretch so seats sit nicely around the table.
    const seatRadius = radius * 1.55; // good for oval layout
    const seatPositions = [];

    for (let i = 0; i < seatCount; i++) {
      const a = (i / seatCount) * Math.PI * 2;
      const localX = Math.cos(a) * seatRadius * ovalX; // stretch X for oval
      const localZ = Math.sin(a) * seatRadius;

      seatPositions.push({
        index: i,
        position: new THREE.Vector3(localX, 0, localZ).add(position),
        facingY: -a + Math.PI / 2, // rotate to face table center
      });
    }

    // --- helpers for chip logic later ---
    const passRadius = radius * 0.70 * 1.18; // oval-adjusted approx
    const potRadius = radius * 0.22 * 1.10;

    function _toTableLocalXZ(worldPos) {
      const p = worldPos.clone().sub(position);
      p.x /= ovalX; // un-stretch for distance checks
      return p;
    }

    return {
      group,
      top,
      rail,
      pedestal,
      passRing,
      potRing,
      seatPositions,
      params: { shape: "oval", seats: 6, theme },
      isInsidePassLine(worldPos) {
        const p = _toTableLocalXZ(worldPos);
        const d = Math.sqrt(p.x * p.x + p.z * p.z);
        return Math.abs(d - passRadius) < 0.12;
      },
      isInsidePot(worldPos) {
        const p = _toTableLocalXZ(worldPos);
        const d = Math.sqrt(p.x * p.x + p.z * p.z);
        return d < potRadius;
      },
    };
  },
};
