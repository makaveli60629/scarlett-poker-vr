// /js/room_manager.js — RoomManager v6 (FULL)
// Scorpion = auto-seat + instant play (no movement). Leave => lobby standing.

export const RoomManager = {
  init(ctx) {
    ctx.room = "lobby";
    ctx.mode = "lobby";

    ctx.log?.("[rm] lobby");
    this._wireTeleports(ctx);
    this._wireLeave(ctx);

    // lock into lobby on boot
    this.setRoom(ctx, "lobby");
    ctx.log?.("[rm] init ✅");
  },

  setRoom(ctx, room) {
    ctx.room = room;
    ctx.mode = room;

    ctx.log?.(`[rm] room=${room}`);

    if (room === "lobby") {
      ctx.systems?.scorpion?.setActive?.(false);
      ctx.systems?.store?.setActive?.(true);

      ctx.controls?.forceStanding?.("lobby_spawn");
      ctx.spawns?.apply?.("lobby_spawn", ctx.player, { standY: 1.65 });

      ctx.PokerSim?.setMode?.("lobby_demo");
      return;
    }

    if (room === "store") {
      ctx.systems?.scorpion?.setActive?.(false);
      ctx.systems?.store?.setActive?.(true);

      ctx.controls?.forceStanding?.("store_spawn");
      ctx.spawns?.apply?.("store_spawn", ctx.player, { standY: 1.65 });

      ctx.PokerSim?.setMode?.("lobby_demo");
      return;
    }

    if (room === "spectate") {
      ctx.systems?.scorpion?.setActive?.(false);
      ctx.systems?.store?.setActive?.(false);

      ctx.controls?.forceStanding?.("spectator");
      ctx.spawns?.apply?.("spectator", ctx.player, { standY: 1.65 });

      ctx.PokerSim?.setMode?.("lobby_demo");
      return;
    }

    if (room === "scorpion") {
      ctx.systems?.store?.setActive?.(false);
      ctx.systems?.scorpion?.setActive?.(true);

      // ✅ seat (no locomotion)
      ctx.controls?.sitAt?.("scorpion_seat_1");

      // ✅ instant game visuals
      ctx.PokerSim?.setMode?.("scorpion_play");
      return;
    }

    ctx.log?.(`[rm] ⚠ unknown room "${room}" -> lobby`);
    this.setRoom(ctx, "lobby");
  },

  _wireTeleports(ctx) {
    window.addEventListener("scarlett-room", (e) => {
      const room = e?.detail?.room;
      if (!room) return;
      this.setRoom(ctx, room);
    });

    if (ctx.teleportMachine?.onRoom) {
      ctx.teleportMachine.onRoom((room) => this.setRoom(ctx, room));
    }
  },

  _wireLeave(ctx) {
    window.addEventListener("scarlett-leave-table", () => {
      this.setRoom(ctx, "lobby");
    });
  },
};
