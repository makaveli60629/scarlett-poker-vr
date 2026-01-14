// /js/world.js — ScarlettVR Prime WORLD (FULL) v10.7.2
// ✅ Fix: foot ring no longer attached to player (prevents “circle in face”)
// ✅ Fix: rigs stay aligned (spawn always open)
// ✅ Uses XRHands v3.1 rays (no parked rays)
// ✅ Movement remains XR_SELECT based (works on Quest)

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

    // Floor-follow ring (NOT parented to player)
    const floorRing = new THREE.Mesh(
      new THREE.RingGeometry(0.16, 0.22, 36),
      new THREE.MeshBasicMaterial({ color: 0xffd36b, transparent: true, opacity: 0.78, side: THREE.DoubleSide })
    );
    floorRing.rotation.x = -Math.PI / 2;
    floorRing.position.set(0, 0.02, 0);
    floorRing.name = "FLOOR_RING";
    ctx.root.add(floorRing);

    // XR + interaction + sticks
    const handsApi = XRHands.init({ THREE, scene, renderer, Signals, log: ctx.log });
    Interaction.init({ THREE, Signals, hands: handsApi, log: ctx.log });
    const sticks2D = UISticks.init({ Signals, log: ctx.log });

    // XR select state
    const xrMove = { left:false, right:false };
    Signals.on("XR_SELECT", (p) => {
      const hand = String(p?.hand || "none");
      const down = !!p?.down;
      if (hand === "left") xrMove.left = down;
      else if (hand === "right") xrMove.right = down;
      else {
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
    ctx.log("[world] v10.7.2 init ✅ (ring + rays aligned)");

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

    function applyXRSelectMove(dt) {
      if (!renderer.xr.isPresenting) return;
      const left = xrMove.left;
      const right = xrMove.right;
      if (!left && !right) return;

      if (right) player.rotation.y -= 1.35 * dt;

      if (left) {
        tmpForward.set(0,0,-1).applyQuaternion(camera.quaternion);
        tmpForward.y = 0; tmpForward.normalize();
        const speed = (left && right) ? 1.45 : 1.10;
        player.position.addScaledVector(tmpForward, speed * dt);
      }
    }

    return {
      tick(dt, t) {
        DebugHUD.perfTick();

        // update rays
        handsApi?.update?.(camera);

        // movement
        apply2DSticks(dt);
        applyXRSelectMove(dt);

        // update ring to follow player on floor
        floorRing.position.set(player.position.x, 0.02, player.position.z);

        DebugHUD.setXR(renderer.xr.isPresenting ? "XR:on" : "XR:off");
        DebugHUD.setPos(`x:${player.position.x.toFixed(2)} y:${player.position.y.toFixed(2)} z:${player.position.z.toFixed(2)}`);
      }
    };
  }
};
