// js/dealer_blinds.js — Dealer/SB/BB markers + seat layout
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

function makePuck(label, color, emissive) {
  const group = new THREE.Group();

  const disk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, 0.025, 28),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.55,
      metalness: 0.15,
      emissive,
      emissiveIntensity: 0.55
    })
  );
  disk.rotation.x = Math.PI / 2;

  // label canvas
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "rgba(0,0,0,0)";
  ctx.fillRect(0,0,256,256);
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "900 96px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 128, 132);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;

  const face = new THREE.Mesh(
    new THREE.CircleGeometry(0.10, 26),
    new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      roughness: 0.6,
      metalness: 0.05,
      emissive: 0x050505,
      emissiveIntensity: 0.15
    })
  );
  face.position.z = 0.015;

  group.add(disk);
  group.add(face);
  return group;
}

export const DealerBlinds = {
  group: null,
  center: new THREE.Vector3(0, 1.05, -6.5),
  seatRadius: 3.55,

  dealerIndex: 0,
  sbIndex: 1,
  bbIndex: 2,

  puckD: null,
  puckSB: null,
  puckBB: null,
  seatMarkers: [],

  build(scene, center, seatRadius, playerCount = 5) {
    this.center = center.clone();
    this.seatRadius = seatRadius;

    this.group = new THREE.Group();
    this.group.name = "DealerBlindsMarkers";
    scene.add(this.group);

    // pucks
    this.puckD = makePuck("D", 0xffd04a, 0x332200);
    this.puckSB = makePuck("SB", 0x00ffaa, 0x003322);
    this.puckBB = makePuck("BB", 0xff3366, 0x220010);

    this.group.add(this.puckD, this.puckSB, this.puckBB);

    // seat markers (rings) so it feels like a real table
    this.seatMarkers = [];
    for (let i = 0; i < playerCount; i++) {
      const a = (i / playerCount) * Math.PI * 2;

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.28, 0.03, 10, 26),
        new THREE.MeshStandardMaterial({
          color: 0x0b0f12,
          roughness: 0.85,
          emissive: 0x001a12,
          emissiveIntensity: 0.35
        })
      );
      ring.rotation.x = Math.PI / 2;

      const x = this.center.x + Math.sin(a) * (this.seatRadius - 0.25);
      const z = this.center.z + Math.cos(a) * (this.seatRadius - 0.25);
      ring.position.set(x, this.center.y - 0.97, z);

      this.group.add(ring);
      this.seatMarkers.push(ring);
    }

    this.setPositions(playerCount);
  },

  nextHand(playerCount = 5) {
    this.dealerIndex = (this.dealerIndex + 1) % playerCount;
    this.sbIndex = (this.dealerIndex + 1) % playerCount;
    this.bbIndex = (this.dealerIndex + 2) % playerCount;
    this.setPositions(playerCount);
  },

  setPositions(playerCount = 5) {
    const posForIndex = (idx, out = new THREE.Vector3()) => {
      const a = (idx / playerCount) * Math.PI * 2;
      out.set(
        this.center.x + Math.sin(a) * (this.seatRadius - 0.75),
        this.center.y - 0.90,
        this.center.z + Math.cos(a) * (this.seatRadius - 0.75)
      );
      return { out, a };
    };

    const d = posForIndex(this.dealerIndex);
    this.puckD.position.copy(d.out);
    this.puckD.rotation.y = d.a + Math.PI;

    const sb = posForIndex(this.sbIndex);
    this.puckSB.position.copy(sb.out);
    this.puckSB.rotation.y = sb.a + Math.PI;

    const bb = posForIndex(this.bbIndex);
    this.puckBB.position.copy(bb.out);
    this.puckBB.rotation.y = bb.a + Math.PI;
  }
};
