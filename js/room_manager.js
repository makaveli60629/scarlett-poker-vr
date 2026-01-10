// /js/room_manager.js — Room Manager v5 (SCORPION = AUTO-SEAT + INSTANT HAND)

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

    // --- LOBBY ---
    if (room === "lobby") {
      ctx.systems?.scorpion?.setActive?.(false);
      ctx.systems?.store?.setActive?.(true);

      // Return to standing + lobby spawn
      ctx.controls?.forceStanding?.("lobby_spawn");
      ctx.spawns?.apply?.("lobby_spawn", ctx.player, { standY: 1.65 });

      // Lobby poker demo
      ctx.PokerSim?.setMode?.("lobby_demo");

      return;
    }

    // --- STORE ---
    if (room === "store") {
      ctx.systems?.scorpion?.setActive?.(false);
      ctx.systems?.store?.setActive?.(true);

      ctx.controls?.forceStanding?.("store_spawn");
      ctx.spawns?.apply?.("store_spawn", ctx.player, { standY: 1.65 });

      ctx.PokerSim?.setMode?.("lobby_demo");
      return;
    }

    // --- SPECTATE ---
    if (room === "spectate") {
      ctx.systems?.scorpion?.setActive?.(false);
      ctx.systems?.store?.setActive?.(false);

      ctx.controls?.forceStanding?.("spectator");
      ctx.spawns?.apply?.("spectator", ctx.player, { standY: 1.65 });

      ctx.PokerSim?.setMode?.("lobby_demo");
      return;
    }

    // --- SCORPION (AUTO-SEAT + PLAY) ---
    if (room === "scorpion") {
      ctx.systems?.store?.setActive?.(false);
      ctx.systems?.scorpion?.setActive?.(true);

      // IMPORTANT: Seat the player (movement disabled) at a SAFE seat position
      // This is your "sit down and start instantly" behavior.
      ctx.controls?.sitAt?.("scorpion_seat_1");

      // Start scorpion gameplay mode (player + bots)
      ctx.PokerSim?.setMode?.("scorpion_play");

      return;
    }
  },

  _wireTeleports(ctx) {
    // room change event
    window.addEventListener("scarlett-room", (e) => {
      const room = e?.detail?.room;
      if (!room) return;
      this.setRoom(ctx, room);
    });

    // If TeleportMachine has callback API
    if (ctx.teleportMachine?.onRoom) {
      ctx.teleportMachine.onRoom((room) => this.setRoom(ctx, room));
    }

    // OPTIONAL: allow controls.leaveSeat() to route through RoomManager cleanly
    window.addEventListener("scarlett-leave-table", () => {
      this.setRoom(ctx, "lobby");
    });
  },
};
