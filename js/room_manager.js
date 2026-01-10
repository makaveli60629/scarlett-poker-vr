// /js/room_manager.js — RoomManager v6 (FULL)
// Scorpion Room = AUTO-SEAT + INSTANT PLAY (no locomotion)
// Leave Table (B/Y/A/X or L/Esc) => back to Lobby standing
//
// Works with:
// - ctx.controls.sitAt("scorpion_seat_1")
// - ctx.controls.forceStanding("lobby_spawn")
// - ctx.PokerSim.setMode("scorpion_play" | "lobby_demo")
// - ctx.spawns.apply("...") (SpawnPoints v3+)
//
// Also listens for:
// - window event: "scarlett-room" { detail: { room: "lobby"|"store"|"spectate"|"scorpion" } }
// - window event: "scarlett-leave-table" (fired by Controls.leaveSeat())

export const RoomManager = {
  init(ctx) {
    ctx.room = "lobby";
    ctx.mode = "lobby";

    ctx.log?.("[rm] lobby");
    this._wireTeleports(ctx);
    this._wireLeave(ctx);

    // Ensure lobby is consistent on boot
    this.setRoom(ctx, "lobby");

    ctx.log?.("[rm] init ✅");
  },

  setRoom(ctx, room) {
    ctx.room = room;
    ctx.mode = room;
    ctx.log?.(`[rm] room=${room}`);

    // Safety: if some other system toggled seated incorrectly,
    // the room handler below will set the correct posture.

    // --- LOBBY (standing + demo) ---
    if (room === "lobby") {
      ctx.systems?.scorpion?.setActive?.(false);
      ctx.systems?.store?.setActive?.(true);

      // Stand + move enabled
      ctx.controls?.forceStanding?.("lobby_spawn");
      ctx.spawns?.apply?.("lobby_spawn", ctx.player, { standY: 1.65 });

      // Poker visuals
      ctx.PokerSim?.setMode?.("lobby_demo");

      // Bots: let your existing system handle lobby behavior
      ctx.systems?.bots?.setMode?.("lobby");
      return;
    }

    // --- STORE (standing) ---
    if (room === "store") {
      ctx.systems?.scorpion?.setActive?.(false);
      ctx.systems?.store?.setActive?.(true);

      ctx.controls?.forceStanding?.("store_spawn");
      ctx.spawns?.apply?.("store_spawn", ctx.player, { standY: 1.65 });

      ctx.PokerSim?.setMode?.("lobby_demo");

      ctx.systems?.bots?.setMode?.("lobby");
      return;
    }

    // --- SPECTATE (standing) ---
    if (room === "spectate") {
      ctx.systems?.scorpion?.setActive?.(false);
      ctx.systems?.store?.setActive?.(false);

      ctx.controls?.forceStanding?.("spectator");
      ctx.spawns?.apply?.("spectator", ctx.player, { standY: 1.65 });

      ctx.PokerSim?.setMode?.("lobby_demo");

      ctx.systems?.bots?.setMode?.("lobby");
      return;
    }

    // --- SCORPION (AUTO-SEAT + PLAY) ---
    if (room === "scorpion") {
      ctx.systems?.store?.setActive?.(false);
      ctx.systems?.scorpion?.setActive?.(true);

      // ✅ Seat player (movement disabled by Controls)
      // NOTE: Controls v3.6 uses seated head height so you feel like you’re in a chair.
      ctx.controls?.sitAt?.("scorpion_seat_1");

      // ✅ Start Scorpion table visuals / deal
      ctx.PokerSim?.setMode?.("scorpion_play");

      // OPTIONAL: if you later add real seated bot bodies, wire them here
      // ctx.systems?.bots?.seatTable?.({ table: "scorpion", count: 4 });

      return;
    }

    // Unknown room: fallback to lobby
    ctx.log?.(`[rm] ⚠ unknown room "${room}" -> lobby`);
    this.setRoom(ctx, "lobby");
  },

  _wireTeleports(ctx) {
    // Generic room change event (TeleportMachine/UI can dispatch this)
    window.addEventListener("scarlett-room", (e) => {
      const room = e?.detail?.room;
      if (!room) return;
      this.setRoom(ctx, room);
    });

    // If TeleportMachine provides a callback API
    if (ctx.teleportMachine?.onRoom) {
      ctx.teleportMachine.onRoom((room) => this.setRoom(ctx, room));
    }
  },

  _wireLeave(ctx) {
    // Fired by Controls.leaveSeat()
    window.addEventListener("scarlett-leave-table", () => {
      this.setRoom(ctx, "lobby");
    });
  },
};
