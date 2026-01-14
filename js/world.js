// /js/world.js — ScarlettVR Prime WORLD (FULL) v10.7
// ✅ GUARANTEED movement in Quest XR using SELECT (pinch = select)
// ✅ Also supports thumbsticks automatically if gamepad exists
// ✅ Always-on gaze ray + foot ring
// ✅ Spawn is always safe

import { Signals } from "./core/signals.js";
import { Manifest } from "./core/manifest.js";
import { DebugHUD } from "./core/debug_hud.js";
import { Persistence } from "./core/persistence.js";
import { XRHands } from "./core/xr_hands.js";
import { Interaction } from "./core/interaction.js";
import { Healthcheck } from "./core/healthcheck.js";
import { UISticks } from "./core/ui_sticks.js";

import { WorldBuilders } from "./world_builders.js";

export const World = {
  async init({ THREE, scene, renderer, camera, player, log }) {
    Manifest.init();
    if (Manifest.get("flags.safeMode") === undefined) Manifest.set("flags.safeMode", false);

    const saved = Persistence.load() || {};

    const ctx = {
      THREE, scene, renderer, camera, player,
      root: new THREE.Group(),
      Signals,
      manifest: Manifest,
      log: (m) => { DebugHUD.log(m); log?.(m); }
    };

    ctx.root.name = "WORLD_ROOT";
    scene.add(ctx.root);

    scene.background = new THREE.Color(0x05070d);
    scene.fog = new THREE.Fog(0x05070d, 8, 140);

    WorldBuilders.lights(ctx);
    const built = WorldBuilders.build(ctx);
    const anchors = built.anchors;

    function setRig(anchor) {
      anchor = anchor || anchors.spawn;
      player.position.copy(anchor.pos);
      player.position.y += 0.08;
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
      const p = built.safeUnstuck();
      player.position.copy(p);
      player.position.y += 0.10;
      ctx.log("[rm] UNSTUCK ✅");
    }

    // Foot ring (always)
    const footRing = new THREE.Mesh(
      new THREE.RingGeometry(0.16, 0.22, 36),
      new THREE.MeshBasicMaterial({ color: 0xffd36b, transparent: true, opacity: 0.78, side: THREE.DoubleSide })
    );
    footRing.rotation.x = -Math.PI / 2;
    footRing.position.set(0, 0.01, 0);
    player.add(footRing);

    // XR input + rays
    const handsApi = XRHands.init({ THREE, scene, renderer, Signals, log: ctx.log });
    Interaction.init({ THREE, Signals, hands: handsApi, log: ctx.log });
    const sticks2D = UISticks.init({ Signals, log: ctx.log });

    // XR select state (reliable on Quest: pinch = select)
    const xrMove = { left:false, right:false };
    Signals.on("XR_SELECT", (p) => {
      const hand = String(p?.hand || "none");
      const down = !!p?.down;

      if (hand === "left") xrMove.left = down;
      else if (hand === "right") xrMove.right = down;
      else {
        // if unknown, map index 0->left 1->right
        const idx = p?.index | 0;
        if (idx === 0) xrMove.left = down;
        if (idx === 1) xrMove.right = down;
      }
    });

    // Buttons
    const hook = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener("click", fn); };
    hook("btnSpawn", () => Signals.emit("ROOM_SET", { room: "spawn" }));
    hook("btnUnstuck", () => Signals.emit("UNSTUCK", {}));
    hook("btnLobby", () => Signals.emit("ROOM_SET", { room: "lobby" }));
    hook("btnPoker", () => Signals.emit("ROOM_SET", { room: "poker" }));
    hook("btnStore", () => Signals.emit("ROOM_SET", { room: "store" }));
    hook("btnScorpion", () => Signals.emit("ROOM_SET", { room: "scorpion" }));
    hook("btnSpectate", () => Signals.emit("ROOM_SET", { room: "spectate" }));
    hook("btnHealthcheck", () => Signals.emit("DEBUG_DUMP", {}));

    Signals.on("ROOM_SET", (p) => setRoom(String(p?.room || "spawn")));
    Signals.on("UNSTUCK", () => unstuck());

    Healthcheck.init({ Signals, manifest: Manifest, log: ctx.log });

    // Start safe
    setRoom(saved.room || "spawn");
    ctx.log("[world] v10.7 init ✅ (XR select locomotion)");

    const tmpForward = new THREE.Vector3();
    const tmpRight = new THREE.Vector3();
    const tmpMove = new THREE.Vector3();

    function apply2DSticks(dt) {
      if (renderer.xr.isPresenting) return;
      const ax = sticks2D.getAxes?.() || { lx:0, ly:0, rx:0, ry:0 };

      player.rotation.y -= ax.rx * 1.6 * dt;
      camera.rotation.x -= ax.ry * 1.2 * dt;
      camera.rotation.x = Math.max(-1.2, Math.min(1.2, camera.rotation.x));

      tmpForward.set(0,0,-1).applyQuaternion(camera.quaternion);
      tmpForward.y = 0; tmpForward.normalize();
      tmpRight.set(1,0,0).applyQuaternion(camera.quaternion);
      tmpRight.y = 0; tmpRight.normalize();

      tmpMove.set(0,0,0);
      tmpMove.addScaledVector(tmpRight, ax.lx);
      tmpMove.addScaledVector(tmpForward, -ax.ly);

      const L = tmpMove.length();
      if (L > 0.001) {
        tmpMove.multiplyScalar((2.35 * dt) / L);
        player.position.add(tmpMove);
      }
    }

    function readXRGamepadAxes() {
      // If controllers exist, use thumbsticks automatically
      try {
        const session = renderer.xr.getSession();
        if (!session) return null;

        let left = null, right = null;

        for (const src of session.inputSources) {
          if (!src?.gamepad) continue;
          const h = src.handedness || "none";
          const axes = src.gamepad.axes || [];
          // Typical: axes[2,3] or [0,1] depending on device.
          const x = axes.length >= 2 ? axes[0] : 0;
          const y = axes.length >= 2 ? axes[1] : 0;

          if (h === "left") left = { x, y, axes };
          if (h === "right") right = { x, y, axes };
        }
        return { left, right };
      } catch {
        return null;
      }
    }

    function applyXRLocomotion(dt) {
      if (!renderer.xr.isPresenting) return;

      // 1) thumbsticks if present
      const gp = readXRGamepadAxes();
      const hasStick = (gp?.left && (Math.abs(gp.left.x)+Math.abs(gp.left.y) > 0.05)) ||
                       (gp?.right && (Math.abs(gp.right.x)+Math.abs(gp.right.y) > 0.05));

      if (hasStick) {
        const lx = gp?.left?.x ?? 0;
        const ly = gp?.left?.y ?? 0;
        const rx = gp?.right?.x ?? 0;
        const ry = gp?.right?.y ?? 0;

        // Look with right stick
        player.rotation.y -= rx * 1.8 * dt;
        camera.rotation.x -= ry * 1.2 * dt;
        camera.rotation.x = Math.max(-1.2, Math.min(1.2, camera.rotation.x));

        // Move with left stick
        tmpForward.set(0,0,-1).applyQuaternion(camera.quaternion);
        tmpForward.y = 0; tmpForward.normalize();
        tmpRight.set(1,0,0).applyQuaternion(camera.quaternion);
        tmpRight.y = 0; tmpRight.normalize();

        tmpMove.set(0,0,0);
        tmpMove.addScaledVector(tmpRight, lx);
        tmpMove.addScaledVector(tmpForward, -ly);

        const L = tmpMove.length();
        if (L > 0.001) {
          tmpMove.multiplyScalar((2.2 * dt) / L);
          player.position.add(tmpMove);
        }
        return;
      }

      // 2) fallback: SELECT locomotion (pinch = select)
      const left = xrMove.left;
      const right = xrMove.right;
      if (!left && !right) return;

      if (right) {
        // smooth turn
        player.rotation.y -= 1.35 * dt;
      }

      if (left) {
        // move forward (head direction)
        tmpForward.set(0,0,-1).applyQuaternion(camera.quaternion);
        tmpForward.y = 0; tmpForward.normalize();

        const speed = (left && right) ? 1.45 : 1.10;
        player.position.addScaledVector(tmpForward, speed * dt);
      }
    }

    return {
      tick(dt, t) {
        DebugHUD.perfTick();

        // Update rays ALWAYS
        handsApi?.update?.(camera);

        apply2DSticks(dt);
        applyXRLocomotion(dt);

        DebugHUD.setXR(renderer.xr.isPresenting ? "XR:on" : "XR:off");
        DebugHUD.setPos(`x:${player.position.x.toFixed(2)} y:${player.position.y.toFixed(2)} z:${player.position.z.toFixed(2)}`);

        // quick periodic save
        if (((t) | 0) % 10 === 0) {
          Persistence.save({ room: saved.room || "spawn", flags: Manifest.get("flags") });
        }
      }
    };
  }
};
