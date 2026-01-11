// js/index.js — Scarlett Boot v4.0 (FULL) — GitHub Pages safe paths
window.SCARLETT_BOOTED = true;

import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";

const INDEX_VERSION = 4002;
const BUILD_STAMP = Date.now();

const overlay = document.getElementById("overlay");
const LOG = [];
const LOG_MAX = 2500;

function pushLog(line){ LOG.push(line); if (LOG.length > LOG_MAX) LOG.shift(); }
function writeOverlay(line, cls="muted"){
  if (!overlay) return;
  const div = document.createElement("div");
  div.className = `row ${cls}`;
  div.textContent = line;
  overlay.appendChild(div);
  overlay.scrollTop = overlay.scrollHeight;
}
function logLine(line, cls="muted"){ const s=String(line); pushLog(s); writeOverlay(s, cls); }
const ok=(m)=>logLine(`✅ ${m}`,"ok");
const warn=(m)=>logLine(`⚠️ ${m}`,"warn");
const bad=(m)=>logLine(`❌ ${m}`,"bad");

// capture real errors
window.addEventListener("error",(e)=>{
  bad(`WINDOW ERROR: ${e?.message||"error"}${e?.filename?` @ ${e.filename}:${e.lineno}:${e.colno}`:""}`);
  if (e?.error?.stack) logLine(e.error.stack,"bad");
});
window.addEventListener("unhandledrejection",(e)=>{
  bad("UNHANDLED PROMISE REJECTION:");
  const r=e?.reason; bad(r?.message||String(r)); if (r?.stack) logLine(r.stack,"bad");
});

// expose API for HTML buttons
window.SCARLETT = {
  async copyLog(){
    const text = LOG.join("\n");
    if (!text.trim()) return;
    try { await navigator.clipboard.writeText(text); ok("Copied log ✅"); }
    catch(e){
      warn("Clipboard blocked — selecting text");
      try{
        const range=document.createRange(); range.selectNodeContents(overlay);
        const sel=window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
      }catch{}
    }
  },
  respawnSafe(){ /* will be set after rig exists */ },
  snapDown(){ /* set after rig exists */ }
};

function header(){
  logLine(`BUILD_STAMP: ${BUILD_STAMP}`);
  logLine(`TIME: ${new Date().toLocaleString()}`);
  logLine(`HREF: ${location.href}`);
  logLine(`UA: ${navigator.userAgent}`);
  logLine(`NAVIGATOR_XR: ${!!navigator.xr}`);
  logLine(`THREE: module ok`);
}

function createRenderer(){
  logLine("WEBGL_CANVAS: creating renderer…");
  const r = new THREE.WebGLRenderer({ antialias:true, alpha:false });
  r.setPixelRatio(Math.min(2, window.devicePixelRatio||1));
  r.setSize(window.innerWidth, window.innerHeight);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.xr.enabled = true;
  document.body.appendChild(r.domElement);
  ok("Renderer created");
  return r;
}

function makeRig(){
  const player = new THREE.Group();
  player.name = "PlayerRig";
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.05, 600);
  camera.position.set(0,1.65,0);
  player.add(camera);
  ok("PlayerRig + Camera created");
  return { player, camera };
}

function makeXRHands(renderer){
  const handLeft = renderer.xr.getHand(0);
  const handRight = renderer.xr.getHand(1);
  handLeft.name="HandLeft"; handRight.name="HandRight";
  ok("XR Hands placeholders ready");
  return { handLeft, handRight };
}

function attachVRButton(renderer){
  try{
    const btn = VRButton.createButton(renderer);
    btn.id="VRButton";
    document.body.appendChild(btn);
    ok("VRButton appended");
  }catch(e){
    warn("VRButton failed: " + (e?.message||e));
  }
}

async function boot(){
  overlay && (overlay.innerHTML="");
  LOG.length = 0;
  header();

  const renderer = createRenderer();
  const { player, camera } = makeRig();
  const controllers = makeXRHands(renderer);
  attachVRButton(renderer);

  // helpful buttons
  window.SCARLETT.respawnSafe = () => { player.position.set(0,0.02,26); camera.position.set(0,1.65,0); ok("respawnSafe()"); };
  window.SCARLETT.snapDown = () => { player.position.y = 0.02; camera.position.set(0,1.65,0); ok("snapDown()"); };

  window.addEventListener("resize", ()=>{
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ✅ IMPORTANT: import world relative to js/ (NO leading slash)
  let HybridWorld = null;
  try{
    ({ HybridWorld } = await import(`./world.js?v=${INDEX_VERSION}`));
    ok("world.js imported ✅");
  }catch(e){
    bad("Failed to import world.js: " + (e?.message||e));
    if (e?.stack) logLine(e.stack,"bad");
  }

  if (HybridWorld?.build){
    try{
      await HybridWorld.build({
        THREE, renderer, camera, player, controllers,
        log: (...a)=>logLine(a.map(String).join(" "), "muted"),
        OPTS: { nonvrControls:true, allowTeleport:true, allowBots:true, allowPoker:true, safeMode:false }
      });
      ok("HybridWorld.build ✅");
    }catch(e){
      bad("HybridWorld.build FAILED: " + (e?.message||e));
      if (e?.stack) logLine(e.stack,"bad");
    }
  } else {
    warn("HybridWorld not available — showing base only");
  }

  renderer.setAnimationLoop(()=>{
    try{
      HybridWorld?.frame?.({ renderer, camera });
      if (!HybridWorld?.frame) renderer.render(new THREE.Scene(), camera);
    }catch(e){
      bad("frame crash: " + (e?.message||e));
      if (e?.stack) logLine(e.stack,"bad");
      renderer.setAnimationLoop(null);
    }
  });

  ok("Animation loop running");
}

boot().catch(e=>{
  bad("BOOT fatal: " + (e?.message||e));
  if (e?.stack) logLine(e.stack,"bad");
});
