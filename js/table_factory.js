// /js/table_factory.js
// Builds a casino-style poker table with:
// - Felt (runtime generated)
// - Rail
// - Glow chip "pass line" ring (separate mesh)
// - Seat positions (6 or 8)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { FeltGenerator } from "./felt_generator.js";

export const TableFactory = {
  build({
    scene,
    position = new THREE.Vector3(0,0,0),
    shape = "oval",     // "round" | "oval"
    seats = 6,          // 6 | 8
    theme = "classic_green",
    tableY = 0.95,
    feltSize = 2048,
    title = "SCARLETT POKER",
  } = {}) {
    const group = new THREE.Group();
    group.position.copy(position);
    scene.add(group);

    const felt = FeltGenerator.make({ theme, seats, shape, size: feltSize, title });

    // Table dimensions
    const isOval = shape === "oval";
    const radius = 2.35;

    // Felt top mesh
    const feltMat = new THREE.MeshStandardMaterial({
      map: felt.texture,
      roughness: 0.92,
      metalness: 0.02,
    });

    const topGeo = new THREE.CylinderGeometry(radius, radius, 0.18, 64);
    const top = new THREE.Mesh(topGeo, feltMat);
    top.position.y = tableY;
    top.rotation.y = Math.PI; // flip if you want alignment
    if (isOval) top.scale.set(1.35, 1.0, 1.0); // oval stretch
    group.add(top);

    // Rail (rim)
    const railMat = new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 0.55, metalness: 0.1 });
    const rail = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.14, 18, 80), railMat);
    rail.rotation.x = Math.PI / 2;
    rail.position.y = tableY + 0.10;
    if (isOval) rail.scale.set(1.35, 1.0, 1.0);
    group.add(rail);

    // Pedestal
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 0.9, 24), railMat);
    pedestal.position.y = 0.45;
    group.add(pedestal);

    // Chip pass line ring (glowing) — this is what you asked for
    const glowColor = new THREE.Color(felt.theme.glow);
    const passMat = new THREE.MeshStandardMaterial({
      color: glowColor,
      emissive: glowColor,
      emissiveIntensity: 2.2,
      roughness: 0.25,
      metalness: 0.1,
      transparent: true,
      opacity: 0.95,
    });

    const passRing = new THREE.Mesh(new THREE.TorusGeometry(radius*0.70, 0.028, 12, 120), passMat);
    passRing.rotation.x = Math.PI/2;
    passRing.position.y = tableY + 0.02;
    if (isOval) passRing.scale.set(1.35, 1.0, 1.0);
    group.add(passRing);

    // Pot circle "drop zone" — optional helper
    const potRing = new THREE.Mesh(new THREE.TorusGeometry(radius*0.22, 0.020, 12, 100), passMat.clone());
    potRing.material.emissiveIntensity = 1.6;
    potRing.rotation.x = Math.PI/2;
    potRing.position.y = tableY + 0.02;
    if (isOval) potRing.scale.set(1.20, 1.0, 1.0);
    group.add(potRing);

    // Seat positions (world-space relative to table)
    const seatRadius = radius * (isOval ? 1.55 : 1.38);
    const seatPositions = [];
    for (let i=0;i<seats;i++){
      const a = (i/seats)*Math.PI*2;
      const x = Math.cos(a) * seatRadius * (isOval ? 1.35 : 1.0);
      const z = Math.sin(a) * seatRadius;
      seatPositions.push({
        index: i,
        position: new THREE.Vector3(x, 0, z).add(new THREE.Vector3(position.x, 0, position.z)),
        facingY: -a + Math.PI/2,
      });
    }

    // Detection helpers (for chip logic later)
    const passRadius = radius * 0.70 * (isOval ? 1.18 : 1.0);
    const potRadius  = radius * 0.22 * (isOval ? 1.10 : 1.0);

    const api = {
      group,
      top,
      rail,
      passRing,
      potRing,
      seatPositions,
      params: { shape, seats, theme },
      isInsidePassLine(worldPos) {
        // approximate using XZ distance to table center in table-local space
        const p = worldPos.clone().sub(position);
        // normalize oval: squash x if oval
        if (isOval) p.x /= 1.35;
        const d = Math.sqrt(p.x*p.x + p.z*p.z);
        return Math.abs(d - passRadius) < 0.12;
      },
      isInsidePot(worldPos) {
        const p = worldPos.clone().sub(position);
        if (isOval) p.x /= 1.20;
        const d = Math.sqrt(p.x*p.x + p.z*p.z);
        return d < potRadius;
      },
    };

    return api;
  },
};
