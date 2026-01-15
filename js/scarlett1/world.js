// /js/scarlett1/world.js — Scarlett Modular World ENTRY v1.0
// ✅ Small entry file. All heavy logic lives in /world_parts/*

import { VRButton } from "../VRButton.js";

import { makeContext, makeCore } from "./world_parts/layout.js";
import { buildPitAndTable } from "./world_parts/pit_table.js";
import { buildStore } from "./world_parts/store.js";
import { makeBotsSystem } from "./world_parts/bots.js";
import { makeHoverCards } from "./world_parts/fx_cards.js";
import { installXRControls } from "./world_parts/xr_controls.js";

export async function initWorld({ THREE, log }) {
  log = log || console.log;

  // ---------- CORE / CONTEXT ----------
  const ctx = makeContext({ THREE, log });
  const core = makeCore(ctx);
  const { renderer, scene, camera, player, cameraPitch, mats, cfg } = core;

  // ---------- BUILD WORLD ----------
  // Layout (lobby, 4 rooms, halls, ceilings, signs, spawns)
  const layout = core.buildLayout();

  // Center pit + table + chairs + rails
  const pit = buildPitAndTable(ctx, core);

  // Store room features (balcony, stairs, telepad, mannequins)
  const store = buildStore(ctx, core, layout);

  // Hover cards (optional “life”)
  const cards = makeHoverCards(ctx, core);

  // Bots (walking)
  const bots = makeBotsSystem(ctx, core);

  // ---------- VR BUTTON ----------
  try {
    document.body.appendChild(VRButton.createButton(renderer));
    log("VRButton ready ✅");
  } catch (e) {
    log("VRButton failed:", e?.message || e);
  }

  // ---------- XR Controls (Quest controllers + hands + sticks + teleport visuals) ----------
  installXRControls(ctx, core, { store });

  // ---------- LOOP ----------
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(0.05, clock.getDelta());
    const t = performance.now() * 0.001;

    bots.update(dt, t);
    cards.update(dt, t);

    renderer.render(scene, camera);
  });

  log("render loop start ✅");
  log("initWorld() completed ✅");

  return { renderer, scene, camera, player, cameraPitch };
}
