const V3 = (x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);

function pickBestGamepad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  let best = null;
  for (const gp of pads) {
    if (!gp) continue;
    // Prefer Oculus/Meta controllers
    const id = (gp.id || "").toLowerCase();
    const score =
      (id.includes("oculus") || id.includes("meta") || id.includes("touch")) ? 10 :
      (id.includes("xr") || id.includes("openxr")) ? 6 :
      1;
    if (!best || score > best.score) best = { gp, score };
  }
  return best?.gp || null;
}

function getStick(gp) {
  if (!gp || !gp.axes) return { x:0, y:0 };
  // Meta Quest usually uses axes[2], axes[3] for the left stick in WebXR
  const pairs = [
    { x: gp.axes[2], y: gp.axes[3] },
    { x: gp.axes[0], y: gp.axes[1] }
  ];
  // choose pair with highest magnitude
  let best = { x:0, y:0, m:0 };
  for (const p of pairs) {
    const x = p.x || 0, y = p.y || 0;
    const m = Math.abs(x) + Math.abs(y);
    if (m > best.m) best = { x, y, m };
  }
  return { x: best.x, y: best.y };
}

function buttonPressed(gp, idx) {
  const b = gp?.buttons?.[idx];
  return !!(b && (b.pressed || b.value > 0.75));
}

function collectTeleTargets(sceneEl) {
  const targets = [];
  sceneEl.object3D.traverse((o) => {
    const el = o.el;
    if (el?.classList?.contains("teleTarget") && o.isMesh) targets.push(o);
  });
  return targets;
}

export function installXRInput({ scene, rig, camera, leftHand, rightHand, diag }) {
  const dead = 0.18;
  const speed = 0.10;
  let enabledMove = true;
  let enabledTele = true;

  const btnMove = document.getElementById("btnMove");
  const btnTeleport = document.getElementById("btnTeleport");
  const setMoveBtn = () => btnMove && (btnMove.textContent = `Move: ${enabledMove ? "ON" : "OFF"}`);
  const setTeleBtn = () => btnTeleport && (btnTeleport.textContent = `Teleport: ${enabledTele ? "ON" : "OFF"}`);
  setMoveBtn(); setTeleBtn();

  btnMove?.addEventListener("click", () => { enabledMove = !enabledMove; setMoveBtn(); diag.write(`[move] ${enabledMove?"ON":"OFF"}`); });
  btnTeleport?.addEventListener("click", () => { enabledTele = !enabledTele; setTeleBtn(); diag.write(`[teleport] ${enabledTele?"ON":"OFF"}`); });

  const raycaster = new THREE.Raycaster();
  const origin = V3(), dir = V3();
  let teleTargets = [];
  let lastTrig = false;

  const refreshTargets = () => { teleTargets = collectTeleTargets(scene); };

  // refresh targets after scene loads
  setTimeout(refreshTargets, 500);
  scene.addEventListener("loaded", refreshTargets);
  scene.addEventListener("enter-vr", () => { refreshTargets(); diag.write("[xr] enter-vr: input poll active ✅"); });

  const forwardDir = V3();
  const rightDir = V3();
  const up = V3(0,1,0);

  function getForwardOnXZ() {
    camera.object3D.getWorldDirection(forwardDir);
    forwardDir.y = 0;
    if (forwardDir.lengthSq() < 1e-6) forwardDir.set(0,0,-1);
    forwardDir.normalize();
    rightDir.copy(forwardDir).cross(up).normalize().negate();
    return { f: forwardDir, r: rightDir };
  }

  function teleportToObject(obj) {
    // obj is a THREE.Mesh of the ring; use its world position
    const wp = V3();
    obj.getWorldPosition(wp);
    rig.object3D.position.set(wp.x, 0, wp.z);
    diag.write(`[teleport] -> x=${wp.x.toFixed(2)} z=${wp.z.toFixed(2)}`);
  }

  function doTeleportIfHit() {
    const hand = rightHand?.object3D ? rightHand : leftHand;
    if (!hand?.object3D) return;

    hand.object3D.getWorldPosition(origin);
    // controller forward is -Z in local space
    dir.set(0,0,-1).applyQuaternion(hand.object3D.getWorldQuaternion(new THREE.Quaternion())).normalize();

    raycaster.set(origin, dir);
    raycaster.far = 30;
    const hits = raycaster.intersectObjects(teleTargets, true);
    if (hits && hits.length) {
      teleportToObject(hits[0].object);
    }
  }

  let raf = 0;
  const tick = () => {
    try {
      // only run this in VR (Quest)
      const inVR = scene.is("vr-mode") || scene.is("ar-mode");
      if (inVR) {
        const gp = pickBestGamepad();
        if (gp) {
          const stick = getStick(gp);
          const x = stick.x, y = stick.y;

          if (enabledMove && (Math.abs(x) > dead || Math.abs(y) > dead)) {
            // invert y: up on stick should be forward
            const strafe = x;
            const forward = -y;

            const { f, r } = getForwardOnXZ();
            const vx = (r.x * strafe + f.x * forward) * speed;
            const vz = (r.z * strafe + f.z * forward) * speed;

            const p = rig.object3D.position;
            rig.object3D.position.set(p.x + vx, p.y, p.z + vz);
          }

          // trigger buttons: commonly 0 or 1 depending on mapping; poll a few
          const trig = buttonPressed(gp, 0) || buttonPressed(gp, 1) || buttonPressed(gp, 4) || buttonPressed(gp, 5);
          if (enabledTele && trig && !lastTrig) {
            doTeleportIfHit();
          }
          lastTrig = trig;
        }
      }
    } catch (_) {}
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  diag.write("[xr-input] installed ✅ (poll gamepads + manual raycast teleport)");
  return { destroy(){ cancelAnimationFrame(raf); } };
}
