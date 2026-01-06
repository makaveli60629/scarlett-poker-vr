// /js/avatar_basic.js — temporary mannequin avatar (head + shirt)
import * as THREE from "./three.js";

export function buildBasicAvatar({
  shirtLabel = "SCARLETT",
  shirtColor = 0x111111,
  accentColor = 0xff2d7a,
} = {}) {
  const g = new THREE.Group();

  // body
  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.18, 0.35, 6, 12),
    new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.9 })
  );
  torso.position.set(0, 1.15, 0);
  g.add(torso);

  // head
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 20, 16),
    new THREE.MeshStandardMaterial({ color: 0xf1c7a8, roughness: 0.7 })
  );
  head.position.set(0, 1.55, 0);
  g.add(head);

  // shirt logo (canvas texture)
  const logo = makeShirtLogo(shirtLabel, accentColor);
  const logoPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.20, 0.10),
    new THREE.MeshBasicMaterial({ map: logo, transparent: true })
  );
  logoPlane.position.set(0, 1.20, 0.185);
  g.add(logoPlane);

  // stand
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.02, 18),
    new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 1 })
  );
  base.position.set(0, 0.01, 0);
  g.add(base);

  return g;
}

function makeShirtLogo(text, color) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 256;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, c.width, c.height);

  ctx.fillStyle = "rgba(0,0,0,0.0)";
  ctx.fillRect(0, 0, c.width, c.height);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 54px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 128);

  // accent underline
  ctx.strokeStyle = "#" + color.toString(16).padStart(6, "0");
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(120, 170);
  ctx.lineTo(392, 170);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}
