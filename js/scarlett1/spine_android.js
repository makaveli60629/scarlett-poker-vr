// spine_android.js — TOUCH locomotion (SAFE)

export function initAndroidControls(world) {
  const { camera, rig } = world;

  let forward = false;
  let back = false;
  let speed = 0.04;

  const btn = document.createElement("div");
  btn.innerText = "MOVE";
  btn.style.cssText = `
    position:fixed;
    bottom:20px;
    left:20px;
    width:90px;
    height:90px;
    background:#1b2a55cc;
    border-radius:14px;
    color:white;
    display:flex;
    align-items:center;
    justify-content:center;
    font-weight:bold;
    z-index:9999;
    user-select:none;
  `;
  document.body.appendChild(btn);

  btn.addEventListener("touchstart", () => (forward = true));
  btn.addEventListener("touchend", () => (forward = false));

  function update() {
    if (forward) {
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      dir.y = 0;
      rig.position.addScaledVector(dir.normalize(), speed);
    }
    requestAnimationFrame(update);
  }
  update();
}
