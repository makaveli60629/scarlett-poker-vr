// xr_controller_quest.js
// Single source of truth for Quest/Oculus WebXR input normalization.
// Goal: never touch mapping again.

import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";

export function createXRControllerQuestModule() {
  const state = {
    session: null,
    sources: { left: null, right: null },
    gamepads: { left: null, right: null },

    // Normalized outputs (all modules consume ONLY these)
    out: {
      left:  { stickX: 0, stickY: 0, trigger: 0, grip: 0, primary: 0 },
      right: { stickX: 0, stickY: 0, trigger: 0, grip: 0, primary: 0 },
      // convenience
      moveX: 0, // world-relative computed elsewhere OR keep as local
      moveY: 0,
    },

    // mapping cache (so we stop guessing every session)
    mapping: {
      stick: "auto",           // "axes01" or "axes23" or "auto"
      triggerIdx: [0, 1],
      gripIdx: [1, 2],
      primaryIdx: [3, 4, 5],
    }
  };

  // Load cached mapping per device/runtime if available
  const mapKey = "scarlett1.xr.mapping.quest.v1";
  try {
    const cached = JSON.parse(localStorage.getItem(mapKey) || "null");
    if (cached && typeof cached === "object") state.mapping = { ...state.mapping, ...cached };
  } catch {}

  function saveMapping() {
    try { localStorage.setItem(mapKey, JSON.stringify(state.mapping)); } catch {}
  }

  function deadzone(v, dz = 0.18) {
    const a = Math.abs(v);
    if (a < dz) return 0;
    return Math.sign(v) * (a - dz) / (1 - dz);
  }

  function pickButton(gp, idxCandidates) {
    if (!gp?.buttons) return 0;
    for (const idx of idxCandidates) {
      const b = gp.buttons[idx];
      if (!b) continue;
      return (typeof b.value === "number") ? b.value : (b.pressed ? 1 : 0);
    }
    return 0;
  }

  function updateInputSource(src) {
    if (!src?.gamepad) return;
    const hand = src.handedness === "left" ? "left" : (src.handedness === "right" ? "right" : null);
    if (!hand) return;
    state.sources[hand] = src;
    state.gamepads[hand] = src.gamepad;
  }

  function rescan() {
    state.sources.left = state.sources.right = null;
    state.gamepads.left = state.gamepads.right = null;
    for (const src of state.session?.inputSources || []) updateInputSource(src);
  }

  function readStick(gp) {
    if (!gp?.axes) return { x: 0, y: 0 };

    const a0 = gp.axes[0] ?? 0, a1 = gp.axes[1] ?? 0;
    const a2 = gp.axes[2] ?? 0, a3 = gp.axes[3] ?? 0;

    // Decide once and cache (unless "auto")
    let use = state.mapping.stick;

    if (use === "auto") {
      const m01 = Math.hypot(a0, a1);
      const m23 = Math.hypot(a2, a3);
      // choose whichever actually moves more
      use = (m23 > m01 + 0.05) ? "axes23" : "axes01";
      state.mapping.stick = use;
      saveMapping();
    }

    let x = 0, y = 0;
    if (use === "axes23") { x = a2; y = a3; }
    else { x = a0; y = a1; }

    x = deadzone(x);
    y = deadzone(y);

    return { x, y };
  }

  function updateNormalized() {
    // keep refs fresh
    for (const src of state.session?.inputSources || []) updateInputSource(src);

    const L = state.gamepads.left;
    const R = state.gamepads.right;

    const ls = readStick(L);
    const rs = readStick(R);

    state.out.left.stickX = ls.x;
    state.out.left.stickY = ls.y;
    state.out.right.stickX = rs.x;
    state.out.right.stickY = rs.y;

    state.out.left.trigger = pickButton(L, state.mapping.triggerIdx);
    state.out.left.grip    = pickButton(L, state.mapping.gripIdx);
    state.out.left.primary = pickButton(L, state.mapping.primaryIdx);

    state.out.right.trigger = pickButton(R, state.mapping.triggerIdx);
    state.out.right.grip    = pickButton(R, state.mapping.gripIdx);
    state.out.right.primary = pickButton(R, state.mapping.primaryIdx);
  }

  return {
    name: "xr_controller_quest",
    bindSession(session) {
      state.session = session;
      rescan();
      session.addEventListener("inputsourceschange", rescan);
    },
    update() { updateNormalized(); },
    get() { return state.out; },
    // if you ever want to force reset mappings:
    resetMapping() {
      state.mapping.stick = "auto";
      saveMapping();
    }
  };
      }
