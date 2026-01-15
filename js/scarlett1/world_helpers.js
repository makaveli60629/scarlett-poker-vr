import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp  = (a, b, t) => a + (b - a) * t;

export function setReceiveCast(mesh, cast = true, receive = true) {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

export function addCollider(world, mesh, kind = "solid") {
  mesh.userData.collider = true;
  mesh.userData.kind = kind;
  world.colliders.push(mesh);
  return mesh;
}

export function makeTextSprite(text, opts = {}) {
  const {
    font = "bold 64px Arial",
    pad = 24,
    textColor = "#ffffff",
    bgColor = "rgba(0,0,0,0.45)",
    strokeColor = "rgba(0,0,0,0.85)",
    strokeWidth = 10,
    scale = 1.0
  } = opts;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  ctx.font = font;
  const metrics = ctx.measureText(text);
  const w = Math.ceil(metrics.width + pad * 2);
  const h = Math.ceil(96 + pad * 2);

  canvas.width = w;
  canvas.height = h;

  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, w, h);

  ctx.lineWidth = strokeWidth;
  ctx.strokeStyle = strokeColor;
  ctx.strokeText(text, w / 2, h / 2);

  ctx.fillStyle = textColor;
  ctx.fillText(text, w / 2, h / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  tex.needsUpdate = true;

  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthWrite: false
  });

  const spr = new THREE.Sprite(mat);
  const aspect = w / h;
  spr.scale.set(2.2 * aspect * scale, 2.2 * scale, 1);
  return spr;
}

export function makeGridCarpetTexture(size = 512) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const g = c.getContext("2d");

  g.fillStyle = "#182028";
  g.fillRect(0, 0, size, size);

  g.globalAlpha = 0.12;
  for (let y = 0; y < size; y += 6) {
    g.fillStyle = y % 12 === 0 ? "#233040" : "#101820";
    g.fillRect(0, y, size, 3);
  }

  g.globalAlpha = 0.25;
  g.strokeStyle = "#2aa6ff";
  g.lineWidth = 2;
  for (let i = 0; i <= 16; i++) {
    const p = (i / 16) * size;
    g.beginPath(); g.moveTo(p, 0); g.lineTo(p, size); g.stroke();
    g.beginPath(); g.moveTo(0, p); g.lineTo(size, p); g.stroke();
  }

  g.globalAlpha = 0.12;
  g.fillStyle = "#ff2aa6";
  for (let i = 0; i < 24; i++) {
    const x = Math.floor(Math.random() * size);
    const y = Math.floor(Math.random() * size);
    g.fillRect(x, y, 6, 2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.anisotropy = 8;
  return tex;
}
