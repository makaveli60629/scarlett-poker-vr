// /js/core/manifest.js — ScarlettVR Prime 10.0 (FULL)
// Global config + base-path resolver. No systems hardcode ./assets paths.

export const Manifest = (() => {
  const state = {
    base: "/", // resolved from window.SCARLETT_BASE
    flags: { safeMode:false },

    poker: {
      seats: 6,
      seatRadius: 2.35,
      tableCenter: { x:0, y:0.95, z:-9.5 },
      deckPos: null,
      potPos: null,
      dealHop: 0.16,
      dealDur: 0.52,
      chipDur: 0.45,
      chipsPool: 512
    },

    textures: {
      cardBack: "assets/textures/card_back.png",
      tableTop: "assets/textures/table_top.png",
      chip: "assets/textures/chip_stack.png"
    }
  };

  function init() {
    state.base = window.SCARLETT_BASE || "/";
    // compute defaults that depend on tableCenter
    const tc = state.poker.tableCenter;
    state.poker.deckPos = state.poker.deckPos || { x: tc.x - 1.1, y: tc.y + 0.10, z: tc.z - 0.05 };
    state.poker.potPos  = state.poker.potPos  || { x: tc.x,      y: tc.y + 0.06, z: tc.z + 0.10 };
    return api;
  }

  function resolve(keyOrPath) {
    // resolve("textures.cardBack") OR resolve("assets/textures/foo.png") OR full URL
    const s = String(keyOrPath || "").trim();
    if (!s) return state.base;

    if (/^https?:\/\//i.test(s)) return s;
    if (s.startsWith("/")) return s;

    // dot path lookup like textures.cardBack
    if (s.includes(".")) {
      const v = get(s);
      if (typeof v === "string") return resolve(v);
    }

    const cleaned = s.replace(/^(\.\/)+/, "").replace(/^\/+/, "");
    return `${state.base}${cleaned}`;
  }

  function get(dotPath) {
    const parts = String(dotPath || "").split(".");
    let cur = state;
    for (const p of parts) {
      if (!cur || typeof cur !== "object") return undefined;
      cur = cur[p];
    }
    return cur;
  }

  function set(dotPath, value) {
    const parts = String(dotPath || "").split(".");
    let cur = state;
    for (let i=0;i<parts.length-1;i++){
      const p = parts[i];
      if (!cur[p] || typeof cur[p] !== "object") cur[p] = {};
      cur = cur[p];
    }
    cur[parts[parts.length-1]] = value;
  }

  const api = { init, resolve, get, set, state };
  return api;
})();
