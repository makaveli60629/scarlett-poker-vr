// js/vip_room.js — VIP Room Shell (8.0)
// Builds a clean room, trim, floor, and corner markers.

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const VIPRoom = {
  group: null,

  build(scene) {
    if (this.group) {
      scene.remove(this.group);
      this.group = null;
    }

    this.group = new THREE.Group();
    this.group.name = "VIPRoom";

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(22, 22),
      new THREE.MeshStandardMaterial({ color: 0x10131c, roughness: 0.95, metalness: 0.0 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = false;
    this.group.add(floor);

    // Walls (simple box room, open top)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0b0f18, roughness: 0.9 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x1b2432, roughness: 0.65 });

    const wallH = 4.0;
    const half = 11;

    const wallN = new THREE.Mesh(new THREE.BoxGeometry(22, wallH, 0.35), wallMat);
    wallN.position.set(0, wallH / 2, -half);
    this.group.add(wallN);

    const wallS = new THREE.Mesh(new THREE.BoxGeometry(22, wallH, 0.35), wallMat);
    wallS.position.set(0, wallH / 2, half);
    this.group.add(wallS);

    const wallE = new THREE.Mesh(new THREE.BoxGeometry(0.35, wallH, 22), wallMat);
    wallE.position.set(half, wallH / 2, 0);
    this.group.add(wallE);

    const wallW = new THREE.Mesh(new THREE.BoxGeometry(0.35, wallH, 22), wallMat);
    wallW.position.set(-half, wallH / 2, 0);
    this.group.add(wallW);

    // Trim band around the room
    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(22.1, 0.18, 22.1),
      trimMat
    );
    trim.position.set(0, 1.15, 0);
    trim.material.emissive = new THREE.Color(0x001018);
    trim.material.emissiveIntensity = 0.25;
    this.group.add(trim);

    // Corner markers (the green balls you liked)
    const mkGeo = new THREE.SphereGeometry(0.18, 16, 16);
    const mkMat = new THREE.MeshStandardMaterial({
      color: 0x00ffaa,
      emissive: 0x00ffaa,
      emissiveIntensity: 1.25,
      roughness: 0.3
    });

    const corners = [
      [-10.2, 0.25, -10.2],
      [10.2, 0.25, -10.2],
      [-10.2, 0.25, 10.2],
      [10.2, 0.25, 10.2],
    ];
    for (const [x, y, z] of corners) {
      const s = new THREE.Mesh(mkGeo, mkMat);
      s.position.set(x, y, z);
      this.group.add(s);
    }

    // Ambient glow
    const glow = new THREE.PointLight(0x33ccff, 0.35, 30);
    glow.position.set(0, 3.5, 0);
    this.group.add(glow);

    scene.add(this.group);
    return this.group;
  }
};
