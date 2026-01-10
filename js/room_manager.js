// /js/room_manager.js — RoomManager v7 (FULL)
// Guarantees lobby first, scorpion hidden until entered, scorpion seats + starts PokerSim.

export const RoomManager = {
  init(ctx) {
    ctx.room = "lobby";
    ctx.mode = "lobby";

    this._wireTeleports(ctx);
    this._wireLeave(ctx);
    this._wireHotkeys(ctx);
    this._wireDirectEvents(ctx);

    // ✅ always begin lobby
    this.setRoom(ctx, "lobby");

    ctx.log?.("[rm] init ✅ v7 (lobby-first + scorpion toggle + sim mode)");
  },

  setRoom(ctx, room) {
    ctx.room = room;
    ctx.mode = room;
    ctx.log?.(`[rm] room=${room}`);

    const sc = ctx.systems?.scorpion;
    const store = ctx.systems?.store;

    if (room === "lobby") {
      sc?.setActive?.(false);
      store?.setActive?.(true);

      // standing spawn in lobby
      ctx.controls?.forceStanding?.("lobby_spawn");
      ctx.spawns?.apply?.("lobby_spawn", ctx.player, { standY: 1.65 });

      ctx.PokerSim?.setMode?.("lobby_demo");
      return;
    }

    if (room === "store") {
      sc?.setActive?.(false);
      store?.setActive?.(true);

      ctx.controls?.forceStanding?.("store_spawn");
      ctx.spawns?.apply?.("store_spawn", ctx.player, { standY: 1.65 });

      ctx.PokerSim?.setMode?.("lobby_demo");
      return;
    }

    if (room === "spectate") {
      sc?.setActive?.(false);
      store?.setActive?.(false);

      ctx.controls?.forceStanding?.("spectator");
      ctx.spawns?.apply?.("spectator", ctx.player, { standY: 1.65 });

      ctx.PokerSim?.setMode?.("lobby_demo");
      return;
    }

    if (room === "scorpion") {
      // show scorpion, hide store
      store?.setActive?.(false);
      sc?.setActive?.(true);

      // seat player (no locomotion)
      ctx.controls?.sitAt?.("scorpion_seat_1");

      // start scorpion poker visuals (4 bots are created by PokerSim)
      ctx.PokerSim?.setMode?.("scorpion_play");

      return;
    }

    // fallback
    this.setRoom(ctx, "lobby");
  },

  _wireTeleports(ctx) {
    // TeleportMachine or pads should dispatch this
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
    // Desktop fallback:
    // P = enter scorpion, O = return lobby
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
