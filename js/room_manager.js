// /js/room_manager.js — Room Manager v4 (FULL)
// Lobby is start. Teleport to Store or Scorpion.
// Enter Scorpion → auto-seat.

export const RoomManager = {
  init(ctx) {
    ctx.room = "lobby";
    ctx.mode = "lobby";

    // expose manager on ctx.rooms so UI bridge works
    ctx.rooms = this;

    // TeleportMachine hits call ctx.onTeleportHit(id)
    ctx.onTeleportHit = (id) => {
      ctx.log?.(`[rm] teleport hit: ${id}`);
      if (id === "tp_store") this.setRoom(ctx, "store");
      if (id === "tp_lobby") this.setRoom(ctx, "lobby");
      if (id === "tp_scorpion") this.setRoom(ctx, "scorpion");
    };

    this._applyRoomBehaviors(ctx, "lobby");
    ctx.log?.("[rm] init ✅ room=lobby");
  },

  setRoom(ctx, room) {
    if (!room || ctx.room === room) return;
    ctx.room = room;
    ctx.mode = room;
    ctx.log?.(`[rm] setRoom → ${room}`);

    this._applyRoomBehaviors(ctx, room);

    // move / seat
    if (room === "lobby") {
      ctx.world?.movePlayerTo?.("lobby_spawn", ctx);
      ctx.world?.setSeated?.(false, ctx);
    }

    if (room === "store") {
      ctx.world?.movePlayerTo?.("store_spawn", ctx);
      ctx.world?.setSeated?.(false, ctx);
    }

    if (room === "scorpion") {
      ctx.world?.movePlayerTo?.("scorpion_entry", ctx);
      ctx.world?.seatPlayer?.(0, ctx); // YOU at seat 0
    }
  },

  _applyRoomBehaviors(ctx, room) {
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
};
