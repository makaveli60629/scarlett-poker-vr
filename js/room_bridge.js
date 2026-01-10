export const RoomBridge = {
  init(ctx, { AndroidControls }) {
    const log = ctx.log || console.log;

    // Floor helper (mobile clamp uses this)
    ctx.getFloorY = () => 0;

    // Bounds helper (optional)
    ctx.getBounds = () => ctx.world?.bounds || null;

    // Unified teleport: use Controls if present, else AndroidControls
    ctx.teleport = (spawnName) => {
      const sp = ctx.world?.spawns?.[spawnName] || ctx.world?.spawns?.map?.[spawnName] || null;
      if (!sp) { log(`[bridge] ⚠️ spawn not found: ${spawnName}`); return; }

      // Prefer VR Controls if available
      if (ctx.Controls?.teleportToSpawn) {
        ctx.Controls.teleportToSpawn(spawnName);
        return;
      }

      // Mobile fallback
      if (AndroidControls?.enabled) {
        AndroidControls.teleportTo({ x: sp.x, y: sp.y, z: sp.z });
        // apply yaw
        ctx.player.rotation.y = sp.yaw || 0;
        return;
      }

      // Last resort: direct move
      ctx.player.position.set(sp.x, 0, sp.z);
      ctx.player.rotation.y = sp.yaw || 0;
    };

    // Room set: ALWAYS boot lobby
    ctx.setRoom = (name) => {
      log(`[bridge] setRoom(${name})`);

      // show/hide scorpion room
      try {
        ctx.ScorpionRoom?.setActive?.(name === "scorpion");
      } catch {}

      const spawnName =
        name === "scorpion" ? "scorpion_safe_spawn" :
        name === "store" ? "store_spawn" :
        name === "spectator" ? "spectator" :
        "lobby_spawn";

      ctx.teleport(spawnName);

      // reapply after a tick (beats late transforms)
      setTimeout(() => ctx.teleport(spawnName), 250);
    };

    // Listen to UI events if they exist
    window.addEventListener("scarlett-room", (e) => {
      const name = e?.detail?.name;
      if (name) ctx.setRoom(name);
    });

    // Convenience: expose in window for manual testing
    window.__scarlett = window.__scarlett || {};
    window.__scarlett.setRoom = ctx.setRoom;

    // HARD BOOT LOBBY
    setTimeout(() => ctx.setRoom("lobby"), 0);
    setTimeout(() => ctx.setRoom("lobby"), 600);

    log("[bridge] init ✅ (boot lobby hard)");
  }
};
