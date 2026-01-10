export const RoomBridge = {
  init(ctx, { AndroidControls }) {
    const log = ctx.log || console.log;

    ctx.getFloorY = () => 0;
    ctx.getBounds = () => ctx.world?.bounds || null;

    ctx.teleport = (spawnName) => {
      const sp = ctx.world?.spawns?.[spawnName] || ctx.world?.spawns?.map?.[spawnName] || null;
      if (!sp) { log(`[bridge] ⚠️ spawn not found: ${spawnName}`); return; }

      if (ctx.Controls?.teleportToSpawn) {
        ctx.Controls.teleportToSpawn(spawnName);
        return;
      }

      if (AndroidControls?.enabled) {
        AndroidControls.teleportTo({ x: sp.x, y: sp.y, z: sp.z });
        ctx.player.rotation.y = sp.yaw || 0;
        return;
      }

      ctx.player.position.set(sp.x, 0, sp.z);
      ctx.player.rotation.y = sp.yaw || 0;
    };

    ctx.setRoom = (name) => {
      log(`[bridge] setRoom(${name})`);

      try { ctx.ScorpionRoom?.setActive?.(name === "scorpion"); } catch {}

      const spawnName =
        name === "scorpion" ? "scorpion_safe_spawn" :
        name === "store" ? "store_spawn" :
        name === "spectator" ? "spectator" :
        "lobby_spawn";

      ctx.teleport(spawnName);
      setTimeout(() => ctx.teleport(spawnName), 250);
    };

    window.addEventListener("scarlett-room", (e) => {
      const name = e?.detail?.name;
      if (name) ctx.setRoom(name);
    });

    window.__scarlett = window.__scarlett || {};
    window.__scarlett.setRoom = ctx.setRoom;

    setTimeout(() => ctx.setRoom("lobby"), 0);
    setTimeout(() => ctx.setRoom("lobby"), 600);

    log("[bridge] init ✅ (boot lobby hard)");
  }
};
