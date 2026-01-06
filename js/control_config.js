// /js/control_config.js — Scarlett Poker VR — Controller Calibration (PERMANENT)
// Goal: never guess axes/buttons again.
// - Shows BIG in-world HUD that always faces camera
// - Guides you through: MOVE left stick, MOVE right stick, PRESS trigger
// - Saves mapping to localStorage (per device/browser)
// - Provides normalized readings: moveX/moveY, turnX, trigger

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const KEY = "scarlett_vr_controls_v1";

function clampDead(v, dead = 0.15) {
  return Math.abs(v) < dead ? 0 : v;
}

export const ControlConfig = {
  mapping: null,
  hud: null,

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      this.mapping = JSON.parse(raw);
      return this.mapping;
    } catch {
      return null;
    }
  },

  save(mapping) {
    this.mapping = mapping;
    try { localStorage.setItem(KEY, JSON.stringify(mapping)); } catch {}
  },

  clear() {
    this.mapping = null;
    try { localStorage.removeItem(KEY); } catch {}
  },

  // ----- HUD (BIG, readable, always in front) -----
  attachHUD(camera) {
    const canvas = document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = 900;
    const ctx = canvas.getContext("2d");

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const geo = new THREE.PlaneGeometry(2.6, 1.46);

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, 0.0, -1.35);
    camera.add(mesh);

    this.hud = { canvas, ctx, tex, mesh, lines: [] };
    this._hudWrite([
      "Scarlett VR Poker — Controller Calibration",
      "",
      "If you can't move: run calibration now.",
      "You WILL see this panel in VR.",
      "",
      "Press and hold LEFT trigger to start calibration.",
      "Press and hold RIGHT trigger to reset mapping.",
    ]);

    return this.hud;
  },

  _hudWrite(lines) {
    if (!this.hud) return;
    const { ctx, canvas, tex } = this.hud;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#00ff66";
    ctx.font = "54px ui-monospace, Menlo, Consolas, monospace";
    ctx.fillText(lines[0] || "", 48, 90);

    ctx.font = "38px ui-monospace, Menlo, Consolas, monospace";
    let y = 170;
    for (let i = 1; i < lines.length; i++) {
      ctx.fillText(lines[i], 48, y);
      y += 52;
    }

    tex.needsUpdate = true;
    this.hud.lines = lines;
  },

  // ----- Gamepad fetch (Quest safe) -----
  getInputSources(renderer) {
    const s = renderer.xr.getSession?.();
    if (!s) return [];

    const arr = [];
    for (const src of s.inputSources || []) {
      if (!src?.gamepad) continue;
      arr.push({
        handedness: src.handedness || "unknown",
        gp: src.gamepad
      });
    }
    return arr;
  },

  pickLeftRight(sources) {
    let left = sources.find(s => s.handedness === "left")?.gp || null;
    let right = sources.find(s => s.handedness === "right")?.gp || null;

    // fallback: first two
    if (!left && sources[0]) left = sources[0].gp;
    if (!right && sources[1]) right = sources[1].gp;

    return { left, right };
  },

  // Read stick from a given axes pair
  readAxesPair(gp, a, b) {
    const x = gp?.axes?.[a] ?? 0;
    const y = gp?.axes?.[b] ?? 0;
    return { x, y, mag: Math.abs(x) + Math.abs(y) };
  },

  // Candidate axis pairs that Quest commonly uses
  axisPairs() {
    return [
      [0, 1],
      [2, 3],
      [4, 5], // some weird devices
    ];
  },

  // Trigger candidates (Quest usually button 0 or 1 as value)
  triggerCandidates() {
    return [0, 1, 2, 3];
  },

  readTrigger(gp, idx) {
    const b = gp?.buttons?.[idx];
    if (!b) return 0;
    const v = typeof b.value === "number" ? b.value : (b.pressed ? 1 : 0);
    return v;
  },

  // ===== CALIBRATION FLOW =====
  // Start calibration if user holds left trigger
  // Reset mapping if user holds right trigger
  update(renderer) {
    if (!this.hud) return;

    const srcs = this.getInputSources(renderer);
    const { left, right } = this.pickLeftRight(srcs);

    // no controllers yet
    if (!left && !right) {
      this._hudWrite([
        "Scarlett VR Poker — Controller Calibration",
        "",
        "No controllers detected yet.",
        "Turn controllers on, then press Enter VR again.",
      ]);
      return;
    }

    // hold-to-start logic
    const lt = this._maxTrigger(left);
    const rt = this._maxTrigger(right);

    if (rt > 0.85) {
      this.clear();
      this._hudWrite([
        "Mapping reset ✅",
        "",
        "Now hold LEFT trigger to re-calibrate.",
      ]);
      return;
    }

    // if mapping exists, show quick status and exit
    if (this.mapping) {
      this._hudWrite([
        "Controls mapped ✅",
        "",
        `Move stick: ${this.mapping.moveHand} axes[${this.mapping.moveAxes.join(",")}]`,
        `Turn stick: ${this.mapping.turnHand} axes[${this.mapping.turnAxes.join(",")}]`,
        `Trigger: ${this.mapping.triggerHand} button[${this.mapping.triggerBtn}]`,
        "",
        "Hold RIGHT trigger to reset mapping.",
      ]);
      return;
    }

    // start calibration
    if (lt > 0.85) {
      this._runCalibration(renderer, left, right);
    } else {
      this._hudWrite([
        "Scarlett VR Poker — Controller Calibration",
        "",
        "Hold LEFT trigger to start calibration.",
        "",
        "Step 1: you will move the LEFT stick in circles",
        "Step 2: you will move the RIGHT stick in circles",
        "Step 3: you will press the trigger you want for teleport",
        "",
        "Hold RIGHT trigger to reset at any time.",
      ]);
    }
  },

  _maxTrigger(gp) {
    if (!gp) return 0;
    let m = 0;
    for (const i of this.triggerCandidates()) {
      m = Math.max(m, this.readTrigger(gp, i));
    }
    return m;
  },

  async _runCalibration(renderer, left, right) {
    // Step 1: detect move stick (hand + axes pair)
    this._hudWrite([
      "Calibration: STEP 1/3",
      "",
      "MOVE the stick you want for WALKING (circle it).",
      "Do it for 2 seconds.",
    ]);
    const movePick = await this._detectBestStickPair(renderer, left, right, 2000);

    // Step 2: detect turn stick
    this._hudWrite([
      "Calibration: STEP 2/3",
      "",
      "MOVE the stick you want for TURNING (circle it).",
      "Do it for 2 seconds.",
    ]);
    const turnPick = await this._detectBestStickPair(renderer, left, right, 2000);

    // Step 3: detect trigger button
    this._hudWrite([
      "Calibration: STEP 3/3",
      "",
      "PRESS the TRIGGER you want for TELEPORT.",
      "Press firmly.",
    ]);
    const trigPick = await this._detectTrigger(renderer, left, right, 2500);

    const mapping = {
      moveHand: movePick.hand,
      moveAxes: movePick.pair, // [a,b]
      turnHand: turnPick.hand,
      turnAxes: turnPick.pair,
      triggerHand: trigPick.hand,
      triggerBtn: trigPick.btn,
      deadzone: 0.15,
      snapThreshold: 0.65,
      triggerThreshold: 0.70,
    };

    this.save(mapping);

    this._hudWrite([
      "Calibration complete ✅",
      "",
      `Move: ${mapping.moveHand} axes[${mapping.moveAxes.join(",")}]`,
      `Turn: ${mapping.turnHand} axes[${mapping.turnAxes.join(",")}]`,
      `Teleport: ${mapping.triggerHand} button[${mapping.triggerBtn}]`,
      "",
      "You can now move. Hold RIGHT trigger to reset anytime.",
    ]);
  },

  _gpByHand(left, right, hand) {
    return hand === "left" ? left : right;
  },

  _detectBestStickPair(renderer, left, right, ms) {
    return new Promise((resolve) => {
      const start = performance.now();
      let best = { hand: "left", pair: [0, 1], score: -1 };

      const tick = () => {
        const now = performance.now();
        const t = now - start;

        for (const hand of ["left", "right"]) {
          const gp = this._gpByHand(left, right, hand);
          if (!gp) continue;

          for (const pair of this.axisPairs()) {
            const { mag } = this.readAxesPair(gp, pair[0], pair[1]);
            // we accumulate max magnitude seen during the window
            if (mag > best.score) best = { hand, pair, score: mag };
          }
        }

        if (t >= ms) return resolve(best);
        requestAnimationFrame(tick);
      };
      tick();
    });
  },

  _detectTrigger(renderer, left, right, ms) {
    return new Promise((resolve) => {
      const start = performance.now();
      let best = { hand: "right", btn: 0, score: 0 };

      const tick = () => {
        const now = performance.now();
        const t = now - start;

        for (const hand of ["left", "right"]) {
          const gp = this._gpByHand(left, right, hand);
          if (!gp) continue;

          for (const idx of this.triggerCandidates()) {
            const v = this.readTrigger(gp, idx);
            if (v > best.score) best = { hand, btn: idx, score: v };
          }
        }

        // If we got a strong trigger press early, finish early
        if (best.score > 0.75) return resolve(best);
        if (t >= ms) return resolve(best);

        requestAnimationFrame(tick);
      };
      tick();
    });
  },

  // Normalized values once mapped
  readMapped(renderer) {
    const srcs = this.getInputSources(renderer);
    const { left, right } = this.pickLeftRight(srcs);
    const m = this.mapping;
    if (!m) return null;

    const moveGp = m.moveHand === "left" ? left : right;
    const turnGp = m.turnHand === "left" ? left : right;
    const trigGp = m.triggerHand === "left" ? left : right;

    const mx = clampDead(moveGp?.axes?.[m.moveAxes[0]] ?? 0, m.deadzone);
    const my = clampDead(moveGp?.axes?.[m.moveAxes[1]] ?? 0, m.deadzone);

    const tx = clampDead(turnGp?.axes?.[m.turnAxes[0]] ?? 0, m.deadzone);

    const trig = this.readTrigger(trigGp, m.triggerBtn);

    return { mx, my, tx, trig, mapping: m };
  }
};
