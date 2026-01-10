// /js/controls.js — Scarlett Controls v3.3 (FULL)
// Fixes/Adds:
// - Adds seat state + Leave Seat action (B/Y)
// - Exposes Controls.leaveSeat()
// - Prevents double XR start issues (does not touch animationLoop)

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
      seatedAt: null,      // spawn key or seat key
      moveEnabled: true,
      speed: 2.0,
      snapTurn: Math.PI / 6,
      _keys: new Set(),
      _lastSnap: 0,
      _gpPrev: { left: {}, right: {} },
    };

    world.seated = world.seated ?? false;

    // Basic keyboard move (desktop fallback)
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

    function teleportToSpawn(key) {
      const sp = world?.spawns?.[key];
      if (!sp) return false;
      player.position.set(sp.pos.x, sp.pos.y, sp.pos.z);
      player.rotation.set(0, sp.yaw || 0, 0);
      return true;
    }

    // PUBLIC: join seat
    function sitAt(spawnKey = "table_seat_1") {
      state.seated = true;
      state.seatedAt = spawnKey;
      state.moveEnabled = false;
      world.seated = true;

      // teleport to seat if available
      if (!teleportToSpawn(spawnKey)) {
        // fallback to lobby_spawn
        teleportToSpawn("lobby_spawn");
      }

      log?.(`[controls] 🪑 seated @ ${spawnKey}`);
    }

    // PUBLIC: leave seat
    function leaveSeat() {
      if (!state.seated && !world.seated) return;

      state.seated = false;
      state.seatedAt = null;
      state.moveEnabled = true;
      world.seated = false;

      // If poker sim exists, return to lobby table by default
      ctx.poker?.setTable?.("lobby");

      // teleport to lobby standing spawn
      if (!teleportToSpawn("lobby_spawn")) {
        // fallback spectator
        teleportToSpawn("spectator");
      }

      log?.("[controls] ✅ left seat (standing)");
    }

    function moveLocal(dx, dz, dt) {
      // move relative to camera yaw
      const yaw = player.rotation.y;
      const cos = Math.cos(yaw);
      const sin = Math.sin(yaw);
      const vx = (dx * cos - dz * sin) * state.speed * dt;
      const vz = (dx * sin + dz * cos) * state.speed * dt;
      player.position.x += vx;
      player.position.z += vz;
    }

    function update(dt) {
      // XR buttons
      const gps = getXRGamepads();

      // Leave seat mappings:
      // - Right controller B is typically buttons[5] on Oculus Touch
      // - Left controller Y is typically buttons[3]
      // These vary a bit, so we watch both common indices.
      if (gps.right) {
        const b = buttonPressed(gps.right, 5) || buttonPressed(gps.right, 1); // B or secondary
        if (justPressed("right", "leave", b)) leaveSeat();
      }
      if (gps.left) {
        const y = buttonPressed(gps.left, 3) || buttonPressed(gps.left, 1); // Y or secondary
        if (justPressed("left", "leave", y)) leaveSeat();
      }

      // If seated: we don't allow movement (but still allow look)
      if (!state.moveEnabled || world.seated) return;

      // Desktop movement
      let dx = 0, dz = 0;
      if (state._keys.has("KeyW") || state._keys.has("ArrowUp")) dz -= 1;
      if (state._keys.has("KeyS") || state._keys.has("ArrowDown")) dz += 1;
      if (state._keys.has("KeyA") || state._keys.has("ArrowLeft")) dx -= 1;
      if (state._keys.has("KeyD") || state._keys.has("ArrowRight")) dx += 1;

      if (dx || dz) moveLocal(dx, dz, dt);

      // Snap turn (Q/E)
      const now = performance.now();
      if (now - state._lastSnap > 180) {
        if (state._keys.has("KeyQ")) { player.rotation.y += state.snapTurn; state._lastSnap = now; }
        if (state._keys.has("KeyE")) { player.rotation.y -= state.snapTurn; state._lastSnap = now; }
      }
    }

    // expose API
    Controls.update = update;
    Controls.teleportToSpawn = teleportToSpawn;
    Controls.sitAt = sitAt;
    Controls.leaveSeat = leaveSeat;

    log?.("[controls] init ✅ (no animationLoop; main drives update())");
    return Controls;
  },

  // these will be assigned in init
  update() {},
  teleportToSpawn() { return false; },
  sitAt() {},
  leaveSeat() {},
};
