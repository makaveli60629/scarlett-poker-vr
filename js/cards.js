import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

// Card helpers
export const SUITS = ["S","H","D","C"]; // Spades, Hearts, Diamonds, Clubs
export const RANKS = ["2","3","4","5","6","7","8","9","T","J","Q","K","A"];

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

export function cardToString(c) { return `${c.r}${c.s}`; }

function suitSymbol(s) {
  if (s === "S") return "♠";
  if (s === "H") return "♥";
  if (s === "D") return "♦";
  return "♣";
}

function suitColor(s) {
  return (s === "H" || s === "D") ? "#e23b3b" : "#f5f7ff";
}

// Canvas textures (no external assets)
export function makeCardTexture(card, opts={}) {
  const { faceUp=true } = opts;
  const c = document.createElement("canvas");
  c.width = 256; c.height = 356;
  const ctx = c.getContext("2d");

  // Background
  if (!faceUp) {
    // Card back
    ctx.fillStyle = "#0b1020";
    ctx.fillRect(0,0,c.width,c.height);

    ctx.strokeStyle = "rgba(122,44,255,0.75)";
    ctx.lineWidth = 10;
    roundRect(ctx, 16, 16, c.width-32, c.height-32, 22);
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.08)";
    for (let y=32;y<c.height;y+=22){
      for (let x=32;x<c.width;x+=22){
        ctx.beginPath();
        ctx.arc(x,y,4,0,Math.PI*2);
        ctx.fill();
      }
    }

    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "bold 26px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("TEAM NOVA", c.width/2, c.height/2 - 10);

    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = "bold 16px Arial";
    ctx.fillText("POKER VR", c.width/2, c.height/2 + 18);

    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    tex.anisotropy = 2;
    return tex;
  }

  // Face-up
  ctx.fillStyle = "#f7f7fb";
  ctx.fillRect(0,0,c.width,c.height);

  // Border
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 6;
  roundRect(ctx, 10, 10, c.width-20, c.height-20, 18);
  ctx.stroke();

  // Felt-ish inner border
  ctx.strokeStyle = "rgba(15,25,55,0.25)";
  ctx.lineWidth = 4;
  roundRect(ctx, 18, 18, c.width-36, c.height-36, 14);
  ctx.stroke();

  const sym = suitSymbol(card.s);
  const col = suitColor(card.s);

  // Corner rank/suit
  ctx.fillStyle = "#0b1020";
  ctx.font = "bold 42px Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(card.r, 28, 24);

  ctx.fillStyle = col;
  ctx.font = "bold 44px Arial";
  ctx.fillText(sym, 28, 68);

  // Center suit big
  ctx.fillStyle = col;
  ctx.font = "bold 140px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(sym, c.width/2, c.height/2 + 10);

  // Bottom-right mirrored
  ctx.save();
  ctx.translate(c.width, c.height);
  ctx.rotate(Math.PI);
  ctx.fillStyle = "#0b1020";
  ctx.font = "bold 42px Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(card.r, 28, 24);

  ctx.fillStyle = col;
  ctx.font = "bold 44px Arial";
  ctx.fillText(sym, 28, 68);
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  tex.anisotropy = 2;
  return tex;
}

export function makeCardMesh(card, opts={}) {
  const { faceUp=true } = opts;
  const tex = makeCardTexture(card, { faceUp });
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.85,
    metalness: 0.0
  });
  const geo = new THREE.PlaneGeometry(0.33, 0.46);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData.card = card;
  mesh.userData.faceUp = faceUp;
  mesh.renderOrder = 10;
  return mesh;
}

export function setCardFace(mesh, card, faceUp) {
  const old = mesh.material.map;
  const tex = makeCardTexture(card, { faceUp });
  mesh.material.map = tex;
  mesh.material.needsUpdate = true;
  if (old) old.dispose();
  mesh.userData.card = card;
  mesh.userData.faceUp = faceUp;
}

function roundRect(ctx, x, y, w, h, r){
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr, y);
  ctx.arcTo(x+w, y, x+w, y+h, rr);
  ctx.arcTo(x+w, y+h, x, y+h, rr);
  ctx.arcTo(x, y+h, x, y, rr);
  ctx.arcTo(x, y, x+w, y, rr);
  ctx.closePath();
}
