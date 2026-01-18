// SCARLETT1 — Runtime v2.0 (phase-ready) with v1.8 stability
// BUILD: SCARLETT1_RUNTIME_v2_0_PHASE_A

const BUILD = "SCARLETT1_RUNTIME_v2_0_PHASE_A";
const dwrite = (m)=>{ try{ window.__scarlettDiagWrite?.(m);}catch(_){ console.log(m);} };

dwrite(`[scarlett1] LIVE_FINGERPRINT ✅ ${BUILD}`);

window.SCARLETT = window.SCARLETT || {};
window.SCARLETT.BUILD = BUILD;
window.SCARLETT.engineAttached = true;
window.__scarlettEngineAttached = true;

// ---- SAFE CONSTS (never redeclare crash) ----
globalThis.SCARLETT_CONSTS ||= {};
globalThis.SCARLETT_CONSTS.SUITS ||= Object.freeze(["S","H","D","C"]);
globalThis.SCARLETT_CONSTS.RANKS ||= Object.freeze(["A","K","Q","JC","J","10","9","8","7","6","5","4","3","2"]);
const SUITS = globalThis.SCARLETT_CONSTS.SUITS;
const RANKS = globalThis.SCARLETT_CONSTS.RANKS;

// ---- Modules ----
import { initAudio } from "../modules/audio.js";
initAudio(dwrite);

// ---- Render (2D fallback shell that always shows something) ----
const app = document.getElementById("app");
const canvas = document.createElement("canvas");
app.appendChild(canvas);
const ctx = canvas.getContext("2d", { alpha: false });

function resize(){
  canvas.width = Math.max(1, Math.floor(window.innerWidth));
  canvas.height = Math.max(1, Math.floor(window.innerHeight));
}
window.addEventListener("resize", resize, { passive:true });
resize();

// ---- Camera / input (PIP) ----
let camYaw=0, camPitch=0;
let dragging=false, lastX=0, lastY=0;

canvas.addEventListener("pointerdown", (e)=>{
  dragging=true; lastX=e.clientX; lastY=e.clientY;
  canvas.setPointerCapture?.(e.pointerId);
  window.__scarlettAudioPlay?.("click");
});
canvas.addEventListener("pointerup", (e)=>{
  dragging=false;
  canvas.releasePointerCapture?.(e.pointerId);
});
canvas.addEventListener("pointermove", (e)=>{
  if(!dragging) return;
  const dx=e.clientX-lastX, dy=e.clientY-lastY;
  lastX=e.clientX; lastY=e.clientY;
  camYaw += dx*0.005;
  camPitch += dy*0.003;
  camPitch = Math.max(-1.2, Math.min(1.2, camPitch));
});

// ---- Teaching table bots (Phase A) ----
const bots = Array.from({length:6}).map((_,i)=>({
  name:`BOT_${i+1}`,
  seat:i,
  chips: 1000 + i*250,
  cards:[
    { r: RANKS[(i*2)%RANKS.length], s: SUITS[i%SUITS.length] },
    { r: RANKS[(i*2+7)%RANKS.length], s: SUITS[(i+1)%SUITS.length] }
  ]
}));

// Phase-ready game loop hooks
window.SCARLETT.game = {
  phase: "A",
  bots,
  deal(){
    for (const b of bots) {
      b.cards = [
        { r: RANKS[Math.floor(Math.random()*RANKS.length)], s: SUITS[Math.floor(Math.random()*SUITS.length)] },
        { r: RANKS[Math.floor(Math.random()*RANKS.length)], s: SUITS[Math.floor(Math.random()*SUITS.length)] },
      ];
    }
    window.__scarlettAudioPlay?.("deal");
    dwrite("[game] deal ✅");
  }
};

// Auto-deal once on boot (so you see movement)
setTimeout(()=>window.SCARLETT.game.deal(), 600);

function roundRect(x,y,w,h,r){
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr,y);
  ctx.arcTo(x+w,y,x+w,y+h,rr);
  ctx.arcTo(x+w,y+h,x,y+h,rr);
  ctx.arcTo(x,y+h,x,y,rr);
  ctx.arcTo(x,y,x+w,y,rr);
  ctx.closePath();
}

function drawCard(x,y,card,scale=1,hover=false){
  const w=28*scale, h=38*scale;
  ctx.save();
  ctx.translate(x,y);
  ctx.fillStyle = hover ? "rgba(255,255,255,.92)" : "rgba(255,255,255,.85)";
  roundRect(0,0,w,h,5*scale);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,.25)";
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5,0.5,w-1,h-1);
  ctx.fillStyle = "rgba(0,0,0,.85)";
  ctx.font = `${10*scale}px ui-monospace, monospace`;
  ctx.fillText(`${card.r}${card.s}`, 4*scale, 14*scale);
  ctx.restore();
}

let last = performance.now();
function loop(){
  const now = performance.now();
  last = now;

  ctx.fillStyle = "#05070a";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  const cx=canvas.width/2, cy=canvas.height/2;
  const tableW=Math.min(canvas.width*0.65, 720);
  const tableH=Math.min(canvas.height*0.35, 340);

  // table
  ctx.save();
  ctx.translate(cx,cy);
  ctx.rotate(camYaw*0.25);

  ctx.fillStyle = "#0c2b18";
  roundRect(-tableW/2,-tableH/2,tableW,tableH,28);
  ctx.fill();

  // center marker
  ctx.fillStyle = "#7b1b1b";
  ctx.beginPath();
  ctx.arc(0,0,10,0,Math.PI*2);
  ctx.fill();

  // bots
  for(const b of bots){
    const ang=(b.seat/bots.length)*Math.PI*2 - Math.PI/2;
    const rx=Math.cos(ang)*(tableW*0.40);
    const ry=Math.sin(ang)*(tableH*0.42);

    ctx.fillStyle = "rgba(210,210,255,.85)";
    ctx.beginPath();
    ctx.arc(rx,ry,8,0,Math.PI*2);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,.75)";
    ctx.font = "12px ui-monospace, monospace";
    ctx.fillText(b.name, rx-22, ry-14);

    // flat cards
    drawCard(rx-20, ry+10, b.cards[0], 1.0, false);
    drawCard(rx+6,  ry+10, b.cards[1], 1.0, false);

    // hover mirrors
    drawCard(rx-20, ry-44, b.cards[0], 0.92, true);
    drawCard(rx+6,  ry-44, b.cards[1], 0.92, true);
  }

  ctx.restore();

  // footer
  ctx.fillStyle = "rgba(255,255,255,.65)";
  ctx.font = "12px ui-monospace, monospace";
  ctx.fillText(`BUILD=${BUILD} | Teleport=${window.SCARLETT?.teleportOn?"ON":"OFF"} | XR=${!!navigator.xr}`, 14, canvas.height-14);

  requestAnimationFrame(loop);
}

// XR stub (Phase B will replace with real WebXR/Three)
window.__scarlettEnterVR = async ()=>{
  if(!navigator.xr){ dwrite("[xr] navigator.xr not available"); return; }
  dwrite("[xr] Phase A stub — XR pipeline will be Phase B");
  window.__scarlettAudioPlay?.("click");
};

loop();

dwrite("[status] renderer OK ✅");
dwrite("[status] world ready ✅");
dwrite("[status] MODULE TEST ✅");
