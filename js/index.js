// /js/index.js — Scarlett INDEX (MODULAR) v3 FULL (Android sticks + XR)
import { createLogger } from "../core/logger.js";
import { initThree } from "../core/three_boot.js";
import { installControls, updateControls } from "../core/controls.js";

const BUILD = `INDEX_MODULAR_${Date.now()}`;
const log = createLogger({ maxLines: 120 });

log(`[index] runtime start ✅ build=${BUILD}`);
log(`[env] href=${location.href}`);
log(`[env] secureContext=${String(window.isSecureContext)}`);
log(`[env] ua=${navigator.userAgent}`);
log(`[env] navigator.xr=${String(!!navigator.xr)}`);

document.getElementById("hudBtn")?.addEventListener("click", () => log.copy());

async function loadVRButton() {
  const ver = "0.164.1";
  try {
    const m = await import(`./VRButton.js?v=${Date.now()}`);
    return m.VRButton || m.default || m;
  } catch (e) {
    const m = await import(`https://unpkg.com/three@${ver}/examples/jsm/webxr/VRButton.js`);
    return m.VRButton;
  }
}

async function loadWorld() {
  try {
    const mod = await import(`./world.js?v=${Date.now()}`);
    if (!mod?.World?.init) throw new Error("World missing World.init()");
    return mod.World;
  } catch (e) {
    log(`[index] world import failed ❌ ${e?.message || e}`);
    return null;
  }
}

function buildFallbackWorld(ctx) {
  const { THREE, scene } = ctx;
  const g = new THREE.Group();
  scene.add(g);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(30, 96),
    new THREE.MeshStandardMaterial({ color: 0x111326, roughness: 1, metalness: 0.05 })
  );
  floor.rotation.x = -Math.PI / 2;
  g.add(floor);

  ctx.worldState.colliders = [floor];
  log("[index] fallback world added ✅");
}

(async function boot() {
  try {
    const base = await initThree({ log });
    const ctx = {
      ...base,
      log,
      BUILD,
      world: null,
      worldState: { colliders: [] },
    };

    const VRButton = await loadVRButton();
    document.body.appendChild(VRButton.createButton(ctx.renderer));
    log("[index] VRButton appended ✅");

    installControls(ctx);

    log("[index] calling world.init() …");
    const world = await loadWorld();
    ctx.world = world;

    if (world) {
      await world.init({
        THREE: ctx.THREE,
        scene: ctx.scene,
        renderer: ctx.renderer,
        camera: ctx.camera,
        player: ctx.player,
        controllers: ctx.controllers,
        log: (m) => log(m),
        BUILD,
      });

      if (Array.isArray(world.colliders)) ctx.worldState.colliders = world.colliders;
      else if (typeof world.colliders === "function") ctx.worldState.colliders = world.colliders();
      else ctx.worldState.colliders = world.colliders || [];

      log("[index] world init ✅");
    } else {
      buildFallbackWorld(ctx);
    }

    const clock = new ctx.THREE.Clock();
    ctx.renderer.setAnimationLoop(() => {
      const dt = clock.getDelta();
      updateControls(ctx, dt);

      try { ctx.world?.update?.(dt); }
      catch (e) { log("[world] update error ❌ " + (e?.message || e)); }

      ctx.renderer.render(ctx.scene, ctx.camera);
    });

  } catch (e) {
    log("[index] fatal boot error ❌ " + (e?.message || e));
  }
})();
