import * as THREE from "three";

async function safeImport(rel, log) {
  try { return await import(rel); }
  catch (e) { log?.(`[controls] safeImport fail ${rel}: ${e.message}`); return null; }
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
  if (n.includes("input")) s+=4;
  if (n.includes("hub")) s+=3;
  if (n.includes("xr")) s+=2;
  if (n.includes("setup")) s+=2;
  if (n.includes("init")) s+=2;
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

export async function setupControls(ctx) {
  const { scene, renderer, log } = ctx;

  const hub = await safeImport("./input_hub.js", log);
  const xri = await safeImport("./xr_input.js", log);
  const inp = await safeImport("./input.js", log);

  const hubFn = pickBest(hub, ["InputHub.init","initInputHub","init","setup","start"]);
  if (hubFn) {
    try {
      log(`[controls] ▶ ${hubFn.path}()`);
      const out = await hubFn.fn(ctx);
      log(`[controls] ✅ ${hubFn.path}()`);
      return { controllers: out?.controllers, tick: out?.tick };
    } catch (e) {
      log(`[controls] ❌ ${hubFn.path} failed: ${e.message}`);
    }
  }

  const xriFn = pickBest(xri, ["XRInput.setup","setupXRInput","initXRInput","init","setup"]);
  if (xriFn) {
    try {
      log(`[controls] ▶ ${xriFn.path}()`);
      const out = await xriFn.fn(ctx);
      log(`[controls] ✅ ${xriFn.path}()`);
      return { controllers: out?.controllers, tick: out?.tick };
    } catch (e) {
      log(`[controls] ❌ ${xriFn.path} failed: ${e.message}`);
    }
  }

  const inpFn = pickBest(inp, ["Input.init","initInput","setupInput","init","setup"]);
  if (inpFn) {
    try {
      log(`[controls] ▶ ${inpFn.path}()`);
      const out = await inpFn.fn(ctx);
      log(`[controls] ✅ ${inpFn.path}()`);
      return { controllers: out?.controllers, tick: out?.tick };
    } catch (e) {
      log(`[controls] ❌ ${inpFn.path} failed: ${e.message}`);
    }
  }

  // Fallback: raw controllers + rays + button diagnostics
  const ctrls = [], last = [{}, {}];
  const makeRay = () => {
    const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]);
    const l = new THREE.Line(g, new THREE.LineBasicMaterial());
    l.scale.z = 6;
    return l;
  };

  for (let i = 0; i < 2; i++) {
    const c = renderer.xr.getController(i);
    scene.add(c);
    ctrls.push(c);
    c.add(makeRay());
    c.addEventListener("connected", (e) => {
      c.userData.gamepad = e.data.gamepad || null;
      log(`🎮 pad${i} connected`);
    });
  }

  function tick() {
    for (let i = 0; i < ctrls.length; i++) {
      const gp = ctrls[i].userData.gamepad;
      if (!gp?.buttons) continue;
      for (let b = 0; b < gp.buttons.length; b++) {
        const p = !!gp.buttons[b].pressed;
        if (last[i][b] !== p) {
          last[i][b] = p;
          log(`🧪 pad${i} b${b}=${p ? "DOWN" : "UP"}`);
        }
      }
    }
  }

  log("[controls] fallback ready ✓ (controllers + rays)");
  return { controllers: ctrls, tick };
}
