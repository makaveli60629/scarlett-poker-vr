// /js/modules/slotsNet.module.js
// Networking-ready seat map (FULL)

export default {
  id: "slotsNet.module.js",

  async init({ tableData, log }) {
    const seatCount = tableData.seats || 6;

    const state = {
      seatCount,
      seats: Array.from({ length: seatCount }, (_, i) => ({
        seat: i,
        playerId: null,
        name: null,
        isLocal: false,
        connected: false
      })),
      version: 1
    };

    const emit = (type, detail) => {
      try { window.dispatchEvent(new CustomEvent(type, { detail })); } catch (_) {}
    };

    const api = {
      getState: () => JSON.parse(JSON.stringify(state)),

      joinSeat: (seat, player) => {
        if (seat < 0 || seat >= state.seatCount) return false;
        const s = state.seats[seat];
        if (s.playerId) return false;
        s.playerId = player.playerId;
        s.name = player.name || `P${seat+1}`;
        s.isLocal = !!player.isLocal;
        s.connected = true;
        state.version++;
        emit("SCARLETT_SEAT_JOIN", { seat, player: { ...s }, version: state.version });
        return true;
      },

      leaveSeat: (seat) => {
        if (seat < 0 || seat >= state.seatCount) return false;
        const s = state.seats[seat];
        if (!s.playerId) return false;
        const prev = { ...s };
        s.playerId = null;
        s.name = null;
        s.isLocal = false;
        s.connected = false;
        state.version++;
        emit("SCARLETT_SEAT_LEAVE", { seat, prev, version: state.version });
        return true;
      },

      applyPatch: (patch) => {
        if (!patch || !Array.isArray(patch.seats)) return false;
        if (patch.seats.length !== state.seatCount) return false;
        state.seats = patch.seats.map((x, i) => ({
          seat: i,
          playerId: x.playerId ?? null,
          name: x.name ?? null,
          isLocal: !!x.isLocal,
          connected: !!x.connected
        }));
        state.version = (patch.version ?? state.version + 1);
        emit("SCARLETT_SEAT_PATCH", { state: api.getState() });
        return true;
      }
    };

    window.SCARLETT = window.SCARLETT || {};
    window.SCARLETT.slots = api;

    api.joinSeat(0, { playerId: "local", name: "YOU", isLocal: true });

    log?.("slotsNet.module ✅ (seat map ready)");
  },

  test() {
    const ok = !!window.SCARLETT?.slots?.getState;
    return { ok, note: ok ? "slots ready" : "slots missing" };
  }
};
