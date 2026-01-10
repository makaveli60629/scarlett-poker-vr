// /js/controls.js — Scarlett Controls v3.5 (FULL)
// Scorpion = seated, no locomotion.
// Leave seat (B/Y) => go back to lobby (standing).

export const Controls = {
  init(ctx) {
    const { THREE, renderer, camera, player, world, log } = ctx;

    const state = {
      ctx,
      THREE,
      renderer,
      camera,
      player,
      world,
      seated: false,
      seatedAt: null,
      moveEnabled: true,
      enabled: true,
      speed: 2.0,
      snapTurn: Math.PI / 6,
      _keys: new Set(),
      _lastSnap: 0,
      _gpPrev: { left: {}, right: {} },
    };

    world.seated = !!world.seated;

    // Keyboard fallback
    window.addEventListener("keydown", (e) => state._keys.add(e.code));
    window.addEventListener("keyup", (e) => state._keys.delete(e.code));

    function getXRGamepads() {
      const xr = renderer?.xr;
      const session = xr?.getSession?.();
      const sources = session?.inputSources || [];
      let left = null, right = null;
      for (const s of sources) {
        const gp = s.gamepad;
        if (!gp) continue;
        if (s.handedness === "left") left = gp;
        if (s.handedness === "right") right = gp;
      }
      return { left, right };
    }

    function buttonPressed(gp, idx) {
      const b = gp?.buttons?.[idx];
      return !!(b && (b.pressed || b.value > 0.75));
    }

    function justPressed(hand, name, isDownNow) {
      const prev = state._gpPrev[hand]?.[name] || false;
      state._gpPrev[hand][name] = !!isDownNow;
      return !!isDownNow && !prev;
    }

    // NEW SpawnPoints system first, legacy second
    function teleportToSpawn(key, opts = {}) {
      if (ctx.spawns?.apply) {
        return ctx.spawns.apply(key, player, { standY: opts.standY ?? 1.65 });
      }
      const sp = world?.spawns?.[key];
      if (!sp) return false;
      const pos = sp.pos || sp.position || sp;
      const yaw = sp.yaw || 0;
      const standY = opts.standY ?? 1.65;
      const y = (pos.y ?? 0) + standY;
      player.position.set(pos.x ?? 0, y, pos.z ?? 0);
      player.rotation.set(0, yaw, 0);
      return true;
    }

    function resetVelocity() {
      if (player?.userData?.velocity?.set) player.userData.velocity.set(0, 0, 0);
    }

    // PUBLIC: sit
    function sitAt(spawnKey = "table_seat_1") {
      state.seated = true;
      state.seatedAt = spawnKey;
      state.moveEnabled = false;
      world.seated = true;

      resetVelocity();

      // seat spawns should already have correct y; we do standY=0
      if (!teleportToSpawn(spawnKey, { standY: 0.0 })) {
        teleportToSpawn("lobby_spawn", { standY: 1.65 });
      }

      log?.(`[controls] 🪑 seated @ ${spawnKey}`);
    }

    // PUBLIC: standing
    function forceStanding(spawnKey = "lobby_spawn") {
      state.seated = false;
      state.seatedAt = null;
      state.moveEnabled = true;
      world.seated = false;

      resetVelocity();
      teleportToSpawn(spawnKey, { standY: 1.65 });

      log?.(`[controls] ✅ standing @ ${spawnKey}`);
    }

    // PUBLIC: leave seat => LOBBY
    function leaveSeat() {
      // If we're seated, leave. If not seated, still allow as "panic exit"
      state.seated = false;
      state.seatedAt = null;
      state.moveEnabled = true;
      world.seated = false;

      resetVelocity();

      // Route through RoomManager if present
      window.dispatchEvent(new CustomEvent("scarlett-leave-table"));

      // Also directly place at lobby spawn as a fallback
      teleportToSpawn("lobby_spawn", { standY: 1.65 });

      log?.("[controls] ✅ leave -> lobby");
    }

    function moveLocal(dx, dz, dt) {
      const yaw = player.rotation.y;
      const cos = Math.cos(yaw);
      const sin = Math.sin(yaw);
      const vx = (dx * cos - dz * sin) * state.speed * dt;
      const vz = (dx * sin + dz * cos) * state.speed * dt;
      player.position.x += vx;
      player.position.z += vz;
    }

    function update(dt) {
      if (!state.enabled) return;

      const gps = getXRGamepads();

      // Leave table:
      // Right B is often buttons[5], left Y is often buttons[3]
      if (gps.right) {
        const b = buttonPressed(gps.right, 5) || buttonPressed(gps.right, 1);
        if (justPressed("right", "leave", b)) leaveSeat();
      }
      if (gps.left) {
        const y = buttonPressed(gps.left, 3) || buttonPressed(gps.left, 1);
        if (justPressed("left", "leave", y)) leaveSeat();
      }

      // If seated: NO locomotion, only look around
      if (!state.moveEnabled || world.seated) return;

      // Desktop move
      let dx = 0, dz = 0;
      if (state._keys.has("KeyW") || state._keys.has("ArrowUp")) dz -= 1;
      if (state._keys.has("KeyS") || state._keys.has("ArrowDown")) dz += 1;
      if (state._keys.has("KeyA") || state._keys.has("ArrowLeft")) dx -= 1;
      if (state._keys.has("KeyD") || state._keys.has("ArrowRight")) dx += 1;

      if (dx || dz) moveLocal(dx, dz, dt);

      // snap turn
      const now = performance.now();
      if (now - state._lastSnap > 180) {
        if (state._keys.has("KeyQ")) { player.rotation.y += state.snapTurn; state._lastSnap = now; }
        if (state._keys.has("KeyE")) { player.rotation.y -= state.snapTurn; state._lastSnap = now; }
      }
    }

    Controls.update = update;
    Controls.teleportToSpawn = teleportToSpawn;
    Controls.sitAt = sitAt;
    Controls.forceStanding = forceStanding;
    Controls.leaveSeat = leaveSeat;

    log?.("[controls] init ✅ v3.5 (seat/leave scorpion ready)");
    return Controls;
  },

  update() {},
  teleportToSpawn() { return false; },
  sitAt() {},
  forceStanding() {},
  leaveSeat() {},
};
