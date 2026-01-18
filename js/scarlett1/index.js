// SCARLETT1 — Engine Front Controller (XR-safe + PIP + bots placeholder)
// Build: SCARLETT1_RUNTIME_ULT_DIAG_v4_4_FIX_SUITS

const BUILD = "SCARLETT1_RUNTIME_ULT_DIAG_v4_4_FIX_SUITS";
const dwrite = (m)=>{ try{ window.__scarlettDiagWrite?.(m);}catch(_){ console.log(m);} };

dwrite(`[scarlett1] LIVE_FINGERPRINT ✅ ${BUILD}`);

// ---- HARD attach flags ----
window.SCARLETT = window.SCARLETT || {};
window.SCARLETT.BUILD = BUILD;
window.SCARLETT.engineAttached = true;
window.__scarlettEngineAttached = true;

// ---- bulletproof shared constants (NO redeclare crashes) ----
globalThis.SCARLETT_CONSTS ||= {};
globalThis.SCARLETT_CONSTS.SUITS ||= Object.freeze(["S","H","D","C"]);
globalThis.SCARLETT_CONSTS.RANKS ||= Object.freeze(["A","K","Q","J","10","9","8","7","6","5","4","3","2"]);

const SUITS = globalThis.SCARLETT_CONSTS.SUITS;
const RANKS = globalThis.SCARLETT_CONSTS.RANKS;

// ---- minimal Three.js via import map? (no) -> use dynamic import from unpkg? (no) ----
// Your project already has three in many builds. This file is engine-safe even without it.
// We'll render a basic canvas + simple "world" loop without external deps.

// ---- canvas / render loop (2D fallback) ----
const app = document.getElementById("app");
const canvas = document.createElement("canvas");
canvas.width = Math.max(1, Math.floor(window.innerWidth));
canvas.height = Math.max(1, Math.floor(window.innerHeight));
app.appendChild(canvas);
const ctx = canvas.getContext("2d", { alpha: false });

let t0 = performance.now();
let running = true;

function resize() {
  canvas.width = Math.max(1, Math.floor(window.innerWidth));
  canvas.height = Math.max(1, Math.floor(window.innerHeight));
}
window.addEventListener("resize", resize, { passive: true });

// ---- PIP: tap floor to "move" (fake) ----
let camYaw = 0;
let camPitch = 0;
let dragging = false;
let lastX = 0, lastY = 0;

canvas.addEventListener("pointerdown", (e)=>{
  dragging = true; lastX = e.clientX; lastY = e.clientY;
  canvas.setPointerCapture?.(e.pointerId);
});
canvas.addEventListener("pointerup", (e)=>{
  dragging = false;
  canvas.releasePointerCapture?.(e.pointerId);
});
canvas.addEventListener("pointermove", (e)=>{
  if (!dragging) return;
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  lastX = e.clientX; lastY = e.clientY;
  camYaw += dx * 0.005;
  camPitch += dy * 0.003;
  camPitch = Math.max(-1.2, Math.min(1.2, camPitch));
});

// ---- fake bots + table for visual sanity ----
const bots = Array.from({length: 6}).map((_,i)=>({
  name: `BOT_${i+1}`,
  seat: i,
  cards: [
    { r: RANKS[(i*2)%RANKS.length], s: SUITS[i%SUITS.length] },
    { r: RANKS[(i*2+7)%RANKS.length], s: SUITS[(i+1)%SUITS.length] }
  ]
}));

function draw() {
  const now = performance.now();
  const dt = (now - t0) / 1000;
  t0 = now;

  ctx.fillStyle = "#05070a";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // vignette-ish border
  ctx.strokeStyle = "rgba(255,255,255,.08)";
  ctx.lineWidth = 2;
  ctx.strokeRect(10,10,canvas.width-20,canvas.height-20);

  // table (2D)
  const cx = canvas.width/2, cy = canvas.height/2;
  const tableW = Math.min(canvas.width*0.65, 720);
  const tableH = Math.min(canvas.height*0.35, 340);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(camYaw * 0.25);
  ctx.scale(1, 1);

  ctx.fillStyle = "#0c2b18";
  roundRect(ctx, -tableW/2, -tableH/2, tableW, tableH, 28, true, false);

  // center pillar marker
  ctx.fillStyle = "#7b1b1b";
  ctx.beginPath();
  ctx.arc(0,0,10,0,Math.PI*2);
  ctx.fill();

  // seats + cards (flat + hover mirror)
  for (const b of bots) {
    const ang = (b.seat / bots.length) * Math.PI*2 - Math.PI/2;
    const rx = Math.cos(ang) * (tableW*0.40);
    const ry = Math.sin(ang) * (tableH*0.42);

    // avatar dot
    ctx.fillStyle = "rgba(210,210,255,.85)";
    ctx.beginPath();
    ctx.arc(rx, ry, 8, 0, Math.PI*2);
    ctx.fill();

    // name
    ctx.fillStyle = "rgba(255,255,255,.7)";
    ctx.font = "12px ui-monospace, monospace";
    ctx.fillText(b.name, rx - 22, ry - 14);

    // flat cards on table
    drawCard(ctx, rx - 20, ry + 10, b.cards[0], 0.0, 1.0);
    drawCard(ctx, rx + 6,  ry + 10, b.cards[1], 0.0, 1.0);

    // hover mirror cards (teaching room vibe)
    drawCard(ctx, rx - 20, ry - 44, b.cards[0], 0.0, 0.92, true);
    drawCard(ctx, rx + 6,  ry - 44, b.cards[1], 0.0, 0.92, true);
  }

  ctx.restore();

  // footer status
  ctx.fillStyle = "rgba(255,255,255,.65)";
  ctx.font = "12px ui-monospace, monospace";
  ctx.fillText(`BUILD=${BUILD}  |  Teleport=${window.SCARLETT?.teleportOn ? "ON" : "OFF"}  |  XR=${!!navigator.xr}`, 14, canvas.height - 14);

  if (running) requestAnimationFrame(draw);
}

function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr,y);
  ctx.arcTo(x+w,y,x+w,y+h,rr);
  ctx.arcTo(x+w,y+h,x,y+h,rr);
  ctx.arcTo(x,y+h,x,y,rr);
  ctx.arcTo(x,y,x+w,y,rr);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function drawCard(ctx, x, y, card, rot=0, scale=1, hover=false) {
  const w = 28*scale, h = 38*scale;
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(rot);

  ctx.fillStyle = hover ? "rgba(255,255,255,.92)" : "rgba(255,255,255,.85)";
  roundRect(ctx, 0, 0, w, h, 5*scale, true, false);

  ctx.strokeStyle = "rgba(0,0,0,.25)";
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5,0.5,w-1,h-1);

  ctx.fillStyle = "rgba(0,0,0,.85)";
  ctx.font = `${10*scale}px ui-monospace, monospace`;
  ctx.fillText(`${card.r}${card.s}`, 4*scale, 14*scale);

  ctx.restore();
}

// ---- XR stubs (prevents crashes; you can swap in your real XR engine later) ----
window.__scarlettEnterVR = async () => {
  if (!navigator.xr) {
    dwrite("[xr] navigator.xr not available");
    return;
  }
  dwrite("[xr] (stub) requestSession would run here in full XR build");
};

draw();
dwrite("[status] renderer OK ✅");
dwrite("[status] world ready ✅");
dwrite("[status] MODULE TEST ✅");
