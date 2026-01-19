import { THREE } from '../core/engine.js';

// Lightweight 52-card deck with canvas textures.

const SUITS = [
  { k: 'S', name: 'Spades', sym: '♠', color: '#111827' },
  { k: 'H', name: 'Hearts', sym: '♥', color: '#dc2626' },
  { k: 'D', name: 'Diamonds', sym: '♦', color: '#dc2626' },
  { k: 'C', name: 'Clubs', sym: '♣', color: '#111827' },
];
const RANKS = ['A','K','Q','J','10','9','8','7','6','5','4','3','2'];

export function makeDeck() {
  const cards = [];
  for (const s of SUITS) {
    for (const r of RANKS) {
      cards.push({ code: `${r}${s.k}`, rank: r, suit: s.k, suitSym: s.sym, suitColor: s.color });
    }
  }
  return cards;
}

export function shuffleInPlace(arr, rng=Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function cardCanvasFace(card) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 768;
  const ctx = c.getContext('2d');
  // rounded rect
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0,0,c.width,c.height);
  // border
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 18;
  ctx.strokeRect(18,18,c.width-36,c.height-36);

  // corner rank
  ctx.fillStyle = card.suitColor;
  ctx.font = '900 120px system-ui, -apple-system, Segoe UI, Roboto, Arial';
  ctx.textBaseline = 'top';
  ctx.fillText(card.rank, 46, 36);
  ctx.font = '900 120px system-ui, -apple-system, Segoe UI, Roboto, Arial';
  ctx.fillText(card.suitSym, 54, 160);

  // center suit
  ctx.globalAlpha = 0.95;
  ctx.font = '900 360px system-ui, -apple-system, Segoe UI, Roboto, Arial';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(card.suitSym, c.width/2, c.height/2 + 20);
  ctx.globalAlpha = 1;

  // bottom corner (mirrored)
  ctx.save();
  ctx.translate(c.width, c.height);
  ctx.rotate(Math.PI);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = card.suitColor;
  ctx.font = '900 120px system-ui, -apple-system, Segoe UI, Roboto, Arial';
  ctx.fillText(card.rank, 46, 36);
  ctx.fillText(card.suitSym, 54, 160);
  ctx.restore();

  return c;
}

function cardCanvasBack() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 768;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#07101a';
  ctx.fillRect(0,0,c.width,c.height);
  // pattern
  ctx.strokeStyle = 'rgba(0,208,255,0.22)';
  ctx.lineWidth = 8;
  for (let i=0;i<14;i++) {
    ctx.beginPath();
    ctx.arc(256, 384, 60 + i*22, 0, Math.PI*2);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(168,85,247,0.18)';
  for (let x=30;x<512;x+=50) {
    ctx.beginPath();
    ctx.moveTo(x, 40);
    ctx.lineTo(x+120, 728);
    ctx.stroke();
  }
  // logo
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = '900 86px system-ui, -apple-system, Segoe UI, Roboto, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SCARLETT', 256, 360);
  ctx.font = '800 54px system-ui, -apple-system, Segoe UI, Roboto, Arial';
  ctx.fillStyle = 'rgba(207,233,255,0.9)';
  ctx.fillText('VR POKER', 256, 430);
  // border
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 18;
  ctx.strokeRect(18,18,c.width-36,c.height-36);
  return c;
}

export function buildCardTextures() {
  const deck = makeDeck();

  const backCanvas = cardCanvasBack();
  const backTex = new THREE.CanvasTexture(backCanvas);
  backTex.colorSpace = THREE.SRGBColorSpace;
  backTex.anisotropy = 1;

  const faceTex = new Map();
  for (const card of deck) {
    const canv = cardCanvasFace(card);
    const tex = new THREE.CanvasTexture(canv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 1;
    faceTex.set(card.code, tex);
  }

  return { deck, backTex, faceTex };
}
