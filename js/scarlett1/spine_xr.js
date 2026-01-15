// /js/scarlett1/spine_xr.js — VRButton + Controllers + Lasers + SpawnPad Teleport

export async function installXR({ THREE, DIAG }) {
  const D = DIAG || console;

  const W = window.__SCARLETT1__;
  if (!W || !W.renderer || !W.scene || !W.camera) {
    D.warn("[xr] world not ready, skipping XR install");
    return;
  }

  const { renderer, scene, camera, spawnPads, teleportTo } = W;

  // Import VRButton from your repo (root /js/VRButton.js)
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

  // Ray helpers
  const raycaster = new THREE.Raycaster();
  const tmpMat = new THREE.Matrix4();

  function getPadHitFromController(ctrl) {
    tmpMat.identity().extractRotation(ctrl.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(ctrl.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tmpMat);
    const hits = raycaster.intersectObjects(spawnPads || [], false);
    return hits && hits[0] ? hits[0].object : null;
  }

  function getPadHitFromCameraCenter() {
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    const hits = raycaster.intersectObjects(spawnPads || [], false);
    return hits && hits[0] ? hits[0].object : null;
  }

  function teleportToPad(pad) {
    if (!pad || !pad.userData || !pad.userData.teleportPos) return;
    teleportTo(pad.userData.teleportPos);
    D.log("[teleport] →", pad.userData.label || "PAD");
  }

  // Controllers + Lasers + click-to-teleport
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
      ray.scale.z = 12;
      return ray;
    };

    controller1.add(makeRay(0xff33aa)); // pink
    controller2.add(makeRay(0x33aaff)); // blue

    controller1.addEventListener("selectstart", () => {
      const pad = getPadHitFromController(controller1);
      teleportToPad(pad);
    });
    controller2.addEventListener("selectstart", () => {
      const pad = getPadHitFromController(controller2);
      teleportToPad(pad);
    });

    D.log("[xr] controllers + lasers installed ✅");
    D.log("[xr] spawn pad teleport enabled ✅");
  } catch (e) {
    D.error("[xr] controller install failed", e);
  }

  // Android / desktop: tap/click to teleport to pad in center of view
  try {
    const el = renderer.domElement;
    el.style.touchAction = "none";
    el.addEventListener("pointerdown", () => {
      const pad = getPadHitFromCameraCenter();
      teleportToPad(pad);
    });
    D.log("[xr] pointer teleport enabled ✅");
  } catch (e) {
    D.warn("[xr] pointer teleport install failed", e);
  }
                        }
