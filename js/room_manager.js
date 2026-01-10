// /js/room_manager.js — RoomManager v7.2 (FULL)
// Fixes:
// - Hard guarantees scorpion setActive(true) + PokerSim scorpion_play (with retry)
// - Always start lobby
// - Leave always returns lobby

export const RoomManager = {
  init(ctx) {
    ctx.room = "lobby";
    ctx.mode = "lobby";

    this._wireTeleports(ctx);
    this._wireLeave(ctx);
    this._wireHotkeys(ctx);
    this._wireDirectEvents(ctx);

    this.setRoom(ctx, "lobby");

    ctx.log?.("[rm] init ✅ v7.2 (force scorpion mode + retry)");
  },

  setRoom(ctx, room) {
    ctx.room = room;
    ctx.mode = room;
    ctx.log?.(`[rm] room=${room}`);

    const sc = ctx.systems?.scorpion;
    const store = ctx.systems?.store;

    const forcePokerMode = (mode) => {
      const sim = ctx.PokerSim || ctx.poker;
      if (sim?.setMode) {
        sim.setMode(mode);
        return true;
      }
      return false;
    };

    if (room === "lobby") {
      sc?.setActive?.(false);
      store?.setActive?.(true);

      ctx.controls?.forceStanding?.("lobby_spawn");
      ctx.spawns?.apply?.("lobby_spawn", ctx.player, { standY: 1.65 });

      forcePokerMode("lobby_demo");
      return;
    }

    if (room === "store") {
      sc?.setActive?.(false);
      store?.setActive?.(true);

      ctx.controls?.forceStanding?.("store_spawn");
      ctx.spawns?.apply?.("store_spawn", ctx.player, { standY: 1.65 });

      forcePokerMode("lobby_demo");
      return;
    }

    if (room === "spectate") {
      sc?.setActive?.(false);
      store?.setActive?.(false);

      ctx.controls?.forceStanding?.("spectator");
      ctx.spawns?.apply?.("spectator", ctx.player, { standY: 1.65 });

      forcePokerMode("lobby_demo");
      return;
    }

    if (room === "scorpion") {
      // show scorpion, hide store
      store?.setActive?.(false);
      sc?.setActive?.(true);

      // seat player (no locomotion)
      ctx.controls?.sitAt?.("scorpion_seat_1");

      // force PokerSim mode now; if not ready, retry shortly
      if (!forcePokerMode("scorpion_play")) {
        setTimeout(() => forcePokerMode("scorpion_play"), 250);
        setTimeout(() => forcePokerMode("scorpion_play"), 700);
      }

      // small debug ping
      ctx.log?.("[rm] 🦂 entered scorpion (seat + sim mode forced)");
      return;
    }

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

  _wireHotkeys(ctx) {
    window.addEventListener("keydown", (e) => {
      if (e.code === "KeyP") this.setRoom(ctx, "scorpion");
      if (e.code === "KeyO") this.setRoom(ctx, "lobby");
    });
  },

  _wireDirectEvents(ctx) {
    window.addEventListener("scarlett-enter-scorpion", () => this.setRoom(ctx, "scorpion"));
    window.addEventListener("scarlett-enter-lobby", () => this.setRoom(ctx, "lobby"));
  },
};
