function padFromRay(controllerEl){
  const rc = controllerEl?.components?.raycaster;
  const ints = rc?.intersections || [];
  for (const hit of ints) {
    const el = hit?.object?.el;
    if (el?.classList?.contains("teleTarget")) return el;
  }
  return null;
}
export function installTeleport({ scene, rig, diag }) {
  let enabled = true;
  const btnTeleport = document.getElementById("btnTeleport");
  const setBtn = () => btnTeleport && (btnTeleport.textContent = `Teleport: ${enabled ? "ON" : "OFF"}`);
  setBtn();
  btnTeleport?.addEventListener("click", () => { enabled=!enabled; setBtn(); diag.write(`[teleport] ${enabled?"ON":"OFF"}`); });
  const doTeleport = (padEl) => {
    if (!enabled || !padEl) return;
    const p = padEl.object3D.position;
    rig.object3D.position.set(p.x, 0, p.z);
    diag.write(`[teleport] -> ${padEl.id||"pad"} x=${p.x.toFixed(2)} z=${p.z.toFixed(2)}`);
  };
  scene.addEventListener("click", (evt) => {
    const el = evt?.detail?.intersectedEl || evt?.target;
    if (el?.classList?.contains("teleTarget")) doTeleport(el);
  });
  const left = document.getElementById("leftHand");
  const right = document.getElementById("rightHand");
  const bind = (hand) => {
    if (!hand) return;
    hand.addEventListener("triggerdown", () => doTeleport(padFromRay(hand)));
    hand.addEventListener("gripdown", () => doTeleport(padFromRay(hand)));
  };
  bind(left); bind(right);
  diag.write("[teleport] installed ✅ (triggerdown/gripdown + click)");
}
