import { MODULES } from "./module-manifest.js";

const $ = (sel) => document.querySelector(sel);
const panel = $("#panel");
const logEl = $("#log");
const statusEl = $("#status");
const diag3d = $("#diagText3d");
const scene = $("#scene");
const rig = $("#rig");
const screenText = $("#screenText");
const canvas = document.getElementById("tvCanvas");
const ctx = canvas.getContext("2d", { alpha: false });

function t() { return (performance.now()/1000).toFixed(3); }
function log(msg) {
  const line = `[${t()}] ${msg}`;
  if (logEl) {
    logEl.textContent = (logEl.textContent ? (logEl.textContent + "\n") : "") + line;
    const lines = logEl.textContent.split("\n");
    if (lines.length > 160) logEl.textContent = lines.slice(-160).join("\n");
    logEl.scrollTop = logEl.scrollHeight;
  }
  if (diag3d) diag3d.setAttribute("value", msg);
  console.log(line);
}
function setStatus(s){ if(statusEl) statusEl.textContent = s; }

// HUD buttons
$("#btnDiag")?.addEventListener("click", () => {
  const open = panel.style.display !== "block";
  panel.style.display = open ? "block" : "none";
  log(`diag ${open ? "OPEN" : "CLOSED"}`);
});
$("#btnEnter")?.addEventListener("click", () => {
  if (scene?.enterVR) scene.enterVR();
  else scene.setAttribute("xr-mode-ui","enabled: true");
  log("enterVR pressed");
});
$("#btnReset")?.addEventListener("click", () => {
  rig.object3D.position.set(0,0,6);
  rig.object3D.rotation.set(0,0,0);
  const cam = $("#cam");
  cam?.setAttribute("position","0 1.65 0");
  log("reset rig");
});

// Mobile joystick
const joy = document.getElementById("joy");
const joyDot = document.getElementById("joyDot");
let joyOn = false;
let joyVec = {x:0,y:0};
let joyCenter = null;

$("#btnJoy")?.addEventListener("click", () => {
  joyOn = !joyOn;
  joy.style.display = joyOn ? "block" : "none";
  joyVec = {x:0,y:0};
  joyDot.style.left = "50%"; joyDot.style.top = "50%";
  log(`mobile joystick ${joyOn ? "ON" : "OFF"}`);
});

function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }
joy.addEventListener("pointerdown", (e) => {
  joy.setPointerCapture(e.pointerId);
  const r = joy.getBoundingClientRect();
  joyCenter = { x: r.left + r.width/2, y: r.top + r.height/2, rad: Math.min(r.width,r.height)/2 - 24 };
});
joy.addEventListener("pointermove", (e) => {
  if (!joyCenter) return;
  const dx = e.clientX - joyCenter.x;
  const dy = e.clientY - joyCenter.y;
  const mag = Math.hypot(dx,dy);
  const m = mag > joyCenter.rad ? joyCenter.rad / mag : 1.0;
  const nx = (dx*m) / joyCenter.rad;
  const ny = (dy*m) / joyCenter.rad;
  joyVec.x = clamp(nx,-1,1);
  joyVec.y = clamp(ny,-1,1);
  joyDot.style.left = `${50 + joyVec.x*35}%`;
  joyDot.style.top  = `${50 + joyVec.y*35}%`;
});
joy.addEventListener("pointerup", () => {
  joyCenter = null;
  joyVec = {x:0,y:0};
  joyDot.style.left = "50%"; joyDot.style.top = "50%";
});

// Import audit
async function auditModules() {
  log("module audit begin…");
  for (const m of MODULES) {
    try {
      const mod = await import(m);
      if (typeof mod.init === "function") mod.init();
      log(`MODULE OK: ${m}`);
    } catch (e) {
      log(`MODULE FAIL: ${m} :: ${e?.message || e}`);
    }
  }
  log("module audit done ✅");
}

// Canvas TV channels (4)
let channel = 1;
function setChannel(n){
  channel = n;
  const names = {1:"FOX 32 CHICAGO (DEMO)",2:"NBC 5 CHICAGO (DEMO)",3:"CBS 2 CHICAGO (DEMO)",4:"SCARLETT POKER TV"};
  screenText?.setAttribute("value", names[n] || "SCARLETT TV");
  log(`channel -> ${names[n] || n}`);
}
scene.addEventListener("scarlett-action", (evt) => {
  const a = evt.detail?.action;
  if (a === "ch1") setChannel(1);
  if (a === "ch2") setChannel(2);
  if (a === "ch3") setChannel(3);
  if (a === "ch4") setChannel(4);
});

let tvTime = 0;
function drawTV(){
  tvTime += 1/60;
  const w = canvas.width, h = canvas.height;
  ctx.fillStyle = "#081018";
  ctx.fillRect(0,0,w,h);

  const title = (channel===1)?"FOX 32 CHICAGO":(channel===2)?"NBC 5 CHICAGO":(channel===3)?"CBS 2 CHICAGO":"SCARLETT POKER TV";
  const hue = (channel===1)?200:(channel===2)?320:(channel===3)?40:170;

  // animated bars
  for (let i=0;i<8;i++){
    ctx.fillStyle = `hsl(${(hue + i*18 + tvTime*40)%360} 70% 40%)`;
    ctx.fillRect(i*w/8, 110, w/8, h-220);
  }
  // top banner
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(0,0,w,92);
  ctx.font = "800 44px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillStyle = "#e8f7ff";
  ctx.fillText(title, 28, 60);
  ctx.font = "650 24px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillStyle = "#9fdcff";
  ctx.fillText("LIVE • DEMO CHANNEL", 28, 86);

  // live bug + clock
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(w-270, 10, 260, 72);
  ctx.fillStyle = "#ff2bd6";
  ctx.fillRect(w-252, 20, 16, 16);
  ctx.fillStyle = "#e8f7ff";
  ctx.font = "800 22px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  const now = new Date();
  const time = now.toLocaleTimeString("en-US",{timeZone:"America/Chicago"});
  ctx.fillText("LIVE", w-226, 34);
  ctx.fillStyle = "#bfefff";
  ctx.font = "700 22px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(time, w-252, 66);

  // ticker
  ctx.fillStyle = "rgba(0,0,0,0.70)";
  ctx.fillRect(0, h-74, w, 74);
  ctx.font = "700 30px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillStyle = "#bfefff";
  const ticker = `SCARLETTVR • ${title} • Tap CH buttons to switch • ${time} • `;
  const offset = (tvTime*220) % (w + 1200);
  ctx.fillText(ticker, w - offset, h - 26);

  requestAnimationFrame(drawTV);
}

// Components
AFRAME.registerComponent("ui-button", {
  schema: { label: {type:"string"}, action: {type:"string"} },
  init: function () {
    const el = this.el;
    el.classList.add("clickable");
    el.setAttribute("geometry","primitive: plane; width: 1.35; height: 0.5;");
    el.setAttribute("material","color:#1b2a3a; roughness:1; opacity:0.98");
    el.setAttribute("text", `value: ${this.data.label}; align: center; color: #e8f1ff; width: 3.0;`);
    const fire = () => el.emit("scarlett-action",{action:this.data.action});
    el.addEventListener("click", fire);
    el.addEventListener("ui-click", fire);
  }
});

AFRAME.registerComponent("controller-ui", {
  init: function () {
    const ray = this.el.components.raycaster;
    const emitClick = () => {
      const hits = ray?.intersections;
      if (!hits?.length) return;
      const hitEl = hits[0].object?.el;
      if (hitEl?.classList?.contains("clickable")) hitEl.emit("ui-click");
    };
    this.el.addEventListener("triggerdown", emitClick);
  }
});

// Locomotion that reads gamepad from XR controllers (NOT navigator.getGamepads[0])
AFRAME.registerComponent("locomotion-xr", {
  init: function () {
    this.left = document.getElementById("leftHand");
    this.right = document.getElementById("rightHand");
    this.cam = document.getElementById("cam");
    this._snapCooldown = 0;
  },
  tick: function (time, dt) {
    const rig3 = this.el.object3D;
    const dtS = dt/1000;

    // movement: prefer left controller gamepad
    const lgp = getGamepad(this.left);
    const rgp = getGamepad(this.right);

    const mv = readStick(lgp);
    const spd = 2.4; // meters/sec
    if (mv) {
      // move in camera yaw direction
      const yaw = getYaw(this.cam.object3D);
      const sin = Math.sin(yaw), cos = Math.cos(yaw);
      const x = mv.x, y = mv.y;
      // forward is -y in most mappings
      const dx = (x*cos + (-y)*sin) * spd * dtS;
      const dz = ((-y)*cos - x*sin) * spd * dtS;
      rig3.position.x += dx;
      rig3.position.z += dz;
    } else if (joyOn) {
      // mobile joystick fallback
      const yaw = getYaw(this.cam.object3D);
      const sin = Math.sin(yaw), cos = Math.cos(yaw);
      const x = joyVec.x, y = joyVec.y;
      const dx = (x*cos + (-y)*sin) * spd * dtS;
      const dz = ((-y)*cos - x*sin) * spd * dtS;
      rig3.position.x += dx;
      rig3.position.z += dz;
    }

    // snap turn: right stick x
    const turn = readStick(rgp);
    if (this._snapCooldown > 0) this._snapCooldown -= dt;
    if (turn && this._snapCooldown <= 0) {
      const th = turn.x;
      if (Math.abs(th) > 0.65) {
        rig3.rotation.y += (th > 0 ? -1 : 1) * (Math.PI/6); // 30 deg
        this._snapCooldown = 250;
        log(`snap turn ${th>0?"R":"L"}`);
      }
    }

    // periodic axis debug when diag open
    if (panel.style.display === "block" && (time % 1000) < dt) {
      log(`axes L=${fmtAxes(lgp)} R=${fmtAxes(rgp)}`);
    }
  }
});

function getGamepad(el){
  if (!el) return null;
  const tc = el.components["tracked-controls"];
  const ctrl = tc && tc.controller;
  const gp = ctrl && ctrl.gamepad;
  return gp || null;
}
function readStick(gp){
  if (!gp || !gp.axes || gp.axes.length < 2) return null;
  // Heuristic: use axes[2,3] if present else axes[0,1]. Also auto-detect best pair.
  let pairs = [];
  for (let i=0;i+1<gp.axes.length;i+=2) pairs.push([i,i+1]);
  // Score by magnitude
  let best = pairs[0], bestMag = -1;
  for (const p of pairs){
    const x = gp.axes[p[0]] || 0;
    const y = gp.axes[p[1]] || 0;
    const mag = Math.hypot(x,y);
    if (mag > bestMag){ bestMag = mag; best = p; }
  }
  // Prefer [2,3] if it exists and is similar or better
  if (gp.axes.length >= 4) {
    const x23 = gp.axes[2]||0, y23 = gp.axes[3]||0;
    const mag23 = Math.hypot(x23,y23);
    if (mag23 >= bestMag*0.8) best = [2,3];
  }
  const x = gp.axes[best[0]] || 0;
  const y = gp.axes[best[1]] || 0;
  const dz = 0.12;
  const fx = Math.abs(x) < dz ? 0 : x;
  const fy = Math.abs(y) < dz ? 0 : y;
  if (fx === 0 && fy === 0) return null;
  return { x: fx, y: fy };
}
function fmtAxes(gp){
  if (!gp) return "none";
  return gp.axes ? gp.axes.map(a=>Number(a).toFixed(2)).join(",") : "noaxes";
}
function getYaw(obj3d){
  // yaw from quaternion
  const e = new THREE.Euler().setFromQuaternion(obj3d.quaternion, "YXZ");
  return e.y;
}

// Boot
log("main.js running ✅");
scene.addEventListener("loaded", async () => {
  const secure = window.isSecureContext;
  const xr = !!navigator.xr;
  const touch = ("ontouchstart" in window) || (navigator.maxTouchPoints||0)>0;
  setStatus(`secure=${secure} xr=${xr} touch=${touch}`);
  log("scene loaded ✅");

  // Start canvas TV
  setChannel(1);
  requestAnimationFrame(drawTV);

  // Ambient sound (will be blocked until gesture; that’s okay)
  const amb = document.getElementById("amb");
  amb.loop = true; amb.volume = 0.20;
  amb.play().then(()=>log("amb playing")).catch(()=>log("amb blocked (needs gesture)"));

  // Run module audit
  await auditModules();
});
