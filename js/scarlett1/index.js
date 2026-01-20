const BUILD = "SCARLETT_UPDATE_18_FULL_GH";
window.SCARLETT = window.SCARLETT || {};
window.SCARLETT.BUILD = BUILD;
window.SCARLETT.engineAttached = true;
window.__scarlettEngineAttached = true;

import { createDiag, hookDiagUI } from "../modules/diag.js";
import { initWorld } from "../world.js";
import { installTeleport } from "../modules/teleport.js";
import { installMovement } from "../modules/movement.js";

function qs(id){ return document.getElementById(id); }

function setVrDiagVisible(v) {
  const vr = qs("vrDiag");
  if (vr) vr.setAttribute("visible", !!v);
  const btn = qs("btnVrDiag");
  if (btn) btn.textContent = `VR Diag: ${v ? "ON" : "OFF"}`;
}

async function installEnterVR(scene, diag){
  const btn = qs("btnEnterVR");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    try{
      diag.write("[xr] Enter VR clicked…");
      if (!navigator.xr) { diag.write("[xr] navigator.xr missing ❌"); return; }
      const supported = await navigator.xr.isSessionSupported("immersive-vr");
      diag.write(`[xr] immersive-vr supported=${supported}`);
      if (!supported) return;

      const session = await navigator.xr.requestSession("immersive-vr", {
        requiredFeatures: ["local-floor"],
        optionalFeatures: ["hand-tracking"]
      });

      const renderer = scene.renderer;
      renderer.xr.setReferenceSpaceType("local-floor");
      await renderer.xr.setSession(session);

      diag.write("[xr] session started ✅");
      setVrDiagVisible(false);
    } catch(e){
      diag.write("[xr] start failed ❌ " + (e?.message || e));
    }
  });
}

function safeSpawn(rig, diag){
  rig.object3D.position.set(0, 0, 0);
  rig.object3D.rotation.set(0, 0, 0);
  diag.write("[spawn] rig=(0,0,0) facing -Z ✅");
}

function bindVrDiagToggles(diag){
  let on = false;
  const btn = qs("btnVrDiag");
  btn?.addEventListener("click", () => {
    on = !on;
    setVrDiagVisible(on);
    diag.write(`[vr-diag] ${on ? "ON" : "OFF"}`);
  });

  const left = qs("leftHand");
  const right = qs("rightHand");
  const toggle = () => {
    on = !on;
    setVrDiagVisible(on);
    diag.write(`[vr-diag] ${on ? "ON" : "OFF"} (controller)`);
  };

  left?.addEventListener("xbuttondown", toggle);
  left?.addEventListener("ybuttondown", toggle);
  right?.addEventListener("abuttondown", toggle);
  right?.addEventListener("bbuttondown", toggle);
}

async function main(){
  const diag = createDiag();
  hookDiagUI(diag);

  diag.write(`[0.000] booting… BUILD=${BUILD}`);
  diag.write(`[0.001] href=${location.href}`);
  diag.write(`[0.002] secureContext=${window.isSecureContext}`);
  diag.write(`[0.003] ua=${navigator.userAgent}`);
  diag.write(`[0.004] touch=${("ontouchstart" in window)} maxTouchPoints=${navigator.maxTouchPoints||0}`);
  diag.write(`[0.005] xr=${!!navigator.xr}`);

  const scene = document.querySelector("a-scene");
  const rig = qs("rig");
  const camera = qs("camera");

  if (!scene || !rig || !camera) {
    diag.write("[fatal] missing scene/rig/camera ❌");
    return;
  }

  await new Promise((res) => {
    if (scene.renderer) return res();
    scene.addEventListener("renderstart", () => res(), { once: true });
  });
  diag.write("[scene] renderstart ✅");

  safeSpawn(rig, diag);

  setVrDiagVisible(false);
  bindVrDiagToggles(diag);

  try { initWorld({ diag }); } catch(e){ diag.write("[world] failed ❌ " + (e?.message || e)); }
  try { installTeleport({ scene, rig, diag }); } catch(e){ diag.write("[teleport] failed ❌ " + (e?.message || e)); }
  try { installMovement({ rig, camera, diag }); } catch(e){ diag.write("[move] failed ❌ " + (e?.message || e)); }
  await installEnterVR(scene, diag);

  diag.write("[ready] ✅");
}

main().catch(e => { try { window.__scarlettDiagWrite?.("[fatal] " + (e?.message || e)); } catch(_){} });
