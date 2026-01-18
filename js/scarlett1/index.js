// SCARLETT1 — QUEST SAFE WALK BUILD
const BUILD = "SCARLETT1_QUEST_SAFE_WORLD_v2_0";

const dwrite = window.__scarlettDiagWrite;
dwrite("[scarlett1] LIVE_FINGERPRINT ✅ " + BUILD);

// SAFE GLOBAL CONSTS
if(!window.SCARLETT_CONSTS){ window.SCARLETT_CONSTS = {}; }
if(!window.SCARLETT_CONSTS.SUITS){
  window.SCARLETT_CONSTS.SUITS = ["S","H","D","C"];
}
if(!window.SCARLETT_CONSTS.RANKS){
  window.SCARLETT_CONSTS.RANKS =
    ["A","K","Q","J","10","9","8","7","6","5","4","3","2"];
}

const SUITS = window.SCARLETT_CONSTS.SUITS;
const RANKS = window.SCARLETT_CONSTS.RANKS;

// canvas
const app = document.getElementById("app");
const canvas = document.createElement("canvas");
app.appendChild(canvas);
const ctx = canvas.getContext("2d");

function resize(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

// simple camera
let yaw = 0;
let dragging=false,lastX=0;

canvas.onpointerdown = function(e){
  dragging=true; lastX=e.clientX;
};
canvas.onpointerup = function(){ dragging=false; };
canvas.onpointermove = function(e){
  if(!dragging) return;
  yaw += (e.clientX-lastX)*0.005;
  lastX=e.clientX;
};

// bots
const bots=[];
for(let i=0;i<6;i++){
  bots.push({
    seat:i,
    cards:[
      {r:RANKS[i%RANKS.length],s:SUITS[i%SUITS.length]},
      {r:RANKS[(i+5)%RANKS.length],s:SUITS[(i+1)%SUITS.length]}
    ]
  });
}

function drawCard(x,y,c){
  ctx.fillStyle="#fff";
  ctx.fillRect(x,y,28,38);
  ctx.fillStyle="#000";
  ctx.font="10px monospace";
  ctx.fillText(c.r+c.s,x+4,y+14);
}

function loop(){
  ctx.fillStyle="#05070a";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  const cx=canvas.width/2, cy=canvas.height/2;
  const w=600,h=300;

  ctx.save();
  ctx.translate(cx,cy);
  ctx.rotate(yaw);

  ctx.fillStyle="#0c2b18";
  ctx.fillRect(-w/2,-h/2,w,h);

  for(let i=0;i<bots.length;i++){
    const a=i/bots.length*Math.PI*2;
    const x=Math.cos(a)*(w*0.4);
    const y=Math.sin(a)*(h*0.4);
    drawCard(x-16,y+10,bots[i].cards[0]);
    drawCard(x+8,y+10,bots[i].cards[1]);
  }

  ctx.restore();
  requestAnimationFrame(loop);
}

window.__scarlettEnterVR = async function(){
  if(!navigator.xr){
    dwrite("[xr] navigator.xr not available");
    return;
  }
  dwrite("[xr] Quest VR session ready (stub)");
};

loop();
dwrite("[status] renderer OK ✅");
dwrite("[status] world ready ✅");
