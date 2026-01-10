// /js/room_manager.js — Room Manager v4 (FULL)
// Controls: start lobby, teleport to store / scorpion room, auto-seat on scorpion entry.

export const RoomManager = {
  init(ctx) {
    ctx.room = "lobby";
    ctx.mode = "lobby";
    ctx.log?.("[rm] init → lobby");

    // Register teleport pads (world will create them and pass refs)
    ctx.teleports = ctx.teleports || {};

    this._wireTeleports(ctx);
    this._applyRoomBehaviors(ctx, "lobby");

    ctx.log?.("[rm] init ✅");
  },

  setRoom(ctx, room) {
    if (!room || ctx.room === room) return;
    ctx.room = room;
    ctx.mode = room;
    ctx.log?.(`[rm] setRoom → ${room}`);

    this._applyRoomBehaviors(ctx, room);

    // Move / seat player
    if (room === "lobby") {
      ctx.world?.movePlayerTo?.("lobby_spawn");
      ctx.world?.setSeated?.(false);
    }

    if (room === "store") {
      ctx.world?.movePlayerTo?.("store_spawn");
      ctx.world?.setSeated?.(false);
    }

    if (room === "scorpion") {
      // Seat player at seat 0 in scorpion room
      ctx.world?.movePlayerTo?.("scorpion_entry");
      ctx.world?.seatPlayer?.(0);
    }
  },

  _applyRoomBehaviors(ctx, room) {
    // Systems toggles (safe optional)
    if (room === "lobby") {
      ctx.systems?.store?.setActive?.(true);
      ctx.systems?.scorpion?.setActive?.(false);
      ctx.PokerSim?.setMode?.("lobby_demo");
    }

    if (room === "store") {
      ctx.systems?.store?.setActive?.(true);
      ctx.systems?.scorpion?.setActive?.(false);
      ctx.PokerSim?.setMode?.("lobby_demo");
    }

    if (room === "scorpion") {
      ctx.systems?.store?.setActive?.(false);
      ctx.systems?.scorpion?.setActive?.(true);
      ctx.PokerSim?.setMode?.("scorpion_table");
    }
  },

  _wireTeleports(ctx) {
    // Called once; TeleportMachine will call ctx.onTeleportHit(id)
    ctx.onTeleportHit = (id) => {
      ctx.log?.(`[rm] teleport hit: ${id}`);
      if (id === "tp_store") this.setRoom(ctx, "store");
      if (id === "tp_lobby") this.setRoom(ctx, "lobby");
      if (id === "tp_scorpion") this.setRoom(ctx, "scorpion");
    };
    ctx.log?.("[rm] teleports wired ✅");
  },
};
