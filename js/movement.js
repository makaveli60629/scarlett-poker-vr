import { clamp, now } from "./util.js";
import { diagWrite } from "./diagnostics.js";

let speed = 2.2;
let turnSpeed = 55;
let lastT = now();

let joy = { active:false, id:null, sx:0, sy:0, x:0, y:0 };

function rig(){ return document.getElementById("playerRig"); }

function addJoystickUI(){
  const stick = document.createElement("div");
  stick.id = "touchStick";
  stick.style.position="fixed";
  stick.style.left="18px";
  stick.style.bottom="18px";
  stick.style.width="140px";
  stick.style.height="140px";
  stick.style.borderRadius="50%";
  stick.style.border="1px solid rgba(255,255,255,.2)";
  stick.style.background="rgba(0,0,0,.25)";
  stick.style.pointerEvents="auto";
  stick.style.zIndex="9998";

  const knob = document.createElement("div");
  knob.id="touchKnob";
  knob.style.position="absolute";
  knob.style.left="50%";
  knob.style.top="50%";
  knob.style.transform="translate(-50%, -50%)";
  knob.style.width="58px";
  knob.style.height="58px";
  knob.style.borderRadius="50%";
  knob.style.background="rgba(255,255,255,.12)";
  knob.style.border="1px solid rgba(255,255,255,.22)";
  stick.appendChild(knob);

  document.body.appendChild(stick);

  const maxR = 55;
  const onDown = (e)=>{
    const t = e.changedTouches ? e.changedTouches[0] : e;
    joy.active = true;
    joy.id = t.identifier ?? "mouse";
    joy.sx = t.clientX; joy.sy = t.clientY;
    joy.x = 0; joy.y = 0;
  };
  const onMove = (e)=>{
    if (!joy.active) return;
    const list = e.changedTouches ? Array.from(e.changedTouches) : [e];
    const t = list.find(tt => (tt.identifier ?? "mouse") === joy.id);
    if (!t) return;
    const dx = clamp(t.clientX - joy.sx, -maxR, maxR);
    const dy = clamp(t.clientY - joy.sy, -maxR, maxR);
    joy.x = dx/maxR; joy.y = dy/maxR;
    knob.style.transform = `translate(${dx}px, ${dy}px) translate(-50%, -50%)`;
  };
  const onUp = (e)=>{
    if (!joy.active) return;
    const list = e.changedTouches ? Array.from(e.changedTouches) : [e];
    const t = list.find(tt => (tt.identifier ?? "mouse") === joy.id);
    if (!t) return;
    joy.active=false; joy.id=null; joy.x=0; joy.y=0;
    knob.style.transform="translate(-50%, -50%)";
  };

  stick.addEventListener("touchstart", onDown, {passive:false});
  window.addEventListener("touchmove", onMove, {passive:false});
  window.addEventListener("touchend", onUp, {passive:false});
  window.addEventListener("touchcancel", onUp, {passive:false});
}

function getGamepadAxes(){
  const gps = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const gp of gps){
    if (!gp) continue;
    if (gp.connected && gp.axes && gp.axes.length >= 2){
      return { lx: gp.axes[0]||0, ly: gp.axes[1]||0, rx: gp.axes[2]||0, ry: gp.axes[3]||0 };
    }
  }
  return { lx:0, ly:0, rx:0, ry:0 };
}

function step(){
  const t = now();
  const dt = Math.min(0.05, (t-lastT)/1000);
  lastT = t;

  const r = rig();
  if (!r) return requestAnimationFrame(step);

  const gp = getGamepadAxes();
  const fwd = clamp(-(gp.ly||0) - (joy.y||0), -1, 1);
  const strafe = clamp((gp.lx||0) + (joy.x||0), -1, 1);
  const yawDelta = (gp.rx||0) * turnSpeed * dt;

  const rot = r.getAttribute("rotation") || {x:0,y:0,z:0};
  const ny = rot.y + yawDelta;
  r.setAttribute("rotation", `${rot.x} ${ny} ${rot.z}`);

  const yaw = ny * Math.PI / 180;
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);

  const mx = (strafe*cos + fwd*sin) * speed * dt;
  const mz = (fwd*cos - strafe*sin) * speed * dt;

  if (Math.abs(mx)>1e-4 || Math.abs(mz)>1e-4){
    const p = r.getAttribute("position");
    const nx = clamp(p.x + mx, -28, 28);
    const nz = clamp(p.z + mz, -28, 28);
    r.setAttribute("position", `${nx} ${p.y} ${nz}`);
  }

  requestAnimationFrame(step);
}

export function initMovement(){
  diagWrite("[move] init…");
  addJoystickUI();
  lastT = now();
  requestAnimationFrame(step);
  diagWrite("[move] ready ✅ (touch + gamepad)");
}
