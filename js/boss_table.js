// js/boss_table.js — Boss Table + VIP Spectator Rail (Spectator Only)
import * as THREE from "./three.js";
import { registerZone } from "./state.js";
import { SpectatorRail } from "./spectator_rail.js";

export const BossTable = {
  group: null,
  center: new THREE.Vector3(0, 0, -6.5),
  zoneRadius: 4.1,

  build(scene) {
    this.group = new THREE.Group();
    this.group.name = "BossTableArea";
    this.group.position.copy(this.center);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 1.05, 0.6, 28),
      new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.9 })
    );
    base.position.y = 0.3;

    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(2.75, 2.9, 0.2, 44),
      new THREE.MeshStandardMaterial({
        color: 0x5a0b0b,
        roughness: 0.65,
        emissive: 0x120000,
        emissiveIntensity: 0.35,
      })
    );
    top.position.y = 0.92;

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(2.82, 0.11, 14, 56),
      new THREE.MeshStandardMaterial({ color: 0x2b1b10, roughness: 0.75 })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 1.0;

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.28, 0.22, 18),
      new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.6,
        emissive: 0x003322,
        emissiveIntensity: 0.6,
      })
    );
    pedestal.position.set(0, 1.05, 0);

    this.group.add(base, top, rim, pedestal);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(this.zoneRadius, 0.06, 10, 90),
      new THREE.MeshStandardMaterial({
        color: 0x00ffaa,
        emissive: 0x00ffaa,
        emissiveIntensity: 1.6,
        roughness: 0.35,
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.03;
    this.group.add(ring);

    const a = new THREE.PointLight(0x00ffaa, 0.65, 18);
    a.position.set(0, 2.6, 0);
    this.group.add(a);

    const b = new THREE.PointLight(0xff3366, 0.45, 18);
    b.position.set(2.5, 2.1, 2.5);
    this.group.add(b);

    scene.add(this.group);

    SpectatorRail.build(scene, this.center, this.zoneRadius + 0.35, { postCount: 20 });

    registerZone({
      name: "boss_table_zone",
      center: this.center,
      radius: this.zoneRadius,
      yMin: -2,
      yMax: 4,
      mode: "block",
      message: "Boss Table: Spectator Only",
      strength: 0.32,
    });

    return this.group;
  },
};
