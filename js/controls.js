// /js/controls.js — Scarlett Controls v3.9 (FULL)
// FIXES (v3.9):
// ✅ REAL VR locomotion (thumbsticks) + snap turn (right stick)
// ✅ Prevents "too high" bug: in XR presenting, we DO NOT apply standY to rig
// ✅ Safe world reference: works whether ctx.world exists or ctx IS the world (your World.init returns ctx)
// ✅ Seated mode still locks locomotion, but won’t force crazy Y in XR
// ✅ Robust leave mappings preserved

export const Controls = {
  init(ctx) {
    const { THREE, renderer, player, log } = ctx;
    const world = ctx.world || ctx; // ✅ your World.init returns ctx as the world

    const state = {
      ctx, THREE, renderer, player, world,

      seated: false,
      seatedAt: null,

      moveEnabled: true,
      enabled: true,

      speed: 2.0,            // meters/sec
      strafeSpeed: 2.0,
      snapTurn: Math.PI / 6, // 30°
      _keys: new Set(),
      _lastSnap: 0,

      _gpPrev: { left: {}, right: {} },

      // seated height for NON-XR only
      seatHeadY: 1.05,

      // stick deadzone
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

    // --- core spawn/teleport ---
    function teleportToSpawn(key, opts = {}) {
      // We let SpawnPoints position X/Z/Yaw.
      const ok = ctx.spawns?.apply ? ctx.spawns.apply(key, player, opts) : false;

      // ✅ CRITICAL HEIGHT FIX:
      // In XR (local-floor), rig Y should usually stay 0.
      // If we add standY, we stack on top of headset floor -> "very high / on chair".
      if (isXRPresenting()) {
        player.position.y = 0;
      } else {
        // Non-XR fallback: apply requested standY if provided
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

    function nudgeBackFromTable(spawnKey) {
      const sp = ctx.spawns?.get?.(spawnKey) || ctx.spawns?.map?.[spawnKey];
      if (!sp) return;
      const back = sp.seatBack ?? 0;
      if (!back) return;

      const fwdX = Math.sin(sp.yaw);
      const fwdZ = Math.cos(sp.yaw);

      player.position.x -= fwdX * back;
      player.position.z -= fwdZ * back;

      log?.(`[controls] 🧷 seat nudge back=${back.toFixed(2)} (${spawnKey})`);
    }

    function sitAt(spawnKey = "table_seat_1") {
      state.seated = true;
      state.seatedAt = spawnKey;
      state.moveEnabled = false;
      world.seated = true;

      resetVelocity();

      // NOTE: in XR we will still force rig Y=0 (see teleportToSpawn fix)
      teleportToSpawn(spawnKey, { standY: state.seatHeadY });

      // push you slightly away from table so you’re not “inside” geometry
      nudgeBackFromTable(spawnKey);

      log?.(`[controls] 🪑 seated @ ${spawnKey} (xr=${isXRPresenting()})`);
    }

    function leaveSeat() {
      state.seated = false;
      state.seatedAt = null;
      state.moveEnabled = true;
      world.seated = false;

      resetVelocity();
      window.dispatchEvent(new CustomEvent("scarlett-leave-table"));

      teleportToSpawn("lobby_spawn", { standY: 1.65 });

      log?.("[controls] ✅ leave -> lobby");
    }

    // --- movement helpers ---
    function applyDeadzone(v) {
      const d = state.dead;
      if (Math.abs(v) < d) return 0;
      // remap to keep full range
      const s = (Math.abs(v) - d) / (1 - d);
      return Math.sign(v) * s;
    }

    function moveLocal(dx, dz, dt) {
      // dx = strafe, dz = forward/back (negative = forward)
      const yaw = player.rotation.y;
      const cos = Math.cos(yaw);
      const sin = Math.sin(yaw);

      const vx = (dx * cos - dz * sin);
      const vz = (dx * sin + dz * cos);

      player.position.x += vx * state.speed * dt;
      player.position.z += vz * state.speed * dt;
    }

    function snapTurn(dir /* -1 or +1 */) {
      const now = performance.now();
      if (now - state._lastSnap < 180) return;
      player.rotation.y += dir * state.snapTurn;
      state._lastSnap = now;
    }

    function update(dt) {
      if (!state.enabled) return;

      // keyboard escape hatch
      if (state._keys.has("Escape") || state._keys.has("KeyL")) {
        state._keys.delete("Escape");
        state._keys.delete("KeyL");
        leaveSeat();
      }

      const gps = getXRGamepads();

      // robust leave mappings (Quest varies)
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

      // ✅ keep XR height sane always
      if (isXRPresenting()) player.position.y = 0;

      // seated => no locomotion
      if (!state.moveEnabled || world.seated) return;

      // ---- KEYBOARD movement (desktop) ----
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

      // ---- VR THUMBSTICK locomotion ----
      // Most Quest profiles:
      // left stick: axes[2]=x, axes[3]=y  OR axes[0]=x, axes[1]=y (depends)
      // right stick: other pair
      if (gps.left?.axes?.length) {
        // choose the pair with bigger magnitude (works across mappings)
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

        // snap turn on right stick X
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

    log?.("[controls] init ✅ v3.9 (VR locomotion + XR height fix)");
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
