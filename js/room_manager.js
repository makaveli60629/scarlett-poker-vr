// /js/room_manager.js — RoomManager v7.6 (HARD BOOT LOBBY + CORRECT SPAWNS)
//
// Fixes:
// ✅ ALWAYS passes ctx.player into ctx.spawns.apply()
// ✅ Applies standY for NON-XR; lets Controls fix XR height (player.y=0 while presenting)
// ✅ Guarantees scorpion hidden unless explicitly selected
// ✅ Adds safe "force lobby" retries to beat late transforms / UI auto-room

export const RoomManager = {
  init(ctx) {
    ctx.rooms = ctx.rooms || {};
    ctx.rooms.current = "lobby";

    const log = (...a) => (ctx.log ? ctx.log(...a) : console.log(...a));

    function isXRPresenting() {
      try { return !!ctx.renderer?.xr?.isPresenting; } catch { return false; }
    }

    function applySpawn(spawnName, opts = {}) {
      if (!ctx.spawns?.apply) return false;

      // IMPORTANT: pass the rig
      const rig = ctx.player;

      // In XR local-floor, rig.y should stay 0 (Controls v3.9 enforces this too)
      const finalOpts = { ...(opts || {}) };
      if (isXRPresenting()) {
        // don’t stack height in XR
        delete finalOpts.standY;
      }

      const ok = ctx.spawns.apply(spawnName, rig, finalOpts);

      // HARD: ensure rig y sane in XR
      if (isXRPresenting() && rig) rig.position.y = 0;

      return ok;
    }

    const setRoom = (name) => {
      ctx.rooms.current = name;
      log(`[rm] room=${name}`);

      // Toggle scorpion visibility
      if (ctx.ScorpionRoom?.setActive) ctx.ScorpionRoom.setActive(name === "scorpion");
      else if (ctx.systems?.scorpion?.setActive) ctx.systems.scorpion.setActive(name === "scorpion");

      // choose spawn
      const spawnName =
        name === "scorpion"   ? "scorpion_safe_spawn" :
        name === "store"      ? "store_spawn" :
        name === "spectator"  ? "spectator" :
                                "lobby_spawn";

      // standing defaults (non seated)
      const standY =
        spawnName === "spectator" ? 1.65 :
        spawnName === "store_spawn" ? 1.65 :
        spawnName === "lobby_spawn" ? 1.65 :
        // scorpion_safe_spawn is still standing unless you call Controls.sitAt(...)
        1.65;

      applySpawn(spawnName, { standY });

      // re-apply after a tick to beat late transforms (chairs/table patching)
      setTimeout(() => applySpawn(spawnName, { standY }), 180);
      setTimeout(() => applySpawn(spawnName, { standY }), 520);
    };

    ctx.rooms.setRoom = setRoom;

    // ✅ ALWAYS boot lobby (HARD)
    setRoom("lobby");

    // ✅ FORCE lobby again after UI builds (if UI tries to auto-enter scorpion)
    setTimeout(() => setRoom("lobby"), 600);
    setTimeout(() => setRoom("lobby"), 1200);

    log("[rm] init ✅ v7.6");
    return ctx.rooms;
  }
};
