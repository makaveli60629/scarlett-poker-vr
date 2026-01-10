// /js/room_manager.js — Room Manager v4 (SAFE SPAWNS)
// Ensures you never spawn on table/colliders when entering rooms.

export const RoomManager = {
  init(ctx) {
    ctx.room = "lobby";
    ctx.mode = "lobby";
    ctx.log?.("[rm] lobby");
    this._wireTeleports(ctx);
    ctx.log?.("[rm] init ✅");
  },

  setRoom(ctx, room) {
    ctx.room = room;
    ctx.mode = room;

    ctx.log?.(`[rm] room=${room}`);

    // behaviors
    if (room === "lobby") {
      ctx.systems?.scorpion?.setActive?.(false);
      ctx.systems?.store?.setActive?.(true);
      ctx.PokerSim?.setMode?.("lobby_demo");

      // safe lobby spawn
      ctx.spawns?.apply?.("lobby_spawn", ctx.player, { standY: 1.65 });
    }

    if (room === "store") {
      ctx.systems?.scorpion?.setActive?.(false);
      ctx.systems?.store?.setActive?.(true);
      ctx.PokerSim?.setMode?.("lobby_demo");

      ctx.spawns?.apply?.("store_spawn", ctx.player, { standY: 1.65 });
    }

    if (room === "spectate") {
      ctx.systems?.scorpion?.setActive?.(false);
      ctx.PokerSim?.setMode?.("lobby_demo");

      ctx.spawns?.apply?.("spectator", ctx.player, { standY: 1.65 });
    }

    // ✅ NEW: scorpion room safe spawn (in front of the teleport machine / entry area)
    if (room === "scorpion") {
      ctx.systems?.store?.setActive?.(false);
      ctx.systems?.scorpion?.setActive?.(true);

      // IMPORTANT: do NOT spawn at scorpion_seat_1 here
      // That’s how you end up on/inside the table.
      ctx.spawns?.apply?.("scorpion_safe_spawn", ctx.player, { standY: 1.65 });

      // If you want auto-seat later, do it AFTER 1-2 seconds when collision settles.
      // ctx.PokerSim?.setMode?.("scorpion_autoseat");
    }
  },

  // Basic teleporter / pad wiring (adapt to your TeleportMachine events)
  _wireTeleports(ctx) {
    // If your teleport machine emits events, hook them here.
    // This is defensive: it won’t break if the event system changes.
    window.addEventListener("scarlett-room", (e) => {
      const room = e?.detail?.room;
      if (!room) return;
      this.setRoom(ctx, room);
    });

    // If your TeleportMachine sets ctx.teleportMachine and calls callbacks:
    if (ctx.teleportMachine?.onRoom) {
      ctx.teleportMachine.onRoom((room) => this.setRoom(ctx, room));
    }
  },
};
