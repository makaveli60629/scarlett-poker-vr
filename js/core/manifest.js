// /js/core/manifest.js — ScarlettVR Prime 10.0 (FULL)
// Config + global toggles + canonical asset paths (GitHub Pages safe)

export const Manifest = (() => {
  const data = {
    version: "Prime 10.0",
    flags: {
      safeMode: false,   // disables heavy stuff if needed
      fx: true,
      bots: true,
      poker: true
    },
    paths: {
      textures: "./assets/textures"
    },
    textures: {
      cardBack: "./assets/textures/card_back.png",
      chip: "./assets/textures/chip_stack.png",
      tableTop: "./assets/textures/table_top.png"
    }
  };

  const deepGet = (obj, path) => {
    if (!path) return obj;
    const parts = String(path).split(".");
    let cur = obj;
    for (const p of parts) {
      if (!cur || typeof cur !== "object") return undefined;
      cur = cur[p];
    }
    return cur;
  };

  const deepSet = (obj, path, value) => {
    const parts = String(path).split(".");
    let cur = obj;
    while (parts.length > 1) {
      const k = parts.shift();
      if (!cur[k] || typeof cur[k] !== "object") cur[k] = {};
      cur = cur[k];
    }
    cur[parts[0]] = value;
  };

  return {
    init() {
      // future: could read query params like ?safe=1
      try {
        const u = new URL(location.href);
        if (u.searchParams.get("safe") === "1") data.flags.safeMode = true;
        if (u.searchParams.get("fx") === "0") data.flags.fx = false;
        if (u.searchParams.get("bots") === "0") data.flags.bots = false;
      } catch {}
    },

    get(path) {
      return deepGet(data, path);
    },

    set(path, value) {
      deepSet(data, path, value);
    },

    dump() {
      return JSON.parse(JSON.stringify(data));
    }
  };
})();
