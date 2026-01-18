// WORLD ORCHESTRA — SINGLE SOURCE OF TRUTH

export async function startWorldOrchestra() {
  console.log("🎼 World Orchestra starting…");

  // Diagnostics
  await import("./diagnostics.js").catch(()=>{});

  // Input & Movement
  await import("./controls.js").catch(()=>{});
  await import("./locomotion.js").catch(()=>{});
  await import("./android_controls.js").catch(()=>{});

  // XR & Hands
  await import("./hands.js").catch(()=>{});
  await import("./gesture_engine.js").catch(()=>{});

  // World
  await import("./world.js").catch(()=>{});
  await import("./lighting.js").catch(()=>{});
  await import("./solid_walls.js").catch(()=>{});
  await import("./lobby_decor.js").catch(()=>{});

  // Poker
  await import("./table_factory.js").catch(()=>{});
  await import("./poker_system.js").catch(()=>{});
  await import("./cards.js").catch(()=>{});
  await import("./chips.js").catch(()=>{});

  // Bots & Avatars
  await import("./bots.js").catch(()=>{});
  await import("./humanoid_factory.js").catch(()=>{});
  await import("./avatar_system.js").catch(()=>{});

  // Teleport LAST
  await import("./teleport_machine.js").catch(()=>{});

  console.log("✅ World Orchestra READY");
}
