// /js/modules/_registry.js — Scarlett Module Loader (FULL)
// BUILD: MODULE_REGISTRY_FULL_v1
//
// Goals:
// - Central list of modules (enable/disable without touching spine)
// - Safe dynamic import per-module (failures do NOT crash the world)
// - Auto-register status into world.registry for the diag panel
//
// Module convention:
//   Each module should export:  export async function init(ctx) { ... }
//   (or export default async function(ctx) { ... })
//
// ctx includes:
//   THREE, scene, renderer, player, registry, hooks, worldApi

export const MODULE_BUILD = "MODULE_REGISTRY_FULL_v1";

// ✅ Fill this list when you paste your module filenames.
// You can keep enabled:false until you confirm each module is safe.
export const MODULES = [
  // { id: "EXAMPLE", file: "example.js", enabled: false, desc: "Example module" },
];

function addReg(registry, id, desc, status = "ok", extra = "") {
  try {
    registry?.add?.(id, desc, status, extra);
  } catch {
    // never let registry failure crash loader
  }
}

export async function loadModules(ctx) {
  const { registry } = ctx;

  addReg(registry, "MODULE_LOADER", "Module loader online", "ok", `count=${MODULES.length}`);

  const results = [];

  for (const m of MODULES) {
    if (!m?.id || !m?.file) continue;

    const desc = m.desc || m.file;

    if (!m.enabled) {
      addReg(registry, m.id, `DISABLED — ${desc}`, "warn");
      results.push({ id: m.id, ok: true, disabled: true });
      continue;
    }

    try {
      addReg(registry, m.id, `loading — ${desc}`, "ok");

      // Cache-bust to avoid GitHub Pages stale modules
      const mod = await import(`./${m.file}?v=${Date.now()}`);

      const init = mod.init || mod.default;
      if (typeof init !== "function") {
        addReg(registry, m.id, `no init() export — ${desc}`, "warn");
        results.push({ id: m.id, ok: true, warn: "no init()" });
        continue;
      }

      const api = await init(ctx);

      addReg(registry, m.id, `ready — ${desc}`, "ok");
      results.push({ id: m.id, ok: true, api });
    } catch (e) {
      const msg = e?.stack || e?.message || String(e);
      addReg(registry, m.id, `FAILED — ${desc}`, "fail", msg);
      results.push({ id: m.id, ok: false, error: msg });

      // IMPORTANT: do NOT throw. We want world + diag to stay alive.
      console.error(`[module:${m.id}]`, e);
    }
  }

  return results;
}
