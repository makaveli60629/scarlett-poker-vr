// /js/vr_ui_panel.js — Scarlett VR Poker (VR Panel) V1.0
// In-world simple button panel: Stand / Sit / Spectate / Recenter
// Uses controller ray + trigger ("selectstart") if controllers exist.
// Also works with keyboard for quick dev: 1=Stand 2=Sit 3=Spectate R=Recenter

function log(m) {
  try { window.dispatchEvent(new CustomEvent("scarlett-log", { detail: String(m) })); } catch {}
  try { console.log(m); } catch {}
}

function makeButtonCanvas(label) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 256;
  const g = c.getContext("2d");

  // background
  g.fillStyle = "rgba(10,12,20,0.92)";
  g.fillRect(0, 0, c.width, c.height);

  // border
  g.strokeStyle = "rgba(127,231,255,0.35)";
  g.lineWidth = 10;
  g.strokeRect(12, 12, c.width - 24, c.height - 24);

  // text
  g.fillStyle = "rgba(232,236,255,0.96)";
  g.font = "bold 64px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(label, c.width / 2, c.height / 2);

  return c;
}

function makeButton(THREE, label, onSelect) {
  const canvas = makeButtonCanvas(label);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  tex.needsUpdate = true;

  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const geo = new THREE.PlaneGeometry(0.36, 0.18);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData.onSelect = onSelect;
  mesh.userData._label = label;

  // add a small backing plate for readability
  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(0.38, 0.20),
    new THREE.MeshBasicMaterial({ color: 0x05060a, transparent: true, opacity: 0.5 })
  );
  back.position.z = -0.001;
  mesh.add(back);

  return mesh;
}

export async function init(ctx) {
  const { THREE, scene, camera, controllers, world } = ctx;

  if (!THREE || !scene || !camera || !world) {
    log("[vr_ui_panel] missing ctx pieces, abort");
    return;
  }

  // Panel root follows camera (VR HUD in 3D)
  const root = new THREE.Group();
  root.name = "vr_ui_panel_root";
  scene.add(root);

  // Position in front of camera
  function placeRoot() {
    // keep it in front of the camera
    root.position.copy(camera.position);
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    root.position.add(dir.multiplyScalar(0.75));
    root.position.y += 0.05;
    root.quaternion.copy(camera.quaternion);
  }
  placeRoot();

  // Buttons
  const btnStand = makeButton(THREE, "STAND", () => world.stand());
  const btnSit = makeButton(THREE, "SIT", () => world.sit(world.seatedIndex >= 0 ? world.seatedIndex : 0));
  const btnSpec = makeButton(THREE, "SPECTATE", () => world.spectate(0));
  const btnRec = makeButton(THREE, "RECENTER", () => world.recenter());

  // Layout
  const pad = 0.20;
  btnStand.position.set(-pad, 0.12, 0);
  btnSit.position.set(pad, 0.12, 0);
  btnSpec.position.set(-pad, -0.12, 0);
  btnRec.position.set(pad, -0.12, 0);

  root.add(btnStand, btnSit, btnSpec, btnRec);

  // Interactions: controller ray + trigger
  const ray = new THREE.Raycaster();
  const tmpMat = new THREE.Matrix4();
  const dir = new THREE.Vector3(0, 0, -1);
  const objs = [btnStand, btnSit, btnSpec, btnRec];

  function castFromController(ctrl) {
    // ctrl is usually a THREE.Group with matrixWorld
    tmpMat.identity().extractRotation(ctrl.matrixWorld);
    const origin = new THREE.Vector3().setFromMatrixPosition(ctrl.matrixWorld);
    const direction = dir.clone().applyMatrix4(tmpMat).normalize();
    ray.set(origin, direction);
    return ray.intersectObjects(objs, true);
  }

  function onSelectStart(e) {
    const ctrl = e.target;
    const hits = castFromController(ctrl);
    if (hits && hits.length) {
      const obj = hits[0].object;
      const fn = obj?.userData?.onSelect || obj?.parent?.userData?.onSelect;
      if (typeof fn === "function") {
        log(`[vr_ui_panel] select ${obj.userData?._label || obj.parent?.userData?._label || "button"}`);
        fn();
      }
    }
  }

  // Attach to controllers if present
  if (Array.isArray(controllers)) {
    for (const c of controllers) {
      if (c?.addEventListener) c.addEventListener("selectstart", onSelectStart);
    }
  } else if (controllers?.left?.addEventListener || controllers?.right?.addEventListener) {
    controllers.left?.addEventListener("selectstart", onSelectStart);
    controllers.right?.addEventListener("selectstart", onSelectStart);
  }

  // Optional update hook (if main calls world.update(dt))
  world.onUpdate.push(() => {
    // keep anchored in front of camera
    placeRoot();
  });

  // Keyboard dev controls
  window.addEventListener("keydown", (e) => {
    const k = (e.key || "").toLowerCase();
    if (k === "1") world.stand();
    if (k === "2") world.sit(0);
    if (k === "3") world.spectate(0);
    if (k === "r") world.recenter();
  });

  log("[vr_ui_panel] init ✅ (Stand/Sit/Spectate/Recenter)");
    }
