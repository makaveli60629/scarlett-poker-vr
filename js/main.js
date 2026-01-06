// /js/main.js — Skylark Poker VR — Update 9.0 (FULL)
// GitHub Pages safe: uses local ../three.js wrapper (NOT "three").
//
// What this does:
// - Creates Scene + Camera + Renderer + VRButton
// - Builds World (lights + floor/walls + table area, via World.build if present)
// - Initializes Controls (movement/teleport/collision via Controls.init if present)
// - Initializes UI (menu + buttons via UI.init if present) with a built-in fallback overlay
// - Starts PokerSimulation safely (NO undefined.length crash)
//
// NOTE: If your local wrapper paths differ, adjust the imports below to match your repo.

import * as THREE from "../three/build/three.module.js";
import { VRButton } from "../three/examples/jsm/webxr/VRButton.js";

import { World } from "./world.js";
import { Controls } from "./controls.js";
import { UI } from "./ui.js";
import { PokerSimulation } from "./poker_simulation.js";

const APP = {
  version: "Update 9.0",
  cacheBust: Date.now(),
  scene: null,
  camera: null,
  renderer: null,
  clock: null,
  playerGroup: null,
  colliders: [],
  bots: [],
  ui: null,
  disposed: false,

  // ---------- DOM / STATUS ----------
  getEl(id) {
    return document.getElementById(id);
  },

  setBadge(ok, msg = "") {
    // If you have your custom UI badges, we try to update them.
    const okEl = this.getEl("status_ok");
    const errEl = this.getEl("status_err");
    const logEl = this.getEl("log");

    if (okEl) okEl.textContent = ok ? "✅ HTML loaded" : "⚠️ HTML loaded";
    if (errEl) errEl.textContent = ok ? "✅ OK" : "❌ ERROR";

    if (logEl && msg) logEl.textContent = msg;
  },

  appendLog(line) {
    const logEl = this.getEl("log");
    if (!logEl) return;
    logEl.textContent = `${logEl.textContent}\n${line}`.trim();
  },

  // ---------- FALLBACK OVERLAY ----------
  ensureFallbackOverlay() {
    // If your ui.js fails on GitHub, this keeps you from being stuck.
    // It only creates elements if they don’t exist already.
    if (this.getEl("hud")) return;

    const hud = document.createElement("div");
    hud.id = "hud";
    hud.style.position = "fixed";
    hud.style.left = "12px";
    hud.style.top = "12px";
    hud.style.zIndex = "9999";
    hud.style.maxWidth = "92vw";
    hud.style.background = "rgba(0,0,0,0.55)";
    hud.style.border = "1px solid rgba(255,255,255,0.15)";
    hud.style.borderRadius = "14px";
    hud.style.padding = "12px";
    hud.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Arial";
    hud.style.color = "#fff";
    hud.style.backdropFilter = "blur(8px)";

    hud.innerHTML = `
      <div style="font-weight:700; font-size:16px; margin-bottom:8px;">
        Skylark Poker VR — ${this.version}
      </div>

      <div style="display:flex; gap:10px; margin-bottom:10px; flex-wrap:wrap;">
        <span id="status_ok" style="padding:6px 10px; border-radius:999px; background:rgba(0,255,80,0.12); border:1px solid rgba(0,255,80,0.22);">✅ HTML loaded</span>
        <span id="status_err" style="padding:6px 10px; border-radius:999px; background:rgba(255,0,0,0.12); border:1px solid rgba(255,0,0,0.22);">✅ OK</span>
      </div>

      <div style="display:flex; gap:10px; margin-bottom:10px; flex-wrap:wrap;">
        <button id="btn_lobby" style="${this.btnStyle()}">Lobby</button>
        <button id="btn_poker" style="${this.btnStyle()}">Poker</button>
        <button id="btn_store" style="${this.btnStyle()}">Store</button>
        <button id="btn_reset" style="${this.btnStyle()}">Reset Spawn</button>
      </div>

      <pre id="log" style="margin:0; white-space:pre-wrap; font-size:12px; opacity:0.95; line-height:1.25; max-height:38vh; overflow:auto;">
Tip: reload with ?v=${this.cacheBust} if cache acts weird.
      </pre>
    `;

    document.body.appendChild(hud);

    // Wire buttons (fallback behavior)
    const lobby = this.getEl("btn_lobby");
    const poker = this.getEl("btn_poker");
    const store = this.getEl("btn_store");
    const reset = this.getEl("btn_reset");

    if (lobby) lobby.addEventListener("click", () => this.onNav("lobby"));
    if (poker) poker.addEventListener("click", () => this.onNav("poker"));
    if (store) store.addEventListener("click", () => this.onNav("store"));
    if (reset) reset.addEventListener("click", () => this.resetSpawn());
  },

  btnStyle() {
    return `
      cursor:pointer;
      border-radius:12px;
      padding:10px 14px;
      border:1px solid rgba(255,255,255,0.15);
      background:rgba(255,255,255,0.06);
      color:#fff;
      font-weight:600;
    `;
  },

  onNav(tab) {
    this.appendLog(`UI: switched to "${tab}"`);
    // If your UI module has a scene switcher, it can hook here later.
  },

  // ---------- CORE INIT ----------
  init() {
    this.ensureFallbackOverlay();

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020205);
    this.scene.fog = new THREE.Fog(0x020205, 2, 80);

    // Camera + Player Rig
    this.playerGroup = new THREE.Group();
    this.scene.add(this.playerGroup);

    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.05,
      200
    );
    this.camera.position.set(0, 1.65, 0);
    this.playerGroup.add(this.camera);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;

    this.renderer.xr.enabled = true;
    document.body.appendChild(this.renderer.domElement);

    // VR Button
    document.body.appendChild(VRButton.createButton(this.renderer));

    // Clock
    this.clock = new THREE.Clock();

    // Build World (and collect colliders safely)
    try {
      const worldResult = World?.build?.(this.scene, this.playerGroup) || {};
      this.colliders = Array.isArray(worldResult.colliders) ? worldResult.colliders : [];
      if (worldResult.spawn && worldResult.spawn.isVector3) {
        this.playerGroup.position.copy(worldResult.spawn);
      } else {
        // default spawn: open space
        this.playerGroup.position.set(0, 0, 5);
      }

      // Face toward center (origin) by default
      // Spawn at (0,0,5) should face toward (0,0,0) => -Z, which is camera default.
      // If your spawn changes, this keeps orientation sane.
      this.faceToward(new THREE.Vector3(0, 1.6, 0));

      this.appendLog(`World: built. Colliders: ${this.colliders.length}`);
    } catch (e) {
      this.setBadge(false, `IMPORT ERROR (World.build):\n${e?.stack || e}`);
      console.error(e);
      // keep going so you can still enter VR and see something
    }

    // Controls init (movement/teleport/collision) — safe
    try {
      Controls?.init?.({
        renderer: this.renderer,
        camera: this.camera,
        playerGroup: this.playerGroup,
        colliders: this.colliders
      });
      this.appendLog("Controls: init OK");
    } catch (e) {
      this.appendLog(`Controls ERROR: ${e?.message || e}`);
      console.error(e);
    }

    // UI init (your module) — safe
    try {
      UI?.init?.({
        renderer: this.renderer,
        camera: this.camera,
        playerGroup: this.playerGroup,
        onNav: (tab) => this.onNav(tab),
        onResetSpawn: () => this.resetSpawn()
      });
      this.appendLog("UI: init OK");
    } catch (e) {
      this.appendLog(`UI ERROR (fallback active): ${e?.message || e}`);
      console.error(e);
    }

    // Create bots (simple placeholders for now; your sim can expand these later)
    this.bots = this.createBots(8);

    // ✅ PokerSimulation build MUST pass arrays (prevents undefined.length crash)
    try {
      PokerSimulation?.build?.({
        players: [],       // real players later
        bots: this.bots    // bots now
      });
      this.appendLog(`Poker: sim started (bots=${this.bots.length})`);
      this.setBadge(true, this.getEl("log")?.textContent || "");
    } catch (e) {
      this.setBadge(false, `IMPORT ERROR (PokerSimulation.build):\n${e?.stack || e}`);
      console.error(e);
    }

    // Resize
    window.addEventListener("resize", () => this.onResize());

    // Keyboard toggles (handy on desktop)
    window.addEventListener("keydown", (ev) => {
      if (ev.key === "m" || ev.key === "M") {
        // If ui.js implements toggleMenu, call it, else toggle HUD visibility.
        if (UI?.toggleMenu) UI.toggleMenu();
        else this.toggleHud();
      }
      if (ev.key === "r" || ev.key === "R") this.resetSpawn();
    });

    // Start loop
    this.renderer.setAnimationLoop(() => this.animate());
  },

  animate() {
    if (this.disposed) return;
    const dt = this.clock.getDelta();

    // Controls update (safe)
    try {
      Controls?.update?.(dt);
    } catch (e) {
      // do not spam
    }

    // Poker sim update (safe)
    try {
      PokerSimulation?.update?.(dt);
    } catch (e) {
      // do not spam
    }

    // UI update (safe)
    try {
      UI?.update?.(dt);
    } catch (e) {
      // do not spam
    }

    this.renderer.render(this.scene, this.camera);
  },

  // ---------- HELPERS ----------
  onResize() {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  },

  toggleHud() {
    const hud = this.getEl("hud");
    if (!hud) return;
    hud.style.display = hud.style.display === "none" ? "block" : "none";
  },

  resetSpawn() {
    // Put player in a clear spot (no objects on top)
    this.playerGroup.position.set(0, 0, 5);
    this.faceToward(new THREE.Vector3(0, 1.6, 0));
    this.appendLog("Spawn reset to (0,0,5) facing center.");
    try {
      Controls?.reset?.();
    } catch {}
  },

  faceToward(targetVec3) {
    // Rotate playerGroup so camera faces a target point (y ignored)
    const pos = this.playerGroup.position.clone();
    const dir = targetVec3.clone().sub(pos);
    dir.y = 0;
    if (dir.lengthSq() < 0.0001) return;

    // Camera forward is -Z, so yaw = atan2(x, z) with sign to match -Z
    const yaw = Math.atan2(dir.x, dir.z) + Math.PI; // +PI aligns forward (-Z) toward target
    this.playerGroup.rotation.set(0, yaw, 0);
  },

  createBots(count = 8) {
    const bots = [];
    for (let i = 0; i < count; i++) {
      bots.push({
        id: `bot_${i + 1}`,
        name: `Bot ${i + 1}`,
        chips: 10000,
        hand: [],
        state: "seated", // later: "lobby_roam", "observing", "winner_parade"
        seatIndex: i
      });
    }
    return bots;
  }
};

// Boot
try {
  APP.init();
} catch (e) {
  console.error(e);
  // If something fails very early, show it in the HUD log (fallback)
  const msg = `FATAL INIT ERROR:\n${e?.stack || e}`;
  const log = document.getElementById("log");
  if (log) log.textContent = msg;
}
