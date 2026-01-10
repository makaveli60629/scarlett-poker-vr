// /js/controls.js — Scarlett Controls v4.0 (FULL)
// FIXES (v4.0):
// ✅ Works with BOTH systems:
//    - old SpawnPoints (ctx.spawns.apply)
//    - new World anchors (world.movePlayerTo / world.seatPlayer)
// ✅ Keeps REAL VR locomotion + snap turn + XR height fix
// ✅ Seated mode locks locomotion without breaking XR height
// ✅ Leave mapping is deliberate (press+hold style using "justPressed" still works)
// ✅ leaveSeat() routes through RoomManager when available (ctx.rooms.setRoom)

export const Controls = {
  init(ctx) {
    const { THREE, renderer, player, log } = ctx;
    const world = ctx.world || ctx; // some builds return ctx as world

    const state = {
      ctx, THREE, renderer, player, world,

      seated: false,
      seatedAt: null,

      moveEnabled: true,
      enabled: true,

      speed: 2.0,
      strafeSpeed: 2.0,
      snapTurn: Math.PI / 6, // 30°
      _keys: new Set(),
      _lastSnap: 0,

      _gpPrev: { left: {}, right: {} },

      // seated height for NON-XR only
      seatHeadY: 1.05,

      dead: 0.18,
    };

    // mirror seated flag safely
    world.seated = !!world.seated;

    window.addEventListener("keydown", (e) => state._keys.add(e.code));
    window.addEventListener("keyup", (e) => state._keys.delete(e.code));

    function isXRPresenting() {
      try { return !!renderer?.xr?.isPresenting; } catch { return false; }
    }

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

    function resetVelocity() {
      if (player?.userData?.velocity?.set) player.userData.velocity.set(0, 0, 0);
    }

    function setEnabled(v) { state.enabled = !!v; }

    // ---------------- spawn / teleport compatibility ----------------
    function teleportToSpawn(key, opts = {}) {
      let ok = false;

      // Old system: SpawnPoints
      if (ctx.spawns?.apply) {
        ok = !!ctx.spawns.apply(key, player, opts);
      }
      // New system: World anchors
      else if (world?.movePlayerTo) {
        world.movePlayerTo(key, ctx);
        ok = true;
      }

      // Height fix:
      if (isXRPresenting()) {
        player.position.y = 0;
      } else {
        if (typeof opts.standY === "number") player.position.y = opts.standY;
      }

      return ok;
    }

    function forceStanding(spawnKey = "lobby_spawn") {
      state.seated = false;
      state.seatedAt = null;
      state.moveEnabled = true;
      world.seated = false;

      resetVelocity();
      teleportToSpawn(spawnKey, { standY: 1.65 });

      log?.(`[controls] ✅ standing @ ${spawnKey} (xr=${isXRPresenting()})`);
    }

    // New seating path: use world.seatPlayer when possible
    function sitAt(where = "scorpion", seatIndex = 0) {
      state.seated = true;
      state.seatedAt = `${where}:${seatIndex}`;
      state.moveEnabled = false;
      world.seated = true;

      resetVelocity();

      if (world?.seatPlayer && where === "scorpion") {
        world.seatPlayer(seatIndex, ctx);
      } else {
        // fallback to old spawn key style
        teleportToSpawn(where, { standY: state.seatHeadY });
      }

      log?.(`[controls] 🪑 seated @ ${state.seatedAt} (xr=${isXRPresenting()})`);
    }

    function leaveSeat() {
      state.seated = false;
      state.seatedAt = null;
      state.moveEnabled = true;
      world.seated = false;

      resetVelocity();
      window.dispatchEvent(new CustomEvent("scarlett-leave-table"));

      // Prefer RoomManager to return you to lobby (also turns off scorpion room)
      if (ctx.rooms?.setRoom) {
        ctx.rooms.setRoom(ctx, "lobby");
      } else {
        teleportToSpawn("lobby_spawn", { standY: 1.65 });
      }

      log?.("[controls] ✅ leave -> lobby");
    }

    // ---------------- movement helpers ----------------
    function applyDeadzone(v) {
      const d = state.dead;
      if (Math.abs(v) < d) return 0;
      const s = (Math.abs(v) - d) / (1 - d);
      return Math.sign(v) * s;
    }

    function moveLocal(dx, dz, dt) {
      const yaw = player.rotation.y;
      const cos = Math.cos(yaw);
      const sin = Math.sin(yaw);

      const vx = (dx * cos - dz * sin);
      const vz = (dx * sin + dz * cos);

      player.position.x += vx * state.speed * dt;
      player.position.z += vz * state.speed * dt;
    }

    function snapTurn(dir) {
      const now = performance.now();
      if (now - state._lastSnap < 180) return;
      player.rotation.y += dir * state.snapTurn;
      state._lastSnap = now;
    }

    function update(dt) {
      if (!state.enabled) return;

      // keyboard leave
      if (state._keys.has("Escape") || state._keys.has("KeyL")) {
        state._keys.delete("Escape");
        state._keys.delete("KeyL");
        leaveSeat();
      }

      const gps = getXRGamepads();

      // Leave mapping: keep it deliberate, but preserve your robust mappings
      if (gps.right) {
        const leaveNow =
          buttonPressed(gps.right, 5) || // B
          buttonPressed(gps.right, 4) || // A
          buttonPressed(gps.right, 1) ||
          buttonPressed(gps.right, 3) ||
          buttonPressed(gps.right, 2);
        if (justPressed("right", "leave", leaveNow)) leaveSeat();
      }
      if (gps.left) {
        const leaveNow =
          buttonPressed(gps.left, 3) || // Y
          buttonPressed(gps.left, 4) || // X
          buttonPressed(gps.left, 1) ||
          buttonPressed(gps.left, 2) ||
          buttonPressed(gps.left, 0);
        if (justPressed("left", "leave", leaveNow)) leaveSeat();
      }

      // XR height sanity always
      if (isXRPresenting()) player.position.y = 0;

      // seated => no locomotion
      if (!state.moveEnabled || world.seated) return;

      // Keyboard locomotion (desktop)
      let kdx = 0, kdz = 0;
      if (state._keys.has("KeyW") || state._keys.has("ArrowUp")) kdz -= 1;
      if (state._keys.has("KeyS") || state._keys.has("ArrowDown")) kdz += 1;
      if (state._keys.has("KeyA") || state._keys.has("ArrowLeft")) kdx -= 1;
      if (state._keys.has("KeyD") || state._keys.has("ArrowRight")) kdx += 1;

      if (kdx || kdz) moveLocal(kdx, kdz, dt);

      // keyboard snap turn
      const now = performance.now();
      if (now - state._lastSnap > 180) {
        if (state._keys.has("KeyQ")) snapTurn(+1);
        if (state._keys.has("KeyE")) snapTurn(-1);
      }

      // VR thumbstick locomotion
      if (gps.left?.axes?.length) {
        const ax = gps.left.axes;
        const pairA = { x: ax[0] ?? 0, y: ax[1] ?? 0 };
        const pairB = { x: ax[2] ?? 0, y: ax[3] ?? 0 };
        const magA = pairA.x * pairA.x + pairA.y * pairA.y;
        const magB = pairB.x * pairB.x + pairB.y * pairB.y;
        const stick = magB > magA ? pairB : pairA;

        const sx = applyDeadzone(stick.x);
        const sy = applyDeadzone(stick.y);

        // forward is -y
        if (sx || sy) {
          moveLocal(sx * state.strafeSpeed / state.speed, sy, dt);
        }
      }

      if (gps.right?.axes?.length) {
        const ax = gps.right.axes;
        const pairA = { x: ax[0] ?? 0, y: ax[1] ?? 0 };
        const pairB = { x: ax[2] ?? 0, y: ax[3] ?? 0 };
        const magA = pairA.x * pairA.x + pairA.y * pairA.y;
        const magB = pairB.x * pairB.x + pairB.y * pairB.y;
        const stick = magB > magA ? pairB : pairA;

        const rx = applyDeadzone(stick.x);

        if (rx > 0.75) snapTurn(-1);
        if (rx < -0.75) snapTurn(+1);
      }
    }

    // publish API
    Controls.update = update;
    Controls.teleportToSpawn = teleportToSpawn;
    Controls.sitAt = sitAt;
    Controls.forceStanding = forceStanding;
    Controls.leaveSeat = leaveSeat;
    Controls.resetVelocity = resetVelocity;
    Controls.clearMotion = () => {};
    Controls.setEnabled = setEnabled;

    log?.("[controls] init ✅ v4.0 (anchors + seating compatible)");
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
