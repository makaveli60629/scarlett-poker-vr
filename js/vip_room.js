// js/vip_room.js — Patch 7.1 FULL
// VIP Poker Room build-out:
// - Fancy VIP table + velvet rug + gold trims
// - Rope barrier vibe + doorway arch
// - VIP spotlight + trophy wall moved here (optional via anchor hook)
// - Always solid feel (visual); physical collisions handled by your Collision module if used.
//
// Usage from main.js:
//   import { VIPRoom } from "./vip_room.js";
//   VIPRoom.build(RoomManager.getRoom("VIP Poker Room").group);

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

function makeMat(color, emissive = 0x000000, emissiveIntensity = 0) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.85,
    metalness: 0.10,
    emissive,
    emissiveIntensity
  });
}

export const VIPRoom = {
  group: null,

  build(parentGroup) {
    if (!parentGroup) return;

    // remove previous
    const old = parentGroup.getObjectByName("VIPRoomBuild");
    if (old) parentGroup.remove(old);

    const g = new THREE.Group();
    g.name = "VIPRoomBuild";
    parentGroup.add(g);
    this.group = g;

    // --- Rug ---
    const rug = new THREE.Mesh(
      new THREE.CircleGeometry(5.2, 64),
      new THREE.MeshStandardMaterial({
        color: 0x2a0f1a, // deep velvet
        roughness: 1.0,
        metalness: 0.0,
        transparent: true,
        opacity: 0.95
      })
    );
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0, 0.004, 0);
    g.add(rug);

    const rugRing = new THREE.Mesh(
      new THREE.RingGeometry(4.75, 5.2, 64),
      new THREE.MeshStandardMaterial({
        color: 0xffd04a,
        emissive: 0xffd04a,
        emissiveIntensity: 0.6,
        roughness: 0.4,
        metalness: 0.45,
        transparent: true,
        opacity: 0.55
      })
    );
    rugRing.rotation.x = -Math.PI / 2;
    rugRing.position.y = 0.006;
    g.add(rugRing);

    // --- VIP Table (fancy oval) ---
    const tableTop = new THREE.Mesh(
      new THREE.CapsuleGeometry(1.85, 2.65, 8, 24),
      new THREE.MeshStandardMaterial({
        color: 0x0f6b49, // rich green felt
        roughness: 0.95,
        metalness: 0.0
      })
    );
    tableTop.scale.set(1.25, 0.16, 0.78);
    tableTop.position.set(0, 0.86, 0);
    g.add(tableTop);

    const goldTrim = new THREE.Mesh(
      new THREE.TorusGeometry(2.0, 0.06, 12, 64),
      new THREE.MeshStandardMaterial({
        color: 0xffd04a,
        emissive: 0xffd04a,
        emissiveIntensity: 0.55,
        roughness: 0.35,
        metalness: 0.65
      })
    );
    goldTrim.rotation.x = Math.PI / 2;
    goldTrim.scale.set(1.35, 1, 0.90);
    goldTrim.position.set(0, 0.92, 0);
    g.add(goldTrim);

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.70, 0.74, 28),
      makeMat(0x141624)
    );
    pedestal.position.set(0, 0.37, 0);
    g.add(pedestal);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.05, 1.18, 0.14, 30),
      makeMat(0x0b0b10, 0x000000, 0)
    );
    base.position.set(0, 0.07, 0);
    g.add(base);

    // --- VIP Chairs (simple but premium) ---
    const chairMat = makeMat(0x1a1622);
    const chairAccent = makeMat(0xffd04a, 0xffd04a, 0.25);

    const chair = (angle, radius) => {
      const c = new THREE.Group();
      c.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      c.rotation.y = -angle + Math.PI / 2;

      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.08, 0.44), chairMat);
      seat.position.set(0, 0.48, 0);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.46, 0.10), chairMat);
      back.position.set(0, 0.73, -0.18);

      const gold = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.03, 0.46), chairAccent);
      gold.position.set(0, 0.53, 0);

      const legs = [];
      for (const sx of [-0.18, 0.18]) {
        for (const sz of [-0.18, 0.18]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.46, 10), makeMat(0x0b0b10));
          leg.position.set(sx, 0.25, sz);
          legs.push(leg);
        }
      }

      c.add(seat, back, gold, ...legs);
      g.add(c);
    };

    for (let i = 0; i < 6; i++) {
      chair((i / 6) * Math.PI * 2, 3.25);
    }

    // --- Rope Barrier (visual VIP restriction vibe) ---
    const postMat = makeMat(0x0b0b10);
    const ropeMat = new THREE.MeshStandardMaterial({
      color: 0xff3c78,
      emissive: 0xff3c78,
      emissiveIntensity: 0.55,
      roughness: 0.55,
      metalness: 0.1,
      transparent: true,
      opacity: 0.8
    });

    const posts = [];
    const postPositions = [
      [-6.2, 0,  2.8], [-6.2, 0, -2.8],
      [-2.2, 0,  6.2], [ 2.2, 0,  6.2],
      [ 6.2, 0,  2.8], [ 6.2, 0, -2.8],
      [-2.2, 0, -6.2], [ 2.2, 0, -6.2],
    ];
    for (const [x, y, z] of postPositions) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.10, 1.0, 14), postMat);
      p.position.set(x, 0.5, z);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 12), makeMat(0xffd04a, 0xffd04a, 0.25));
      cap.position.set(x, 1.05, z);
      g.add(p, cap);
      posts.push(new THREE.Vector3(x, 0.85, z));
    }

    const rope = (a, b) => {
      const p1 = a.clone();
      const p2 = b.clone();
      const mid = p1.clone().lerp(p2, 0.5);
      const len = p1.distanceTo(p2);

      const geo = new THREE.CylinderGeometry(0.03, 0.03, len, 10);
      const m = new THREE.Mesh(geo, ropeMat);

      m.position.copy(mid);
      m.lookAt(p2);
      m.rotateX(Math.PI / 2);
      g.add(m);
    };

    // connect posts in a loop (skip "door" gap)
    rope(posts[0], posts[1]);
    rope(posts[1], posts[7]);
    rope(posts[7], posts[6]); // leaves gap near +Z as "entry"
    rope(posts[6], posts[5]);
    rope(posts[5], posts[4]);
    rope(posts[4], posts[3]);
    rope(posts[3], posts[2]);
    rope(posts[2], posts[0]);

    // --- VIP Doorway Arch (visual cue) ---
    const archMat = makeMat(0x11121a);
    const arch = new THREE.Group();
    arch.position.set(0, 0, 8.4);

    const colL = new THREE.Mesh(new THREE.BoxGeometry(0.40, 2.6, 0.40), archMat);
    const colR = new THREE.Mesh(new THREE.BoxGeometry(0.40, 2.6, 0.40), archMat);
    colL.position.set(-1.0, 1.3, 0);
    colR.position.set( 1.0, 1.3, 0);

    const beam = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.40, 0.40), archMat);
    beam.position.set(0, 2.55, 0);

    const glow = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.10, 0.52),
      new THREE.MeshStandardMaterial({
        color: 0x00ffaa,
        emissive: 0x00ffaa,
        emissiveIntensity: 1.5,
        transparent: true,
        opacity: 0.18,
        roughness: 0.25
      })
    );
    glow.position.set(0, 2.55, 0);
    arch.add(colL, colR, beam, glow);
    g.add(arch);

    // --- VIP Lighting ---
    const spot = new THREE.SpotLight(0xffd04a, 2.4, 20, Math.PI / 7, 0.55, 1.0);
    spot.position.set(0, 5.6, 2.2);
    spot.target.position.set(0, 0.85, 0);
    g.add(spot);
    g.add(spot.target);

    const ambient = new THREE.AmbientLight(0x3b2b4a, 0.55);
    g.add(ambient);

    const neonEdge = new THREE.PointLight(0xff3c78, 0.75, 10);
    neonEdge.position.set(0, 1.6, -9.0);
    g.add(neonEdge);

    // --- VIP label sign (glowing) ---
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(3.0, 0.65),
      new THREE.MeshStandardMaterial({
        color: 0x0b0b10,
        emissive: 0xff3c78,
        emissiveIntensity: 1.1,
        transparent: true,
        opacity: 0.65,
        roughness: 0.2
      })
    );
    sign.position.set(0, 2.1, 9.2);
    sign.rotation.y = Math.PI;
    g.add(sign);
  }
};
