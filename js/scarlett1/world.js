// /js/scarlett1/world.js
// SCARLETT1 WORLD ORCHESTRATOR (FULL) — Stage-by-stage proof logs
export async function bootWorld({ DIAG, H }) {
  const HUD = (s) => (typeof H === "function" ? H(s) : console.log("[world]", s));
  const err = (...a) => console.error("[world]", ...a);

  HUD("step: world start");

  let THREE, VRButton;
  try {
    HUD("step: importing three");
    THREE = await import("https://unpkg.com/three@0.158.0/build/three.module.js");
    HUD("step: importing VRButton");
    VRButton = await import("https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js");
    HUD("step: imports ok");
  } catch (e) {
    err(e);
    throw new Error("imports failed (three/VRButton)");
  }

  const app = document.getElementById("app") || document.body;

  HUD("step: creating renderer");
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d0f12);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 300);
  camera.position.set(0, 1.6, 3);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.xr.enabled = true;

  // replace old canvas if any
  const old = document.getElementById("scarlettCanvas");
  if (old && old.parentNode) old.parentNode.removeChild(old);
  renderer.domElement.id = "scarlettCanvas";
  app.appendChild(renderer.domElement);

  HUD("step: VRButton");
  try {
    const btn = VRButton.VRButton.createButton(renderer);
    btn.style.zIndex = "99998";
    document.body.appendChild(btn);
    HUD("step: VRButton ok");
  } catch (e) {
    HUD("step: VRButton failed (ok)");
  }

  // simple scene so you ALWAYS see something
  scene.add(new THREE.HemisphereLight(0xffffff, 0x222244, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff, 0.9);
  sun.position.set(6, 10, 3);
  scene.add(sun);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({ color: 0x1c2126, roughness: 1, metalness: 0 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 0.95, 0.14, 48),
    new THREE.MeshStandardMaterial({ color: 0x2a7a5e, roughness: 0.95 })
  );
  table.position.set(0, 0.85, 0);
  scene.add(table);

  const rig = new THREE.Group();
  rig.position.set(0, 0, 3.2);
  rig.add(camera);
  scene.add(rig);

  camera.lookAt(0, 1.0, 0);

  HUD("step: setAnimationLoop");
  renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
  });

  // one immediate render
  try { renderer.render(scene, camera); } catch (e) {}

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  HUD("step: world ready ✅");
}
