// /js/scarlett1/spine_xr.js — VRButton + Controllers + Lasers (safe, no crashes)

export async function installXR({ THREE, DIAG }) {
  const D = DIAG || console;

  const W = window.__SCARLETT1__;
  if (!W || !W.renderer || !W.scene || !W.camera) {
    D.warn("[xr] world not ready, skipping XR install");
    return;
  }

  const { renderer, scene } = W;

  // Import VRButton from your repo (you already have /js/VRButton.js)
  let VRButton;
  try {
    const mod = await import(`/scarlett-poker-vr/js/VRButton.js?v=${Date.now()}`);
    VRButton = mod.VRButton || mod.default || mod;
  } catch (e) {
    D.error("[xr] VRButton import failed", e);
    return;
  }

  try {
    const btn = VRButton.createButton(renderer);
    btn.style.zIndex = 999999;
    document.body.appendChild(btn);
    D.log("[xr] VRButton appended ✅");
  } catch (e) {
    D.error("[xr] VRButton create failed", e);
    return;
  }

  // Controllers + Lasers
  try {
    const controller1 = renderer.xr.getController(0);
    const controller2 = renderer.xr.getController(1);
    scene.add(controller1);
    scene.add(controller2);

    const rayGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1)
    ]);

    const makeRay = (color) => {
      const mat = new THREE.LineBasicMaterial({ color });
      const ray = new THREE.Line(rayGeo, mat);
      ray.name = "laser";
      ray.scale.z = 10;
      return ray;
    };

    controller1.add(makeRay(0xff33aa)); // pink
    controller2.add(makeRay(0x33aaff)); // blue

    D.log("[xr] controllers + lasers installed ✅");
  } catch (e) {
    D.error("[xr] controller install failed", e);
  }
}
