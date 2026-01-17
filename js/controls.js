import * as THREE from "three";

async function safeImport(rel, log) {
  try { return await import(rel); }
  catch (e) { log?.(`[controls] safeImport fail ${rel}: ${e.message}`); return null; }
}
function pickFn(mod, names) {
  for (const n of names) {
    const fn = mod?.[n];
    if (typeof fn === "function") return { name: n, fn };
  }
  return null;
}

export async function setupControls(ctx) {
  const { scene, renderer, log } = ctx;

  // Try your higher-level input hub first
  const xri = await safeImport("./xr_input.js", log);
  const hub = await safeImport("./input_hub.js", log);

  const hubFn = pickFn(hub, ["initInputHub","init","setup","start"]);
  if (hubFn) {
    try {
      log(`[controls] ▶ input_hub.${hubFn.name}()`);
      const out = await hubFn.fn(ctx);
      log(`[controls] ✅ input_hub.${hubFn.name}()`);
      // Provide a minimal tick wrapper if hub returns one
      return { controllers: out?.controllers, tick: out?.tick };
    } catch (e) {
      log(`[controls] ❌ input_hub failed: ${e.message}`);
    }
  }

  const xriFn = pickFn(xri, ["setupXRInput","initXRInput","init","setup"]);
  if (xriFn) {
    try {
      log(`[controls] ▶ xr_input.${xriFn.name}()`);
      const out = await xriFn.fn(ctx);
      log(`[controls] ✅ xr_input.${xriFn.name}()`);
      return { controllers: out?.controllers, tick: out?.tick };
    } catch (e) {
      log(`[controls] ❌ xr_input failed: ${e.message}`);
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
