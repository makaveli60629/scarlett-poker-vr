function intersectPad(controllerEl) {
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

  btnTeleport?.addEventListener("click", () => {
    enabled = !enabled;
    setBtn();
    diag.write(`[teleport] ${enabled ? "ON" : "OFF"}`);
  });

  const doTeleportTo = (padEl) => {
    if (!padEl) return;
    const p = padEl.object3D.position;
    rig.object3D.position.set(p.x, 0, p.z);
    diag.write(`[teleport] -> ${padEl.id || "pad"} x=${p.x.toFixed(2)} z=${p.z.toFixed(2)}`);
  };

  scene.addEventListener("click", (evt) => {
    if (!enabled) return;
    const el = evt?.detail?.intersectedEl || evt?.target;
    if (el?.classList?.contains("teleTarget")) doTeleportTo(el);
  });

  const left = document.getElementById("leftHand");
  const right = document.getElementById("rightHand");
  const onTrigger = (hand) => () => enabled && doTeleportTo(intersectPad(hand));
  left?.addEventListener("triggerdown", onTrigger(left));
  right?.addEventListener("triggerdown", onTrigger(right));

  diag.write("[teleport] installed ✅ (triggerdown + click)");
}
