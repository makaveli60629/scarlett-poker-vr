// /js/hub_loader.js — Safely load optional modules (won’t break boot)

export async function loadOptionalModules({ hubOK, hubWarn, hubFail, context }) {
  const modules = [
    "./poker_simulation.js",
    "./poker.js",
    "./hands.js",
    "./cards.js",
    "./dealer_blinds.js",
    "./pot.js",

    "./tournament.js",
    "./avatar_basic.js",
    "./boss_bots.js",
    "./bots.js",

    "./table.js",
    "./chair.js",
    "./water_fountain.js",
    "./spectator_rail.js",
    "./solid_walls.js",

    "./teleport_machine.js",
    "./store.js",
    "./store_kiosk.js",

    "./shop_catalog.js",
    "./shop_ui.js",
    "./vr_ui_panel.js",
    "./watch_ui.js",

    "./notify.js",
    "./leaderboard.js",
    "./state.js",
    "./state_v62.js",
    "./room_manager.js",
    "./inventory.js",
    "./interactions.js",
    "./textures.js",
    "./collision.js",

    "./core_bridge.js",
    "./crown.js",
    "./crown_system.js",
    "./event_chips.js",
    "./furniture_pack.js",

    "./avatar_shop.js",
    "./boss_table.js",
    "./input.js",
  ];

  for (const path of modules) {
    try {
      const mod = await import(path);
      hubOK(`Loaded ${path.split("./")[1]}`);

      if (typeof mod.init === "function") {
        try {
          await mod.init(context);
          hubOK(`init() OK — ${path.split("./")[1]}`);
        } catch (e) {
          hubWarn(`init() failed — ${path.split("./")[1]} :: ${e?.message || e}`);
        }
      } else {
        hubWarn(`No init() export — ${path.split("./")[1]}`);
      }
    } catch (e) {
      hubWarn(`Skipped ${path.split("./")[1]} :: ${e?.message || e}`);
    }
  }
}
