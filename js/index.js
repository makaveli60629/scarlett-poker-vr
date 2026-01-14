// /js/index.js — Scarlett Deploy-Proof Entry v1 (FULL)
// VRButton + diagnostics + calls Controls then World.

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js";
import { VRButton } from "./VRButton.js";
import { Controls } from "./controls.js";
import { World } from "./world.js";

function $(id){ return document.getElementById(id); }
function setText(id, txt){ var el=$(id); if(el) el.textContent = txt; }

function hudLog(){
  var el = $("logBox");
  var msg = Array.prototype.slice.call(arguments).join(" ");
  console.log(msg);
  if (el) { el.textContent += "\n" + msg; el.scrollTop = el.scrollHeight; }
}

function hideLoader(){
  var el = $("loader");
  if (el) { el.style.display = "none"; el.style.pointerEvents = "none"; }
}

function toggleHud(){
  var hud = $("hud");
  var diag = $("diag");
  var btn = $("btnHud");
  var hidden = hud && hud.classList.contains("hidden");
  if (hidden) {
    hud.classList.remove("hidden");
    if (diag) diag.classList.remove("hidden");
    if (btn) btn.textContent = "HIDE HUD";
  } else {
    if (hud) hud.classList.add("hidden");
    if (diag) diag.classList.add("hidden");
    if (btn) btn.textContent = "SHOW HUD";
  }
}

function copyLog(){
  var el = $("logBox");
  var txt = el ? el.textContent : "";
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(txt).then(function(){
      hudLog("[hud] copied ✅");
    }).catch(function(){
      hudLog("[hud] copy failed ❌");
    });
  } else {
    hudLog("[hud] clipboard not available");
  }
}

var renderer, scene, camera, player;
var lastT = 0;
var fpsAcc = 0, fpsN = 0, fpsT0 = 0;

function init(){
  hudLog("[index] start ✅");
  hudLog("href=" + location.href);
  hudLog("secureContext=" + window.isSecureContext);
  hudLog("ua=" + navigator.userAgent);
  hudLog("navigator.xr=" + (!!navigator.xr));

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  var vrBtn = VRButton.createButton(renderer);
  vrBtn.style.position = "fixed";
  vrBtn.style.left = "20px";
  vrBtn.style.bottom = "20px";
  vrBtn.style.zIndex = "9999";
  document.body.appendChild(vrBtn);
  hudLog("[index] VRButton ✅");

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 900);
  camera.position.set(0, 1.6, 0);

  player = new THREE.Group();
  player.name = "PlayerRig";
  player.add(camera);
  scene.add(player);

  window.addEventListener("resize", function(){
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  if ($("btnHud")) $("btnHud").addEventListener("click", toggleHud);
  if ($("btnCopy")) $("btnCopy").addEventListener("click", copyLog);

  try {
    Controls.init({ THREE: THREE, renderer: renderer, scene: scene, camera: camera, player: player,
      log: function(){ hudLog.apply(null, ["[ctrl]"].concat([].slice.call(arguments))); },
      warn: function(){ hudLog.apply(null, ["[ctrl][warn]"].concat([].slice.call(arguments))); },
      err: function(){ hudLog.apply(null, ["[ctrl][err]"].concat([].slice.call(arguments))); }
    });
    hudLog("[index] Controls init ✅");
  } catch(e) {
    hudLog("[index] Controls init FAILED ❌", e && e.message ? e.message : e);
  }

  World.init({ THREE: THREE, scene: scene, renderer: renderer, camera: camera, player: player,
    log: function(){ hudLog.apply(null, ["[world]"].concat([].slice.call(arguments))); }
  }).then(function(){
    hudLog("[index] World READY ✅");
    hideLoader();
  }).catch(function(e){
    hudLog("[index] World init FAILED ❌", e && e.message ? e.message : e);
  });

  window.addEventListener("error", function(e){
    hudLog("[ERR]", e && e.message ? e.message : e);
  });
  window.addEventListener("unhandledrejection", function(e){
    hudLog("[PROMISE ERR]", e && e.reason ? (e.reason.message || e.reason) : e);
  });

  lastT = performance.now();
  fpsT0 = lastT;

  renderer.setAnimationLoop(function(t){
    var dt = Math.min(0.05, (t - lastT) / 1000);
    lastT = t;

    try { Controls.update(dt); } catch(_e){}
    try { World.update(dt, t); } catch(_e){}

    renderer.render(scene, camera);

    setText("debugXR", renderer.xr.isPresenting ? "XR:on" : "XR:off");
    setText("debugPos", "pos x:" + player.position.x.toFixed(2) + " y:" + player.position.y.toFixed(2) + " z:" + player.position.z.toFixed(2));

    if (Controls.getPadDebug) setText("debugPad", Controls.getPadDebug());
    if (Controls.getButtonDebug) setText("debugBtns", Controls.getButtonDebug());

    fpsAcc += 1 / Math.max(0.0001, dt);
    fpsN++;
    if ((t - fpsT0) > 500) {
      setText("debugPerf", "fps:" + (fpsAcc / fpsN).toFixed(0));
      fpsAcc = 0; fpsN = 0; fpsT0 = t;
    }
  });

  hudLog("[index] init done ✅");
}

init();
