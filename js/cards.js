// js/cards.js — Canvas card generator (GitHub-safe)
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A","K","Q","J","10","9","8","7","6","5","4","3","2"];

export function makeDeck() {
  const deck = [];
  for (const s of SUITS) for (const r of RANKS) deck.push({ r, s });
  return deck;
}

export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function drawCardCanvas(text, isRed) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 356;
  const ctx = c.getContext("2d");

  // background
  ctx.fillStyle = "rgba(245,245,245,0.98)";
  ctx.fillRect(0, 0, c.width, c.height);

  // border
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, c.width - 16, c.height - 16);

  // text
  ctx.fillStyle = isRed ? "rgba(210,40,70,0.98)" : "rgba(15,15,15,0.95)";
  ctx.font = "bold 72px system-ui";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(text, 22, 20);

  // big suit
  ctx.font = "900 150px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text.slice(-1), c.width / 2, c.height / 2 + 20);

  // corner mirror
  ctx.save();
  ctx.translate(c.width, c.height);
  ctx.rotate(Math.PI);
  ctx.font = "bold 72px system-ui";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(text, 22, 20);
  ctx.restore();

  return c;
}

export function makeCardMesh(card, opts = {}) {
  const { w = 0.28, h = 0.40 } = opts;
  const isRed = card.s === "♥" || card.s === "♦";
  const label = `${card.r}${card.s}`;

  const canvas = drawCardCanvas(label, isRed);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  const matFront = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.65,
    metalness: 0.02,
    emissive: 0x0a0a0a,
    emissiveIntensity: 0.08
  });

  const matBack = new THREE.MeshStandardMaterial({
    color: 0x10151c,
    roughness: 0.85,
    metalness: 0.05,
    emissive: 0x003322,
    emissiveIntensity: 0.25
  });

  // thin box makes it readable from angles
  const geo = new THREE.BoxGeometry(w, 0.012, h);
  const mats = [matBack, matBack, matBack, matBack, matFront, matBack];
  const mesh = new THREE.Mesh(geo, mats);
  mesh.userData.card = card;
  return mesh;
}
