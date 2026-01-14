// /js/index.js — Scarlett Single-Baseline Entry v14 (FULL)
// ✅ VRButton always appended
// ✅ On-screen green log + status pills
// ✅ Hide/Show HUD + Copy log
// ✅ Uses core/ui_sticks.js (no duplicates)
// ✅ Calls Controls first, then World, then kills loader

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js";
import { VRButton } from "./VRButton.js";
import { Controls } from "./controls.js";
import { World } from "./world.js";
import { UISticks } from "./core/ui_sticks.js"; // <-- YOUR CORE FOLDER

const logBox = () => document.getElementById("logBox");
const setText = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };

function hudLog(...a){
  const line = a.map(x => (typeof x === "string" ? x : JSON.stringify(x))).join(" ");
  console.log(line);
  const el = logBox();
  if (el) { el.textContent += "\n" + line; el.scrollTop = el.scrollHeight; }
}

function hideLoader(){
  const el = document.getElementById("loader");
  if (el) { el.style.display = "none"; el.style.pointerEvents = "none"; }
}

function toggleHud(){
  const hud = document.getElementById("hud");
  const diag = document.getElementById("diag");
  const btn = document.getElementById("btnHud");
  const hidden = hud?.classList.contains("hidden");

  if (hidden) {
    hud.classList.remove("hidden");
    diag?.classList.remove("hidden");
    if (btn) btn.textContent = "HIDE HUD";
  } else {
    hud?.classList.add("hidden");
    diag?.classList.add("hidden");
    if (btn) btn.textContent = "SHOW HUD";
  }
}

function copyLog(){
  const txt = logBox()?.textContent || "";
  navigator.clipboard?.writeText(txt)
    .then(() => hudLog("[hud] copied ✅"))
    .catch(() => hudLog("[hud] copy failed ❌"));
}

let renderer, scene, camera, player;
let worldReady = false;

function init(){
  hudLog("[index] start ✅");
  hudLog(`href=${location.href}`);
  hudLog(`secureContext=${window.isSecureContext}`);
  hudLog(`ua=${navigator.userAgent}`);
  hudLog(`navigator.xr=${!!navigator.xr}`);

  renderer = new THREE.WebGLRenderer({ antialias:true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // VR button (guaranteed)
  const vrBtn = VRButton.createButton(renderer);
  vrBtn.style.position = "fixed";
  vrBtn.style.left = "20px";
  vrBtn.style.bottom = "20px";
  vrBtn.style.zIndex = "9999";
  document.body.appendChild(vrBtn);
  hudLog("[index] VRButton ✅");

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 900);
  camera.position.set(0, 1.6, 0);

  player = new THREE.Group();
  player.name = "PlayerRig";
  player.add(camera);
  scene.add(player);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // HUD buttons
  document.getElementById("btnHud")?.addEventListener("click", toggleHud);
  document.getElementById("btnCopy")?.addEventListener("click", copyLog);

  // Android sticks (from core) — safe even if your core file is “no-op” on Quest
  try {
    UISticks?.init?.({
      leftZoneId: "stickL", rightZoneId: "stickR",
      leftNubId: "nubL", rightNubId: "nubR",
      touchRootId: "touchSticks",
      log: (...a) => hudLog("[ui]", ...a)
    });
  } catch (e) {
    hudLog("[ui] init skipped:", e?.message || e);
  }

  // Controls FIRST (single baseline)
  Controls.init({
    THREE, renderer, scene, camera, player,
    log: (...a)=>hudLog("[ctrl]", ...a),
    warn:(...a)=>hudLog("[ctrl][warn]", ...a),
    err: (...a)=>hudLog("[ctrl][err]", ...a)
  });

  // World SECOND (safe; does not own controls)
  World.init({
    THREE, scene, renderer, camera, player,
    log: (...a)=>hudLog("[world]", ...a)
  }).then(() => {
    worldReady = true;
    hideLoader();
    hudLog("[index] World READY ✅ loader hidden");
  }).catch((e) => {
    hudLog("[index] World init FAILED ❌", e?.message || e);
  });

  // Global errors to HUD
  window.addEventListener("error", (e) => hudLog("[ERR]", e?.message || e));
  window.addEventListener("unhandledrejection", (e) => hudLog("[PROMISE ERR]", e?.reason?.message || e?.reason || e));

  // Render loop + diagnostics
  let lastT = performance.now();
  let fpsAcc = 0, fpsN = 0, fpsT0 = performance.now();

  renderer.setAnimationLoop((t) => {
    const dt = Math.min(0.05, (t - lastT) / 1000);
    lastT = t;

    // Android move/look only when NOT in XR
    if (!renderer.xr.isPresenting && UISticks?.getAxes) {
      const ax = UISticks.getAxes();
      player.rotation.y -= (ax.rx || 0) * 1.6 * dt;
      camera.rotation.x -= (ax.ry || 0) * 1.2 * dt;
      camera.rotation.x = Math.max(-1.2, Math.min(1.2, camera.rotation.x));

      const fwd = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion); fwd.y=0; fwd.normalize();
      const rgt = new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion); rgt.y=0; rgt.normalize();

      const mv = new THREE.Vector3();
      mv.addScaledVector(rgt, (ax.lx || 0));
      mv.addScaledVector(fwd, -(ax.ly || 0));
      const L = mv.length();
      if (L > 0.001) {
        mv.multiplyScalar((2.35 * dt) / L);
        player.position.add(mv);
      }
    }

    Controls.update?.(dt);
    World.update?.(dt, t);

    renderer.render(scene, camera);

    // HUD pills
    setText("debugXR", renderer.xr.isPresenting ? "XR:on" : "XR:off");
    setText("debugPos", `pos x:${player.position.x.toFixed(2)} y:${player.position.y.toFixed(2)} z:${player.position.z.toFixed(2)}`);

    const pad = Controls.getPadDebug?.() || "pad:?";
    const btns = Controls.getButtonDebug?.() || "btns:?";
    setText("debugPad", pad);
    setText("debugBtns", btns);

    fpsAcc += 1 / Math.max(0.0001, dt); fpsN++;
    if ((t - fpsT0) > 500) {
      setText("debugPerf", `fps:${(fpsAcc / fpsN).toFixed(0)}`);
      fpsAcc = 0; fpsN = 0; fpsT0 = t;
    }
  });

  hudLog("[index] init done ✅");
}

init();
