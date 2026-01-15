// /js/scarlett1/spine_xr.js — XR + Controllers + Lasers (Quest)
// Adds VRButton, creates controllers + laser rays, parents them to rig.

export function installXR({ THREE, world, diag }) {
  const { renderer, scene, rig } = world;

  // Minimal VRButton (so we don't depend on external file paths)
  function createVRButton(renderer){
    const button = document.createElement('button');
    button.style.cssText = "position:fixed;right:12px;bottom:12px;z-index:999999;padding:12px 14px;border-radius:12px;border:1px solid rgba(120,160,255,0.35);background:rgba(70,110,255,0.22);color:#eaf0ff;font-weight:800;";
    button.textContent = 'Enter VR';
    button.addEventListener('click', async () => {
      if(!navigator.xr){
        diag?.error?.("WebXR not available");
        return;
      }
      try{
        const session = await navigator.xr.requestSession('immersive-vr', {
          optionalFeatures: ['local-floor','bounded-floor','hand-tracking','layers','dom-overlay'],
          domOverlay: { root: document.body }
        });
        renderer.xr.setSession(session);
      } catch(e){
        diag?.error?.("requestSession failed:", e?.message || e);
      }
    });
    return button;
  }

  // Add button if on XR-capable browser
  if (navigator.xr) {
    document.body.appendChild(createVRButton(renderer));
    diag?.log?.("[xr] VR button ready ✅");
  } else {
    diag?.warn?.("[xr] navigator.xr not found (ok on some mobile browsers)");
  }

  // Controllers
  const controller1 = renderer.xr.getController(0);
  const controller2 = renderer.xr.getController(1);
  rig.add(controller1);
  rig.add(controller2);

  // Laser helper
  function makeLaser(color=0xff00ff){
    const g = new THREE.BufferGeometry().setFromPoints([ new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1) ]);
    const m = new THREE.LineBasicMaterial({ color });
    const line = new THREE.Line(g,m);
    line.name = "Laser";
    line.scale.z = 6;
    return line;
  }

  controller1.add(makeLaser(0xff4bd1)); // pink
  controller2.add(makeLaser(0x4bb7ff)); // blue

  // Small controller grips (so you can see something)
  const grip1 = renderer.xr.getControllerGrip(0);
  const grip2 = renderer.xr.getControllerGrip(1);
  const geo = new THREE.SphereGeometry(0.02, 12, 12);
  const mat1 = new THREE.MeshBasicMaterial({ color: 0xff4bd1 });
  const mat2 = new THREE.MeshBasicMaterial({ color: 0x4bb7ff });
  grip1.add(new THREE.Mesh(geo, mat1));
  grip2.add(new THREE.Mesh(geo, mat2));
  rig.add(grip1); rig.add(grip2);

  renderer.xr.addEventListener("sessionstart", () => {
    diag?.setStatus?.("XR session started ✅");
    // Ensure you're facing the table when entering
    // In XR, yaw comes from headset, but rig position matters.
    world.rig.position.set(0, 0, 3.2);
  });

  renderer.xr.addEventListener("sessionend", () => {
    diag?.setStatus?.("XR session ended");
  });

  diag?.log?.("[xr] controllers + lasers installed ✅");
}
