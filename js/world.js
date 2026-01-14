// /js/world.js — ScarlettVR Prime 10.0 WORLD (FULL) v10.0.2
// ✅ Dedicated Spawn Room + Hallway into Lobby (no wall spawns)
// ✅ Safe telepads aligned to empty space
// ✅ UNSTUCK + SPAWN hooks
// ✅ Sticks movement works on Android AND Quest (XR too, for diagnostics)
// ✅ Uses your /js/core + /js/systems structure

import { Signals } from "./core/signals.js";
import { Manifest } from "./core/manifest.js";
import { DebugHUD } from "./core/debug_hud.js";
import { Persistence } from "./core/persistence.js";
import { XRHands } from "./core/xr_hands.js";
import { Interaction } from "./core/interaction.js";
import { Healthcheck } from "./core/healthcheck.js";
import { UISticks } from "./core/ui_sticks.js";

import { PokerSystem } from "./systems/poker_system.js";
import { BotSystem } from "./systems/bot_system.js";

// NOTE: you currently have poker_rules in /js/core in your repo screenshots.
// If you moved it to /js/systems, change the import accordingly.
import { PokerRules } from "./core/poker_rules.js";

import { WorldBuilders } from "./world_builders.js";

export const World = {
  async init({ THREE, scene, renderer, camera, player, log }) {
    Manifest.init();

    // default flags (keep safe)
    if (Manifest.get("flags.xrSticks") === undefined) Manifest.set("flags.xrSticks", true);
    if (Manifest.get("flags.safeMode") === undefined) Manifest.set("flags.safeMode", false);

    const saved = Persistence.load() || {};
    if (saved.flags?.safeMode === true) Manifest.set("flags.safeMode", true);

    const ctx = {
      THREE,
      scene,
      renderer,
      camera,
      player,
      root: new THREE.Group(),
      Signals,
      manifest: Manifest,
      log: (m) => { DebugHUD.log(m); log?.(m); }
    };

    ctx.root.name = "WORLD_ROOT";
    scene.add(ctx.root);

    // --- env ---
    scene.background = new THREE.Color(0x05070d);
    scene.fog = new THREE.Fog(0x05070d, 10, 110);

    // --- lights ---
    WorldBuilders.lights(ctx);

    // --- build world ---
    const build = WorldBuilders.build(ctx);
    // build returns: { anchors, pads, safeUnstuck }

    // XR hands + interaction
    const hands = XRHands.init({ THREE, scene, renderer, Signals, log: ctx.log });
    Interaction.init({ THREE, Signals, hands, log: ctx.log });

    // Android + XR diagnostic sticks
    const sticks = UISticks.init({ Signals, log: ctx.log });

    // systems
    const poker = PokerSystem?.init?.({
      THREE,
      root: ctx.root,
      Signals,
      manifest: Manifest,
      log: ctx.log
    });

    const rules = PokerRules?.init?.({ Signals, manifest: Manifest, log: ctx.log });
    const bots = BotSystem?.init?.({ Signals, manifest: Manifest, log: ctx.log });

    // --- helpers ---
    const anchors = build.anchors;

    function setRig(anchor) {
      if (!anchor) return;
      // anchor.pos is guaranteed clear space (we keep it away from walls)
      player.position.copy(anchor.pos);
      player.rotation.set(0, 0, 0);

      // yaw on desktop; XR head handles yaw
      if (!renderer.xr.isPresenting) camera.rotation.set(0, anchor.yaw || 0, 0);

      // slight lift to avoid spawning exactly on a surface seam
      player.position.y += 0.02;
    }

    function setRoom(roomName) {
      const r = anchors[roomName] ? roomName : "spawn";
      setRig(anchors[r]);
      DebugHUD.setRoom(r);
      Persistence.save({ ...saved, room: r, flags: Manifest.get("flags") });
      ctx.log(`[rm] room=${r}`);
    }

    function unstuck() {
      // always snap to a known safe open spot (spawn pad center)
      const p = build.safeUnstuck();
      player.position.copy(p);
      player.position.y += 0.05;
      if (!renderer.xr.isPresenting) camera.rotation.set(0, anchors.spawn.yaw || 0, 0);
      ctx.log("[rm] UNSTUCK ✅");
    }

    // --- Signals wiring ---
    Signals.on("ROOM_SET", (p) => setRoom(String(p?.room || "spawn")));
    Signals.on("UNSTUCK", () => unstuck());

    Signals.on("UI_CLICK", (p) => {
      const id = String(p?.id || "");
      if (id === "NEW_HAND") Signals.emit("GAME_INIT", { seed: Date.now(), tableId: "main" });
      if (id === "HEALTHCHECK") Signals.emit("DEBUG_DUMP", {});
      if (id === "SPAWN") Signals.emit("ROOM_SET", { room: "spawn" });
      if (id === "UNSTUCK") Signals.emit("UNSTUCK", {});

      if (id === "LOBBY") Signals.emit("ROOM_SET", { room: "lobby" });
      if (id === "POKER") Signals.emit("ROOM_SET", { room: "poker" });
      if (id === "STORE") Signals.emit("ROOM_SET", { room: "store" });
      if (id === "SCORPION") Signals.emit("ROOM_SET", { room: "scorpion" });
      if (id === "SPECTATE") Signals.emit("ROOM_SET", { room: "spectate" });
    });

    // Hook HUD buttons (id list must match your index.html)
    hookButton("btnNewHand",   () => Signals.emit("UI_CLICK", { id: "NEW_HAND" }));
    hookButton("btnHealthcheck", () => Signals.emit("UI_CLICK", { id: "HEALTHCHECK" }));

    hookButton("btnSpawn",     () => Signals.emit("UI_CLICK", { id: "SPAWN" }));
    hookButton("btnUnstuck",   () => Signals.emit("UI_CLICK", { id: "UNSTUCK" }));

    hookButton("btnLobby",     () => Signals.emit("UI_CLICK", { id: "LOBBY" }));
    hookButton("btnPoker",     () => Signals.emit("UI_CLICK", { id: "POKER" }));
    hookButton("btnStore",     () => Signals.emit("UI_CLICK", { id: "STORE" }));
    hookButton("btnScorpion",  () => Signals.emit("UI_CLICK", { id: "SCORPION" }));
    hookButton("btnSpectate",  () => Signals.emit("UI_CLICK", { id: "SPECTATE" }));

    function hookButton(id, fn) {
      const el = document.getElementById(id);
      if (el) el.addEventListener("click", fn);
    }

    // healthcheck (after DOM exists)
    Healthcheck.init({ Signals, manifest: Manifest, log: ctx.log });

    // start a hand
    Signals.emit("GAME_INIT", { seed: Date.now(), tableId: "main" });

    // apply saved room (default spawn room)
    const startRoom = saved.room || "spawn";
    setRoom(startRoom);

    ctx.log("[world] Prime 10.0 FULL init ✅ (SpawnRoom + Hallway aligned)");

    // movement (sticks) — also works in XR for diagnostics if flags.xrSticks true
    const tmpForward = new THREE.Vector3();
    const tmpRight = new THREE.Vector3();
    const tmpMove = new THREE.Vector3();

    function applySticks(dt) {
      const allowXR = !!Manifest.get("flags.xrSticks");
      if (renderer.xr.isPresenting && !allowXR) return;

      const ax = sticks.getAxes?.() || { lx:0, ly:0, rx:0, ry:0 };
      const moveX = ax.lx;
      const moveY = ax.ly;
      const lookX = ax.rx;
      const lookY = ax.ry;

      // look
      player.rotation.y -= lookX * 1.6 * dt;
      camera.rotation.x -= lookY * 1.2 * dt;
      camera.rotation.x = Math.max(-1.2, Math.min(1.2, camera.rotation.x));

      // move (flat)
      tmpForward.set(0, 0, -1).applyQuaternion(camera.quaternion);
      tmpForward.y = 0; tmpForward.normalize();
      tmpRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
      tmpRight.y = 0; tmpRight.normalize();

      tmpMove.set(0, 0, 0);
      tmpMove.addScaledVector(tmpRight, moveX);
      tmpMove.addScaledVector(tmpForward, -moveY);

      const len = tmpMove.length();
      if (len > 0.001) {
        tmpMove.multiplyScalar((2.2 * dt) / len);
        player.position.add(tmpMove);
      }
    }

    return {
      tick(dt, t) {
        DebugHUD.perfTick();

        // apply sticks (Android + Quest diagnostics)
        applySticks(dt);

        // hud labels
        DebugHUD.setXR(renderer.xr.isPresenting ? "XR:on" : "XR:off");
        DebugHUD.setPos(`x:${player.position.x.toFixed(2)} y:${player.position.y.toFixed(2)} z:${player.position.z.toFixed(2)}`);

        // systems
        poker?.update?.(dt, t);
        bots?.update?.(dt);

        // autosave
        if (((t * 0.001) | 0) % 10 === 0) {
          Persistence.save({ room: startRoom, flags: Manifest.get("flags") });
        }
      }
    };
  }
};
