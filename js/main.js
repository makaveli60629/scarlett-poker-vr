// /js/main.js — Scarlett MASTER Boot + Diagnostics + Flat Controls (FULL)
// ✅ Fixes: "Failed to resolve module specifier 'three'" by using CDN imports.
// ✅ Works on GitHub Pages + Android + Quest.
// ✅ Keeps your World pipeline: import { World } from "./world.js";

import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { World } from "./world.js";

const BUILD = Date.now();

// ---------- UI refs ----------
const $ = (id) => document.getElementById(id);
const logPanel = $("logPanel");
const pillXR = $("pillXR");
const pillMode = $("pillMode");
const btnCopy = $("btnCopy");
const btnDownload = $("btnDownload");
const btnClear = $("btnClear");
const btnHide = $("btnHide");
const vrSlot = $("vrSlot");
const hud = $("hud");

const joy = $("joy");
const joyKnob = $("joyKnob");
const hint = $("hint");

window.__scarlettBootstrapLog?.("[main] starting…");

// ---------- Log capture ----------
const LOG_LINES_MAX = 1600;
const logBuffer = [];
let hudVisible = true;

function timeStamp() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function pushLog(line, cls = "") {
  const msg = `[${timeStamp()}] ${line}`;
  logBuffer.push(msg);
  if (logBuffer.length > LOG_LINES_MAX) logBuffer.shift();

  if (logPanel) {
    const div = document.createElement("div");
    if (cls) div.className = cls;
    div.textContent = msg;
    logPanel.appendChild(div);

    while (logPanel.childNodes.length > LOG_LINES_MAX) {
      logPanel.removeChild(logPanel.firstChild);
    }
    logPanel.scrollTop = logPanel.scrollHeight;
  }
}

function safeToString(v) {
  try {
    if (typeof v === "string") return v;
    if (v instanceof Error) return `${v.name}: ${v.message}\n${v.stack || ""}`;
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  } catch {
    return String(v);
  }
}

// Mirror console -> HUD
const _log = console.log.bind(console);
const _warn = console.warn.bind(console);
const _err = console.error.bind(console);

console.log = (...args) => { _log(...args); pushLog(args.map(safeToString).join(" "), ""); };
console.warn = (...args) => { _warn(...args); pushLog(args.map(safeToString).join(" "), "warn"); };
console.error = (...args) => { _err(...args); pushLog(args.map(safeToString).join(" "), "bad"); };

window.addEventListener("error", (e) => {
  pushLog(`WINDOW ERROR: ${e.message}`, "bad");
  if (e.error?.stack) pushLog(e.error.stack, "muted");
});
window.addEventListener("unhandledrejection", (e) => {
  pushLog(`UNHANDLED PROMISE: ${safeToString(e.reason)}`, "bad");
});

// ---------- Buttons ----------
btnClear?.addEventListener("click", () => {
  logBuffer.length = 0;
  if (logPanel) logPanel.innerHTML = "";
  pushLog("Log cleared ✅", "ok");
});

btnHide?.addEventListener("click", () => {
  hudVisible = !hudVisible;
  if (hud) hud.style.display = hudVisible ? "" : "none";
});

btnCopy?.addEventListener("click", async () => {
  const text = logBuffer.join("\n");
  try {
    await navigator.clipboard.writeText(text);
    const old = btnCopy.textContent;
    btnCopy.textContent = "✅ Copied!";
    setTimeout(() => (btnCopy.textContent = old), 1200);
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      const old = btnCopy.textContent;
      btnCopy.textContent = "✅ Copied!";
      setTimeout(() => (btnCopy.textContent = old), 1200);
    } catch {
      alert("Copy failed. Long-press the log → Select All → Copy.");
    }
  }
});

btnDownload?.addEventListener("click", () => {
  const blob = new Blob([logBuffer.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `scarlett_log_${BUILD}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

// ---------- Boot diagnostics ----------
pushLog(`BOOT v=${BUILD}`, "ok");
pushLog(`HREF: ${location.href}`);
pushLog(`UA: ${navigator.userAgent}`);
pushLog(`NAVIGATOR_XR: ${!!navigator.xr}`, navigator.xr ? "ok" : "warn");
pushLog(`THREE: module ok`, "ok");

async function setXRStatus() {
  let supported = false;
  try {
    if (navigator.xr?.isSessionSupported) {
      supported = await navigator.xr.isSessionSupported("immersive-vr");
    }
  } catch {}
  if (pillXR) pillXR.innerHTML = `XR: <span class="${supported ? "ok" : "warn"}">${supported ? "supported" : "not supported"}</span>`;
}
setXRStatus();

function setModeLabel(txt) {
  if (pillMode) pillMode.innerHTML = `Mode: <span class="muted">${txt}</span>`;
}

// ---------- THREE setup ----------
const app = document.getElementById("app");
if (!app) throw new Error("FATAL: #app missing in index.html");

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.xr.enabled = true;
app.appendChild(renderer.domElement);

pushLog("Renderer created ✅", "ok");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 2000);
camera.position.set(0, 1.6, 3);

const player = new THREE.Group();
player.name = "PlayerRig";
player.add(camera);
scene.add(player);

pushLog("PlayerRig + Camera created ✅", "ok");
scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 0.85));

// ---------- VR Button ----------
try {
  const b = VRButton.createButton(renderer);
  vrSlot?.appendChild(b);
  pushLog("VRButton appended ✅", "ok");
} catch (e) {
  pushLog(`VRButton failed: ${safeToString(e)}`, "warn");
}

// Controllers placeholder (compatible with your world)
const controllers = { left: null, right: null, lasers: [] };

// ---------- Flat Mode Controls ----------
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
let flatControlsEnabled = true;

const flat = { moveX:0, moveY:0, lookYaw:0, lookPitch:0, dragging:false, lastX:0, lastY:0, speed:2.4 };

function enableFlatUI(on){
  if (!isMobile) return;
  if (joy) joy.style.display = on ? "block" : "none";
  if (hint) hint.style.display = on ? "block" : "none";
}
enableFlatUI(true);

function applyFlatLook(dx, dy){
  const sens = 0.0032;
  flat.lookYaw -= dx * sens;
  flat.lookPitch -= dy * sens;
  flat.lookPitch = Math.max(-1.15, Math.min(1.15, flat.lookPitch));
  camera.rotation.order = "YXZ";
  camera.rotation.y = flat.lookYaw;
  camera.rotation.x = flat.lookPitch;
}

window.addEventListener("pointerdown", (e)=>{
  if (!flatControlsEnabled) return;
  if (joy && (e.target === joy || joy.contains(e.target))) return;
  flat.dragging = true;
  flat.lastX = e.clientX;
  flat.lastY = e.clientY;
});
window.addEventListener("pointermove", (e)=>{
  if (!flat.dragging || !flatControlsEnabled) return;
  const dx = e.clientX - flat.lastX;
  const dy = e.clientY - flat.lastY;
  flat.lastX = e.clientX;
  flat.lastY = e.clientY;
  applyFlatLook(dx, dy);
});
window.addEventListener("pointerup", ()=>{ flat.dragging = false; });

let joyActive=false;
let joyCenter={x:0,y:0};
function setJoyKnob(nx, ny){
  if (!joyKnob) return;
  const r=46;
  joyKnob.style.transform = `translate(${nx*r}px, ${ny*r}px) translate(-50%,-50%)`;
}

joy?.addEventListener("pointerdown",(e)=>{
  joyActive=true;
  joy.setPointerCapture(e.pointerId);
  const rect=joy.getBoundingClientRect();
  joyCenter.x=rect.left+rect.width/2;
  joyCenter.y=rect.top+rect.height/2;
});
joy?.addEventListener("pointermove",(e)=>{
  if(!joyActive) return;
  const dx=e.clientX-joyCenter.x;
  const dy=e.clientY-joyCenter.y;
  const max=46;
  const nx=Math.max(-1,Math.min(1,dx/max));
  const ny=Math.max(-1,Math.min(1,dy/max));
  flat.moveX=nx;
  flat.moveY=-ny;
  setJoyKnob(nx, ny);
});
joy?.addEventListener("pointerup",()=>{
  joyActive=false;
  flat.moveX=0; flat.moveY=0;
  setJoyKnob(0,0);
});

renderer.xr.addEventListener("sessionstart", ()=>{
  flatControlsEnabled=false;
  enableFlatUI(false);
  setModeLabel("XR session");
  pushLog("XR session started ✅","ok");
});
renderer.xr.addEventListener("sessionend", ()=>{
  flatControlsEnabled=true;
  enableFlatUI(true);
  setModeLabel("flat");
  pushLog("XR session ended","warn");
});

window.addEventListener("resize", ()=>{
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// ---------- Load World ----------
(async ()=>{
  try{
    setModeLabel("loading world");
    pushLog("Import world.js ✅","ok");

    await World.init({
      THREE, scene, renderer, camera, player, controllers,
      log: console.log,
      BUILD
    });

    pushLog("World init ✅","ok");
    setModeLabel("ready");
  }catch(e){
    pushLog(`World init FAIL: ${safeToString(e)}`,"bad");
    setModeLabel("world fail");
  }
})();

// ---------- Render loop ----------
const clock = new THREE.Clock();

renderer.setAnimationLoop(()=>{
  const dt = clock.getDelta();

  if(flatControlsEnabled){
    const forward = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
    const right = new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);
    forward.y=0; right.y=0;
    forward.normalize(); right.normalize();

    const move = new THREE.Vector3()
      .addScaledVector(right, flat.moveX)
      .addScaledVector(forward, flat.moveY);

    if(move.lengthSq()>0.0001){
      move.normalize().multiplyScalar(flat.speed*dt);
      player.position.add(move);
    }
  }

  renderer.render(scene,camera);
});

pushLog("Animation loop running ✅","ok");
setModeLabel("flat");
