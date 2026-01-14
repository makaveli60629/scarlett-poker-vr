// /js/world.js — ScarlettVR Prime WORLD (FULL) v10.6
// ✅ Guaranteed safe SPAWN room + hallway to lobby
// ✅ Always-visible floor ring at player feet (so you know where you are)
// ✅ XR Locomotion fallback (hands-only):
//    - Left pinch hold: move forward (head direction)
//    - Right pinch hold: turn
//    - Both: faster
// ✅ Works even if DOM overlay sticks fail in XR
// ✅ UNSTUCK always works

import { Signals } from "./core/signals.js";
import { Manifest } from "./core/manifest.js";
import { DebugHUD } from "./core/debug_hud.js";
import { Persistence } from "./core/persistence.js";
import { XRHands } from "./core/xr_hands.js";
import { Interaction } from "./core/interaction.js";
import { Healthcheck } from "./core/healthcheck.js";
import { UISticks } from "./core/ui_sticks.js";

import { PokerSystem } from "./systems/poker_system.js";
import { PokerRules } from "./core/poker_rules.js";
import { BotSystem } from "./systems/bot_system.js";

import { WorldBuilders } from "./world_builders.js";

export const World = {
  async init({ THREE, scene, renderer, camera, player, log }) {
    Manifest.init();
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

    scene.background = new THREE.Color(0x05070d);
    scene.fog = new THREE.Fog(0x05070d, 8, 140);

    // Lights + world geometry
    WorldBuilders.lights(ctx);
    const built = WorldBuilders.build(ctx);
    const anchors = built.anchors;

    // --- SAFE RIG MOVE ---
    function setRig(anchor) {
      if (!anchor) anchor = anchors.spawn;
      // put player in safe spot, slightly above floor
      player.position.copy(anchor.pos);
      player.position.y += 0.06;
      player.rotation.set(0, 0, 0);
      if (!renderer.xr.isPresenting) camera.rotation.set(0, anchor.yaw || 0, 0);
    }

    function setRoom(roomName) {
      const r = anchors[roomName] ? roomName : "spawn";
      setRig(anchors[r]);
      DebugHUD.setRoom(r);
      Persistence.save({ ...saved, room: r, flags: Manifest.get("flags") });
      ctx.log(`[rm] room=${r}`);
    }

    function unstuck() {
      const p = built.safeUnstuck(); // always returns a safe pad
      player.position.copy(p);
      player.position.y += 0.08;
      ctx.log("[rm] UNSTUCK ✅");
    }

    // Always-visible foot ring (so you know where you are)
    const footRing = new THREE.Mesh(
      new THREE.RingGeometry(0.16, 0.22, 36),
      new THREE.MeshBasicMaterial({ color: 0xffd36b, transparent: true, opacity: 0.75, side: THREE.DoubleSide })
    );
    footRing.rotation.x = -Math.PI / 2;
    footRing.position.set(0, 0.01, 0);
    player.add(footRing);

    // XR + interaction + sticks
    const handsApi = XRHands.init({ THREE, scene, renderer, Signals, log: ctx.log });
    Interaction.init({ THREE, Signals, hands: handsApi, log: ctx.log });
    const sticks = UISticks.init({ Signals, log: ctx.log });

    // Systems (safe)
    const poker = PokerSystem.init({ THREE, root: ctx.root, Signals, manifest: Manifest, log: ctx.log });
    PokerRules.init({ Signals, manifest: Manifest, log: ctx.log });
    BotSystem.init({ Signals, manifest: Manifest, log: ctx.log });

    // --- Buttons / Signals ---
    Signals.on("ROOM_SET", (p) => setRoom(String(p?.room || "spawn")));
    Signals.on("UNSTUCK", () => unstuck());

    // Hook HUD buttons if present
    const hook = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener("click", fn); };
    hook("btnSpawn", () => Signals.emit("ROOM_SET", { room: "spawn" }));
    hook("btnUnstuck", () => Signals.emit("UNSTUCK", {}));
    hook("btnLobby", () => Signals.emit("ROOM_SET", { room: "lobby" }));
    hook("btnPoker", () => Signals.emit("ROOM_SET", { room: "poker" }));
    hook("btnStore", () => Signals.emit("ROOM_SET", { room: "store" }));
    hook("btnScorpion", () => Signals.emit("ROOM_SET", { room: "scorpion" }));
    hook("btnSpectate", () => Signals.emit("ROOM_SET", { room: "spectate" }));
    hook("btnHealthcheck", () => Signals.emit("DEBUG_DUMP", {}));
    hook("btnNewHand", () => Signals.emit("GAME_INIT", { seed: Date.now(), tableId: "main" }));

    // Healthcheck
    Healthcheck.init({ Signals, manifest: Manifest, log: ctx.log });

    // Start in safe spawn room ALWAYS unless user saved otherwise
    setRoom(saved.room || "spawn");

    ctx.log("[world] Prime v10.6 init ✅ (XR pinch locomotion enabled)");

    // --- Movement sources ---
    const tmpForward = new THREE.Vector3();
    const tmpRight = new THREE.Vector3();
    const tmpMove = new THREE.Vector3();

    // Pinch state (updated by XRHands)
    const pinch = { leftDown:false, leftStr:0, rightDown:false, rightStr:0 };
    Signals.on("HAND_PINCH", (p) => {
      const hand = String(p?.hand || "");
      if (hand === "left")  { pinch.leftDown = !!p?.down; pinch.leftStr = p?.strength ?? 0; }
      if (hand === "right") { pinch.rightDown = !!p?.down; pinch.rightStr = p?.strength ?? 0; }
    });

    function apply2DSticks(dt) {
      // Works in non-XR (Android/desktop)
      if (renderer.xr.isPresenting) return;

      const ax = sticks.getAxes?.() || { lx:0, ly:0, rx:0, ry:0 };
      const moveX = ax.lx, moveY = ax.ly;
      const lookX = ax.rx, lookY = ax.ry;

      // look
      player.rotation.y -= lookX * 1.6 * dt;
      camera.rotation.x -= lookY * 1.2 * dt;
      camera.rotation.x = Math.max(-1.2, Math.min(1.2, camera.rotation.x));

      // move
      tmpForward.set(0,0,-1).applyQuaternion(camera.quaternion);
      tmpForward.y = 0; tmpForward.normalize();
      tmpRight.set(1,0,0).applyQuaternion(camera.quaternion);
      tmpRight.y = 0; tmpRight.normalize();

      tmpMove.set(0,0,0);
      tmpMove.addScaledVector(tmpRight, moveX);
      tmpMove.addScaledVector(tmpForward, -moveY);

      const L = tmpMove.length();
      if (L > 0.001) {
        tmpMove.multiplyScalar((2.35 * dt) / L);
        player.position.add(tmpMove);
      }
    }

    function applyXRPinchLocomotion(dt) {
      // Works INSIDE XR even if dom overlay sticks fail
      if (!renderer.xr.isPresenting) return;

      const left = pinch.leftDown;
      const right = pinch.rightDown;

      if (!left && !right) return;

      // TURN with right pinch
      if (right) {
        const turnSpeed = 1.25 + pinch.rightStr * 1.25;
        player.rotation.y -= turnSpeed * dt;
      }

      // MOVE forward with left pinch (head direction)
      if (left) {
        const speedBase = 0.95 + pinch.leftStr * 1.35;
        const speed = (left && right) ? speedBase * 1.45 : speedBase;

        // Use camera forward (head direction)
        tmpForward.set(0,0,-1).applyQuaternion(camera.quaternion);
        tmpForward.y = 0; tmpForward.normalize();

        player.position.addScaledVector(tmpForward, speed * dt);
      }
    }

    return {
      tick(dt, t) {
        DebugHUD.perfTick();

        // Always update hands + lasers
        handsApi?.update?.(camera);

        // Movement
        apply2DSticks(dt);
        applyXRPinchLocomotion(dt);

        // Always update HUD fields
        DebugHUD.setXR(renderer.xr.isPresenting ? "XR:on" : "XR:off");
        DebugHUD.setPos(`x:${player.position.x.toFixed(2)} y:${player.position.y.toFixed(2)} z:${player.position.z.toFixed(2)}`);

        // Systems
        poker?.update?.(dt, t);

        // Autosave
        if (((t) | 0) % 10 === 0) {
          Persistence.save({ room: saved.room || "spawn", flags: Manifest.get("flags") });
        }
      }
    };
  }
};
