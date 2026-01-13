// /js/poker_system.js — PokerSystem v1.0 (Smooth Dealing + Bezier + Flip + Event Chips)
// ✅ Modular: init(ctx,opt) + update(dt,t) + deal/bet APIs
// ✅ NO per-card requestAnimationFrame loops (uses world.update)
// ✅ Works with controllers NOW; can switch to hand-only gestures later without rewriting motion

export const PokerSystem = (() => {
  // -----------------------
  // Helpers
  // -----------------------
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  // frame-rate independent smooth approach
  const damp = (current, target, lambda, dt) => {
    const k = 1 - Math.exp(-lambda * dt);
    return current + (target - current) * k;
  };

  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  // Quadratic Bezier
  const bezier2 = (out, p0, p1, p2, t) => {
    const a = (1 - t) * (1 - t);
    const b = 2 * (1 - t) * t;
    const c = t * t;
    out.set(
      p0.x * a + p1.x * b + p2.x * c,
      p0.y * a + p1.y * b + p2.y * c,
      p0.z * a + p1.z * b + p2.z * c
    );
    return out;
  };

  // Haptics (safe / optional)
  function pulseHaptics(controller, strength = 0.2, durationMs = 18) {
    try {
      const gp = controller?.inputSource?.gamepad;
      const act = gp?.hapticActuators?.[0];
      if (act?.pulse) act.pulse(strength, durationMs);
    } catch {}
  }

  // Card mesh (swap to atlas later)
  function makeCardMesh(THREE) {
    const geo = new THREE.BoxGeometry(0.062, 0.0016, 0.092);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.65,
      metalness: 0.05
    });
    const card = new THREE.Mesh(geo, mat);
    card.castShadow = false;
    card.receiveShadow = false;
    return card;
  }

  function makeChipMesh(THREE, color = 0xffd36b) {
    const geo = new THREE.CylinderGeometry(0.022, 0.022, 0.010, 18);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.45,
      metalness: 0.25,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.12
    });
    const chip = new THREE.Mesh(geo, mat);
    chip.rotation.x = Math.PI / 2;
    return chip;
  }

  function startBezierMove(job, fromPos, toPos, hop = 0.12) {
    job.t = 0;
    job.duration = Math.max(0.28, job.duration || 0.55);

    job.p0.copy(fromPos);
    job.p2.copy(toPos);

    job.p1.copy(fromPos).lerp(toPos, 0.5);
    job.p1.y += hop;

    job.active = true;
  }

  // Optional trigger-zone scaffold (for check/fold/raise later)
  function makeZone(THREE, label, size, pos) {
    const g = new THREE.BoxGeometry(size.x, size.y, size.z);
    const m = new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.06 });
    const box = new THREE.Mesh(g, m);
    box.position.copy(pos);
    box.userData.zoneLabel = label;
    return box;
  }

  // -----------------------
  // Module
  // -----------------------
  return {
    init(ctx, opt = {}) {
      const { THREE, root, scene, log, controllers } = ctx;

      const state = {
        THREE,
        root: root || scene,

        tableCenter: opt.tableCenter || new THREE.Vector3(0, 0.95, -9.5),
        deckPos: opt.deckPos || null,
        potPos: opt.potPos || null,

        // items
        cards: [],
        chips: [],
        motions: [],

        // seats
        seats: [],
        nextSeat: 0,

        // zones scaffold
        zones: [],

        // temps
        tmpV: new THREE.Vector3(),
        tmpV2: new THREE.Vector3(),
        tmpQ: new THREE.Quaternion(),
        tmpQ2: new THREE.Quaternion(),

        // config
        dealHop: opt.dealHop ?? 0.16,
        dealDur: opt.dealDur ?? 0.52,
        flipDur: opt.flipDur ?? 0.38,
        chipDur: opt.chipDur ?? 0.45
      };

      // derived defaults
      state.deckPos = opt.deckPos || new THREE.Vector3(
        state.tableCenter.x - 1.1,
        state.tableCenter.y + 0.10,
        state.tableCenter.z - 0.05
      );

      state.potPos = opt.potPos || new THREE.Vector3(
        state.tableCenter.x,
        state.tableCenter.y + 0.06,
        state.tableCenter.z + 0.10
      );

      // build seats around table
      const seatR = opt.seatRadius ?? 2.35;
      const seatCount = opt.seatCount ?? 6;

      for (let i = 0; i < seatCount; i++) {
        const ang = (i / seatCount) * Math.PI * 2 + Math.PI;
        const pos = new THREE.Vector3(
          state.tableCenter.x + Math.cos(ang) * seatR,
          state.tableCenter.y + 0.05,
          state.tableCenter.z + Math.sin(ang) * seatR
        );
        const yaw = -ang + Math.PI / 2;
        state.seats.push({ pos, yaw });
      }

      // deck placeholder
      const deck = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.06, 0.26),
        new THREE.MeshStandardMaterial({ color: 0x0a1020, roughness: 0.6, metalness: 0.2 })
      );
      deck.position.copy(state.deckPos);
      state.root.add(deck);

      // trigger zones (optional)
      if (opt.enableZones ?? true) {
        const zY = state.tableCenter.y + 0.02;
        const zSize = new THREE.Vector3(0.42, 0.10, 0.28);

        const zCheck = makeZone(THREE, "CHECK", zSize, new THREE.Vector3(state.tableCenter.x - 0.55, zY, state.tableCenter.z + 1.65));
        const zFold  = makeZone(THREE, "FOLD",  zSize, new THREE.Vector3(state.tableCenter.x + 0.00, zY, state.tableCenter.z + 1.65));
        const zRaise = makeZone(THREE, "RAISE", zSize, new THREE.Vector3(state.tableCenter.x + 0.55, zY, state.tableCenter.z + 1.65));

        state.zones.push(zCheck, zFold, zRaise);
        state.root.add(zCheck, zFold, zRaise);
      }

      const api = {
        // Deal to next seat
        dealNext() {
          const seat = state.seats[state.nextSeat % state.seats.length];
          state.nextSeat++;
          return api.dealTo(seat.pos, seat.yaw);
        },

        // Deal to seat index
        dealToSeat(i) {
          const seat = state.seats[(i | 0) % state.seats.length];
          return api.dealTo(seat.pos, seat.yaw);
        },

        // Core deal (Bezier + flip)
        dealTo(targetPos, targetYaw) {
          const card = makeCardMesh(THREE);
          card.position.copy(state.deckPos);
          card.rotation.set(0, 0, 0);
          state.root.add(card);
          state.cards.push(card);

          const job = {
            kind: "card",
            obj: card,
            active: true,

            t: 0,
            duration: state.dealDur,

            p0: new THREE.Vector3(),
            p1: new THREE.Vector3(),
            p2: new THREE.Vector3(),

            q0: new THREE.Quaternion(),
            q1: new THREE.Quaternion(),

            finalYaw: targetYaw,
            doFlip: true,
            flipDur: state.flipDur
          };

          job.p0.copy(state.deckPos);
          job.p2.copy(targetPos);

          job.p1.copy(state.deckPos).lerp(targetPos, 0.5);
          job.p1.y += state.dealHop;

          job.q0.copy(card.quaternion);
          state.tmpQ.setFromEuler(new THREE.Euler(0, targetYaw, 0));
          job.q1.copy(state.tmpQ);

          state.motions.push(job);

          // light haptics
          pulseHaptics(controllers?.c1, 0.16, 16);
          return card;
        },

        // Chip bet (Bezier hop to pot)
        bet(amount = 1, seatIndex = 0) {
          const seat = state.seats[(seatIndex | 0) % state.seats.length];

          const chip = makeChipMesh(THREE, 0xffd36b);
          chip.position.copy(seat.pos);
          chip.position.y += 0.04;
          chip.position.add(new THREE.Vector3(0, 0, -0.25));
          state.root.add(chip);
          state.chips.push(chip);

          const job = {
            kind: "chip",
            obj: chip,
            active: true,
            t: 0,
            duration: state.chipDur,
            p0: new THREE.Vector3(),
            p1: new THREE.Vector3(),
            p2: new THREE.Vector3()
          };

          startBezierMove(job, chip.position, state.potPos, 0.18);
          state.motions.push(job);

          pulseHaptics(controllers?.c0, 0.10, 14);
          pulseHaptics(controllers?.c1, 0.10, 14);

          log?.(`[poker] bet amount=${amount} -> pot`);
          return chip;
        },

        // Optional: test zone by ray (controller-based for now)
        testZonesByController(hand = "left") {
          if (!state.zones.length) return null;

          const ctrl = hand === "right" ? controllers?.c1 : controllers?.c0;
          if (!ctrl) return null;

          // do a raycast
          const raycaster = opt.raycaster || new THREE.Raycaster();
          const tmpM = new THREE.Matrix4();
          const tmpV = new THREE.Vector3();
          const tmpDir = new THREE.Vector3();

          tmpM.identity().extractRotation(ctrl.matrixWorld);
          const origin = tmpV.setFromMatrixPosition(ctrl.matrixWorld);
          tmpDir.set(0, 0, -1).applyMatrix4(tmpM).normalize();

          raycaster.set(origin, tmpDir);
          const hits = raycaster.intersectObjects(state.zones, false);
          if (!hits.length) return null;

          return hits[0].object?.userData?.zoneLabel || null;
        },

        // Main update (call from world.update)
        update(dt, t) {
          for (let i = state.motions.length - 1; i >= 0; i--) {
            const m = state.motions[i];
            if (!m.active) { state.motions.splice(i, 1); continue; }

            m.t += dt;
            const u = clamp01(m.t / m.duration);
            const eu = easeInOut(u);

            if (m.kind === "card") {
              // position
              bezier2(state.tmpV, m.p0, m.p1, m.p2, eu);
              m.obj.position.copy(state.tmpV);

              // rotation
              state.tmpQ.copy(m.q0).slerp(m.q1, eu);
              m.obj.quaternion.copy(state.tmpQ);

              // traveling tilt + premium end flip
              if (m.doFlip) {
                const flipStart = 0.55;
                if (u >= flipStart) {
                  const fu = clamp01((u - flipStart) / (1 - flipStart));
                  const fe = easeInOut(fu);
                  m.obj.rotation.x = lerp(Math.PI * 0.85, 0, fe);
                } else {
                  m.obj.rotation.x = lerp(0.20, Math.PI * 0.85, u / flipStart);
                }
              }

              if (u >= 1) {
                m.obj.position.copy(m.p2);
                m.obj.rotation.set(0, m.finalYaw, 0);
                m.active = false;
                pulseHaptics(controllers?.c1, 0.08, 10);
              }
            }

            if (m.kind === "chip") {
              bezier2(state.tmpV, m.p0, m.p1, m.p2, eu);
              m.obj.position.copy(state.tmpV);
              m.obj.rotation.z += dt * 4.0;

              if (u >= 1) {
                m.obj.position.copy(m.p2);
                m.active = false;
              }
            }
          }
        }
      };

      log?.("[poker] PokerSystem v1 init ✅ (smooth bezier + flip)");
      return api;
    }
  };
})();
