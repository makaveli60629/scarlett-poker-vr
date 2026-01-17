import * as THREE from "three";

async function safeImport(rel, log) {
  try { return await import(rel); }
  catch (e) { log?.(`[teleport] safeImport fail ${rel}: ${e.message}`); return null; }
}
function isFn(v){ return typeof v === "function"; }
function isObj(v){ return v && typeof v === "object"; }

function listCallable(mod) {
  const out=[];
  if (!mod) return out;
  for (const [k,v] of Object.entries(mod)) {
    if (isFn(v)) out.push({ path:k, fn:v });
    if (isObj(v)) for (const [k2,v2] of Object.entries(v)) if (isFn(v2)) out.push({ path:`${k}.${k2}`, fn:v2 });
  }
  return out;
}
function score(path) {
  const n=path.toLowerCase();
  let s=0;
  if (n.includes("teleport")) s+=4;
  if (n.includes("locomotion")) s+=4;
  if (n.includes("xr")) s+=2;
  if (n.includes("init") || n.includes("setup") || n.includes("start")) s+=2;
  return s;
}
function pickBest(mod, prefer=[]) {
  if (!mod) return null;
  for (const p of prefer) {
    const parts = p.split(".");
    let cur = mod;
    for (const part of parts) cur = cur?.[part];
    if (isFn(cur)) return { path:p, fn:cur };
  }
  const f=listCallable(mod);
  if (f.length===0) return null;
  if (f.length===1) return f[0];
  f.sort((a,b)=>score(b.path)-score(a.path));
  return f[0];
}

export async function setupTeleport(ctx) {
  const { scene, rig, renderer, log, controls } = ctx;

  const xrl  = await safeImport("./xr_locomotion.js", log);
  const vrl  = await safeImport("./vr_locomotion.js", log);
  const loc  = await safeImport("./locomotion.js", log);
  const fx   = await safeImport("./teleport_fx.js", log);
  const mcn  = await safeImport("./teleport_machine.js", log);
  const fire = await safeImport("./fire_teleport_system.js", log);
  const hand = await safeImport("./hand_teleport.js", log); // we also ship a safe stub in this zip

  const primary = [
    pickBest(xrl, ["XRLoco.initXRTeleport","initXRTeleport","setupXRTeleport","init","setup","start"]),
    pickBest(vrl, ["VRLoco.initVRLocomotion","initVRLocomotion","setupVRLocomotion","init","setup","start"]),
    pickBest(loc, ["Locomotion.initLocomotion","initLocomotion","setupLocomotion","init","setup","start"]),
  ].filter(Boolean);

  for (const fn of primary) {
    try {
      log(`[teleport] ▶ ${fn.path}()`);
      const out = await fn.fn(ctx);
      log(`[teleport] ✅ ${fn.path}()`);

      // Optional extras (won't kill anything if missing)
      for (const extra of [
        pickBest(fx, ["TeleportFX.init","init","setup","start"]),
        pickBest(mcn, ["TeleportMachine.init","init","setup","start"]),
        pickBest(fire, ["FireTeleport.init","init","setup","start"]),
        pickBest(hand, ["HandTeleport.init","init","setup","start"]),
      ].filter(Boolean)) {
        try { log(`[teleport] ▶ ${extra.path}()`); await extra.fn(ctx); log(`[teleport] ✅ ${extra.path}()`); }
        catch (e) { log(`[teleport] ⚠️ ${extra.path} failed: ${e.message}`); }
      }

      return { tick: out?.tick };
    } catch (e) {
      log(`[teleport] ❌ ${fn.path} failed: ${e.message}`);
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
