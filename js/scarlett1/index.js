const BUILD = "SCARLETT_UPDATE_19_FULL_GH";
window.SCARLETT = window.SCARLETT || {};
window.SCARLETT.BUILD = BUILD;
window.SCARLETT.engineAttached = true;
window.__scarlettEngineAttached = true;

import { createDiag, hookDiagUI } from "../modules/diag.js";
import { initWorld } from "../world.js";
import { installTeleport } from "../modules/teleport.js";
import { installMovement } from "../modules/movement.js";

function qs(id){ return document.getElementById(id); }

function safeSpawn(rig, diag){
  rig.object3D.position.set(0, 0, 0);
  rig.object3D.rotation.set(0, 0, 0);
  diag.write("[spawn] rig=(0,0,0) facing -Z ✅");
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

  try { initWorld({ diag }); } catch(e){ diag.write("[world] failed ❌ " + (e?.message || e)); }
  try { installTeleport({ scene, rig, diag }); } catch(e){ diag.write("[teleport] failed ❌ " + (e?.message || e)); }
  try { installMovement({ rig, camera, diag }); } catch(e){ diag.write("[move] failed ❌ " + (e?.message || e)); }

  const btnEnterVR = qs("btnEnterVR");
  btnEnterVR?.addEventListener("click", async () => {
    try {
      diag.write("[xr] Enter VR clicked…");
      // Let A-Frame manage XR session -> fixes mono/flat issues.
      if (scene.enterVR) {
        await scene.enterVR();
        diag.write("[xr] scene.enterVR() called ✅");
      } else {
        diag.write("[xr] scene.enterVR missing ❌");
      }
    } catch (e) {
      diag.write("[xr] enterVR failed ❌ " + (e?.message || e));
    }
  });

  scene.addEventListener("enter-vr", () => diag.write("[xr] enter-vr event ✅"));
  scene.addEventListener("exit-vr", () => diag.write("[xr] exit-vr event"));

  diag.write("[ready] ✅");
}

main().catch(e => { try { window.__scarlettDiagWrite?.("[fatal] " + (e?.message || e)); } catch(_){} });
