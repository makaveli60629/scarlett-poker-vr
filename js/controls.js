// /js/controls.js — Scarlett Controls v3.6 (FULL)
// - Seat uses seated headset height (no negative-Y hacks)
// - Leave works across multiple Quest button mappings
// - Leave also works via keyboard (L / Esc)
// - Still: seated = no locomotion, only look

export const Controls = {
  init(ctx) {
    const { THREE, renderer, camera, player, world, log } = ctx;

    const state = {
      ctx, THREE, renderer, camera, player, world,
      seated: false,
      seatedAt: null,
      moveEnabled: true,
      enabled: true,
      speed: 2.0,
      snapTurn: Math.PI / 6,
      _keys: new Set(),
      _lastSnap: 0,
      _gpPrev: { left: {}, right: {} },
      seatHeadY: 1.05, // ✅ seated headset height feel
    };

    world.seated = !!world.seated;

    window.addEventListener("keydown", (e) => state._keys.add(e.code));
    window.addEventListener("keyup", (e) => state._keys.delete(e.code));

    function getXRGamepads() {
      const session = renderer?.xr?.getSession?.();
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

    function teleportToSpawn(key, opts = {}) {
      if (ctx.spawns?.apply) return ctx.spawns.apply(key, player, opts);
      const sp = world?.spawns?.[key];
      if (!sp) return false;
      const pos = sp.pos || sp.position || sp;
      const yaw = sp.yaw || 0;
      const standY = opts.standY ?? 1.65;
      player.position.set(pos.x ?? 0, (pos.y ?? 0) + standY, pos.z ?? 0);
      player.rotation.set(0, yaw, 0);
      return true;
    }

    function resetVelocity() {
      if (player?.userData?.velocity?.set) player.userData.velocity.set(0, 0, 0);
    }

    function setEnabled(v) { state.enabled = !!v; }

    // PUBLIC: sit
    function sitAt(spawnKey = "table_seat_1") {
      state.seated = true;
      state.seatedAt = spawnKey;
      state.moveEnabled = false;
      world.seated = true;

      resetVelocity();

      // ✅ seated headset height
      if (!teleportToSpawn(spawnKey, { standY: state.seatHeadY })) {
        teleportToSpawn("lobby_spawn", { standY: 1.65 });
      }

      log?.(`[controls] 🪑 seated @ ${spawnKey} (headY=${state.seatHeadY.toFixed(2)})`);
    }

    // PUBLIC: stand
    function forceStanding(spawnKey = "lobby_spawn") {
      state.seated = false;
      state.seatedAt = null;
      state.moveEnabled = true;
      world.seated = false;

      resetVelocity();
      teleportToSpawn(spawnKey, { standY: 1.65 });

      log?.(`[controls] ✅ standing @ ${spawnKey}`);
    }

    // PUBLIC: leave -> lobby
    function leaveSeat() {
      state.seated = false;
      state.seatedAt = null;
      state.moveEnabled = true;
      world.seated = false;

      resetVelocity();

      // Prefer RoomManager route
      window.dispatchEvent(new CustomEvent("scarlett-leave-table"));
      // Hard fallback
      teleportToSpawn("lobby_spawn", { standY: 1.65 });

      log?.("[controls] ✅ leave -> lobby");
    }

    function moveLocal(dx, dz, dt) {
      const yaw = player.rotation.y;
      const cos = Math.cos(yaw);
      const sin = Math.sin(yaw);
      player.position.x += (dx * cos - dz * sin) * state.speed * dt;
      player.position.z += (dx * sin + dz * cos) * state.speed * dt;
    }

    function update(dt) {
      if (!state.enabled) return;

      // Keyboard escape hatch
      if (state._keys.has("Escape") || state._keys.has("KeyL")) {
        // one-shot
        state._keys.delete("Escape");
        state._keys.delete("KeyL");
        leaveSeat();
      }

      const gps = getXRGamepads();

      // ✅ Leave mappings: try MANY common indices (Quest varies)
      // Right: B (5) / A (4) / secondary (1) / menu-ish (3)
      if (gps.right) {
        const leaveNow =
          buttonPressed(gps.right, 5) || // B
          buttonPressed(gps.right, 4) || // A (sometimes right primary)
          buttonPressed(gps.right, 1) || // secondary
          buttonPressed(gps.right, 3);   // menu-ish
        if (justPressed("right", "leave", leaveNow)) leaveSeat();
      }

      // Left: Y (3) / X (4) / secondary (1) / menu-ish (2)
      if (gps.left) {
        const leaveNow =
          buttonPressed(gps.left, 3) || // Y
          buttonPressed(gps.left, 4) || // X
          buttonPressed(gps.left, 1) || // secondary
          buttonPressed(gps.left, 2);   // menu-ish
        if (justPressed("left", "leave", leaveNow)) leaveSeat();
      }

      // seated => no locomotion
      if (!state.moveEnabled || world.seated) return;

      let dx = 0, dz = 0;
      if (state._keys.has("KeyW") || state._keys.has("ArrowUp")) dz -= 1;
      if (state._keys.has("KeyS") || state._keys.has("ArrowDown")) dz += 1;
      if (state._keys.has("KeyA") || state._keys.has("ArrowLeft")) dx -= 1;
      if (state._keys.has("KeyD") || state._keys.has("ArrowRight")) dx += 1;

      if (dx || dz) moveLocal(dx, dz, dt);

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
    Controls.resetVelocity = resetVelocity;
    Controls.clearMotion = () => {};
    Controls.setEnabled = setEnabled;

    log?.("[controls] init ✅ v3.6 (seat height + robust leave)");
    return Controls;
  },

  update() {},
  teleportToSpawn() { return false; },
  sitAt() {},
  forceStanding() {},
  leaveSeat() {},
  resetVelocity() {},
  clearMotion() {},
  setEnabled() {},
};
