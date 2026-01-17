import * as THREE from "three";
import { setupAndroidControls } from "./android_controls.js";

export async function setupControls(ctx) {
  const { scene, renderer, log } = ctx;

  // XR controllers + rays (Quest)
  const ctrls = [];
  const makeRay = () => {
    const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]);
    const l = new THREE.Line(g, new THREE.LineBasicMaterial());
    l.scale.z = 7;
    return l;
  };

  for (let i = 0; i < 2; i++) {
    const c = renderer.xr.getController(i);
    scene.add(c);
    ctrls.push(c);
    c.add(makeRay());
    c.addEventListener("connected", (e) => {
      c.userData.gamepad = e.data.gamepad || null;
      log?.(`🎮 pad${i} connected`);
    });
  }

  // Android overlay only when not in XR
  const android = setupAndroidControls(ctx);

  let last = [{},{}];
  function tick() {
    if (!renderer.xr.isPresenting) android?.tick?.();

    // Button map diagnostics (Quest)
    for (let i = 0; i < ctrls.length; i++) {
      const gp = ctrls[i].userData.gamepad;
      if (!gp?.buttons) continue;
      for (let b = 0; b < gp.buttons.length; b++) {
        const p = !!gp.buttons[b].pressed;
        if (last[i][b] !== p) {
          last[i][b] = p;
          log?.(`🧪 pad${i} b${b}=${p ? "DOWN" : "UP"}`);
        }
      }
    }
  }

  log?.("[controls] ready ✓ (Quest controllers + Android touch overlay)");
  return { controllers: ctrls, tick };
}
