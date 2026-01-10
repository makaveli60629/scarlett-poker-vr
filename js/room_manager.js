// /js/room_manager.js — Room Manager v3 (FULL)

export const RoomManager = {
  init(ctx) {
    ctx.room = "lobby";
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
    }

    if (room === "store") {
      ctx.systems?.scorpion?.setActive?.(false);
      ctx.systems?.store?.setActive?.(true);
      ctx.PokerSim?.setMode?.("lobby_demo");
    }

    if (room === "spectate") {
      ctx.systems?.scorpion?.setActive?.(false);
      ctx.PokerSim?.setMode?.("lobby_demo");
    }

    if (room === "scorpion") {
      ctx.systems?.scorpion?.setActive?.(true);
      ctx.PokerSim?.setMode?.("scorpion_match");
      ctx.PokerSim?.ensureScorpionMatch?.(); // bots playing if you’re not seated
    }
  },

  _wireTeleports(ctx) {
    // Global event: scarlett-goto("lobby_spawn"/"store_spawn"/etc)
    window.addEventListener("scarlett-goto", (e) => {
      const dest = String(e?.detail || "");
      if (!dest) return;

      if (dest === "lobby") {
        this.setRoom(ctx, "lobby");
        window.dispatchEvent(new CustomEvent("scarlett-spawn", { detail: "lobby_spawn" }));
      }
      if (dest === "store") {
        this.setRoom(ctx, "store");
        window.dispatchEvent(new CustomEvent("scarlett-spawn", { detail: "store_spawn" }));
      }
      if (dest === "spectate") {
        this.setRoom(ctx, "spectate");
        window.dispatchEvent(new CustomEvent("scarlett-spawn", { detail: "spectator" }));
      }
      if (dest === "scorpion") {
        this.setRoom(ctx, "scorpion");
        window.dispatchEvent(new CustomEvent("scarlett-spawn", { detail: "table_seat_1" }));
        window.dispatchEvent(new CustomEvent("scarlett-seat", { detail: { table: "scorpion", seat: 0 } }));
      }
    });
  }
};
