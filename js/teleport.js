import * as THREE from "three";

async function safeImport(rel, log) {
  try { return await import(rel); }
  catch (e) { log?.(`[teleport] safeImport fail ${rel}: ${e.message}`); return null; }
}
function pickFn(mod, names) {
  for (const n of names) {
    const fn = mod?.[n];
    if (typeof fn === "function") return { name: n, fn };
  }
  return null;
}

export async function setupTeleport(ctx) {
  const { scene, rig, renderer, log, controls } = ctx;

  // Try your locomotion stack first
  const xrl = await safeImport("./xr_locomotion.js", log);
  const vrl = await safeImport("./vr_locomotion.js", log);
  const loc = await safeImport("./locomotion.js", log);
  const fx  = await safeImport("./teleport_fx.js", log);
  const mcn = await safeImport("./teleport_machine.js", log);
  const fire = await safeImport("./fire_teleport_system.js", log);
  const hand = await safeImport("./hand_teleport.js", log);

  const candidates = [
    { mod: xrl, label: "xr_locomotion", names: ["initXRTeleport","setupXRTeleport","init","setup","start"] },
    { mod: vrl, label: "vr_locomotion", names: ["initVRLocomotion","setupVRLocomotion","init","setup","start"] },
    { mod: loc, label: "locomotion", names: ["initLocomotion","setupLocomotion","init","setup","start"] },
  ];

  for (const c of candidates) {
    const fn = pickFn(c.mod, c.names);
    if (!fn) continue;
    try {
      log(`[teleport] ▶ ${c.label}.${fn.name}()`);
      const out = await fn.fn(ctx);
      log(`[teleport] ✅ ${c.label}.${fn.name}()`);
      // Let these optional systems attach if they expose init/setup
      for (const extra of [
        { mod: fx, label: "teleport_fx", names: ["init","setup","start"] },
        { mod: mcn, label: "teleport_machine", names: ["init","setup","start"] },
        { mod: fire, label: "fire_teleport_system", names: ["init","setup","start"] },
        { mod: hand, label: "hand_teleport", names: ["init","setup","start"] },
      ]) {
        const ex = pickFn(extra.mod, extra.names);
        if (!ex) continue;
        try { log(`[teleport] ▶ ${extra.label}.${ex.name}()`); await ex.fn(ctx); log(`[teleport] ✅ ${extra.label}.${ex.name}()`); }
        catch (e) { log(`[teleport] ⚠️ ${extra.label} failed: ${e.message}`); }
      }
      return { tick: out?.tick };
    } catch (e) {
      log(`[teleport] ❌ ${c.label} failed: ${e.message}`);
    }
  }

  // Fallback simple teleport (right selectend)
  const rc = new THREE.Raycaster(), m = new THREE.Matrix4(), d = new THREE.Vector3(), p = new THREE.Vector3();
  const ret = new THREE.Mesh(
    new THREE.RingGeometry(0.18, 0.24, 32),
    new THREE.MeshStandardMaterial({ color: 0x00ff66 })
  );
  ret.rotation.x = -Math.PI / 2;
  ret.visible = false;
  scene.add(ret);

  const floors = () => scene.children.filter(o => o.userData?.isFloor);
  const right = controls?.controllers?.[1] || renderer.xr.getController(1);

  const cast = () => {
    m.identity().extractRotation(right.matrixWorld);
    d.set(0, 0, -1).applyMatrix4(m).normalize();
    right.getWorldPosition(p);
    rc.set(p, d);
    return rc.intersectObjects(floors(), true)[0] || null;
  };

  right.addEventListener("selectend", () => {
    const h = cast();
    if (h) {
      rig.position.set(h.point.x, 0, h.point.z);
      log("✅ teleport (fallback)");
    }
  });

  function tick() {
    const h = cast();
    if (h) { ret.position.copy(h.point); ret.visible = true; }
    else ret.visible = false;
  }

  log("[teleport] fallback ready ✓");
  return { tick };
}
