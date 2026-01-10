// /js/room_manager.js — Room Manager v3.1 (FULL)
// Fixes/Adds:
// - Scorpion uses scorpion_seat_1 (not lobby table_seat_1)
// - Wires scarlett-seat + scarlett-leave-seat to Controls.sitAt/leaveSeat
// - Switches PokerSim table via ctx.poker.setTable("scorpion"/"lobby")
// - Keeps existing setActive / setMode hooks if present

export const RoomManager = {
  init(ctx) {
    ctx.room = "lobby";
    ctx.mode = "lobby";
    ctx.log?.("[rm] lobby");

    this._wireTeleports(ctx);
    this._wireSeatEvents(ctx);

    ctx.log?.("[rm] init ✅");
  },

  setRoom(ctx, room) {
    ctx.room = room;
    ctx.mode = room;
    ctx.log?.(`[rm] room=${room}`);

    // behaviors (compat with older systems)
    if (room === "lobby") {
      ctx.systems?.scorpion?.setActive?.(false);
      ctx.systems?.store?.setActive?.(true);
      ctx.PokerSim?.setMode?.("lobby_demo");
      ctx.poker?.setTable?.("lobby");
    }

    if (room === "store") {
      ctx.systems?.scorpion?.setActive?.(false);
      ctx.systems?.store?.setActive?.(true);
      ctx.PokerSim?.setMode?.("lobby_demo");
      ctx.poker?.setTable?.("lobby");
    }

    if (room === "spectate") {
      ctx.systems?.scorpion?.setActive?.(false);
      ctx.PokerSim?.setMode?.("lobby_demo");
      ctx.poker?.setTable?.("lobby");
    }

    if (room === "scorpion") {
      ctx.systems?.scorpion?.setActive?.(true);
      ctx.PokerSim?.setMode?.("scorpion_match");
      ctx.PokerSim?.ensureScorpionMatch?.();
      ctx.poker?.setTable?.("scorpion");
    }
  },

  _wireSeatEvents(ctx) {
    // Seat request: scarlett-seat { table: "scorpion"|"lobby", seat: 0 }
    window.addEventListener("scarlett-seat", (e) => {
      const d = e?.detail || {};
      const table = String(d.table || "lobby");
      const seat = Number.isFinite(d.seat) ? d.seat : 0;

      // Map seat to spawn key
      let spawnKey = "table_seat_1";
      if (table === "scorpion") spawnKey = "scorpion_seat_1";

      ctx.poker?.setTable?.(table === "scorpion" ? "scorpion" : "lobby");

      // Prefer calling Controls directly if available
      if (ctx.Controls?.sitAt) ctx.Controls.sitAt(spawnKey);
      else if (ctx.controls?.sitAt) ctx.controls.sitAt(spawnKey);
      else {
        // Fallback: emit spawn event for controls to catch
        window.dispatchEvent(new CustomEvent("scarlett-spawn", { detail: spawnKey }));
      }

      ctx.log?.(`[rm] seat ✅ table=${table} seat=${seat} spawn=${spawnKey}`);
    });

    // Leave seat request
    window.addEventListener("scarlett-leave-seat", () => {
      // Use controls if present
      if (ctx.Controls?.leaveSeat) ctx.Controls.leaveSeat();
      else if (ctx.controls?.leaveSeat) ctx.controls.leaveSeat();
      else {
        // Fallback: just spawn to lobby standing
        window.dispatchEvent(new CustomEvent("scarlett-spawn", { detail: "lobby_spawn" }));
        ctx.poker?.setTable?.("lobby");
      }
      ctx.log?.("[rm] leave seat ✅");
    });
  },

  _wireTeleports(ctx) {
    // Global event: scarlett-goto("lobby"/"store"/"spectate"/"scorpion")
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
        // Go to scorpion room, then seat at scorpion seat spawn
        this.setRoom(ctx, "scorpion");

        // Optional: first place you at the gate for a “walk in” feel
        // window.dispatchEvent(new CustomEvent("scarlett-spawn", { detail: "scorpion_gate" }));

        window.dispatchEvent(new CustomEvent("scarlett-seat", { detail: { table: "scorpion", seat: 0 } }));
      }
    });
  }
};
