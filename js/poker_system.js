// /js/poker_system.js — PokerSystem v1 (Smooth Bezier Deal + Flip + Chip Bet)
// ✅ Called from world.js update loop (no requestAnimationFrame spam)

export const PokerSystem = (() => {
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = (t) => (t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2)/2);

  const bezier2 = (out, p0, p1, p2, t) => {
    const a = (1 - t) * (1 - t);
    const b = 2 * (1 - t) * t;
    const c = t * t;
    out.set(
      p0.x*a + p1.x*b + p2.x*c,
      p0.y*a + p1.y*b + p2.y*c,
      p0.z*a + p1.z*b + p2.z*c
    );
    return out;
  };

  function makeCardMesh(THREE, textures = {}) {
    const geo = new THREE.BoxGeometry(0.062, 0.0016, 0.092);

    // If you later add textures, you can swap material here safely.
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.65, metalness: 0.05 });

    const card = new THREE.Mesh(geo, mat);
    return card;
  }

  function makeChipMesh(THREE, color = 0xffd36b) {
    const geo = new THREE.CylinderGeometry(0.022, 0.022, 0.010, 18);
    const mat = new THREE.MeshStandardMaterial({
      color, roughness: 0.45, metalness: 0.25,
      emissive: new THREE.Color(color), emissiveIntensity: 0.12
    });
    const chip = new THREE.Mesh(geo, mat);
    chip.rotation.x = Math.PI / 2;
    return chip;
  }

  return {
    init(ctx, opt = {}) {
      const { THREE, root, scene, log } = ctx;

      const state = {
        THREE,
        root: root || scene,
        tableCenter: opt.tableCenter || new THREE.Vector3(0, 0.95, -9.5),
        deckPos: opt.deckPos || null,
        potPos: opt.potPos || null,

        seats: [],
        nextSeat: 0,

        cards: [],
        chips: [],
        motions: [],

        tmpV: new THREE.Vector3(),
        tmpQ: new THREE.Quaternion(),

        dealHop: opt.dealHop ?? 0.16,
        dealDur: opt.dealDur ?? 0.52,
        flipDur: opt.flipDur ?? 0.38,
        chipDur: opt.chipDur ?? 0.45
      };

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

      // Seats around table
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

      // Deck placeholder
      const deck = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.06, 0.26),
        new THREE.MeshStandardMaterial({ color: 0x0a1020, roughness: 0.6, metalness: 0.2 })
      );
      deck.position.copy(state.deckPos);
      state.root.add(deck);

      log?.("[poker] PokerSystem init ✅");

      const api = {
        dealNext() {
          const seat = state.seats[state.nextSeat % state.seats.length];
          state.nextSeat++;
          return api.dealTo(seat.pos, seat.yaw);
        },

        dealToSeat(i) {
          const seat = state.seats[(i|0) % state.seats.length];
          return api.dealTo(seat.pos, seat.yaw);
        },

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
            p0: state.deckPos.clone(),
            p1: state.deckPos.clone().lerp(targetPos, 0.5).add(new THREE.Vector3(0, state.dealHop, 0)),
            p2: targetPos.clone(),
            q0: card.quaternion.clone(),
            q1: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, targetYaw, 0)),
            finalYaw: targetYaw,
            doFlip: true
          };

          state.motions.push(job);
          return card;
        },

        bet(amount = 1, seatIndex = 0) {
          const seat = state.seats[(seatIndex|0) % state.seats.length];

          // value colors (simple)
          const color = amount >= 100 ? 0xffd36b : amount >= 25 ? 0x66ccff : 0xff6bd6;

          const chip = makeChipMesh(THREE, color);
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
            p0: chip.position.clone(),
            p1: chip.position.clone().lerp(state.potPos, 0.5).add(new THREE.Vector3(0, 0.18, 0)),
            p2: state.potPos.clone(),
          };

          state.motions.push(job);
          log?.(`[poker] bet ${amount} -> pot`);
          return chip;
        },

        update(dt, t) {
          for (let i = state.motions.length - 1; i >= 0; i--) {
            const m = state.motions[i];
            if (!m.active) { state.motions.splice(i, 1); continue; }

            m.t += dt;
            const u = clamp01(m.t / m.duration);
            const eu = easeInOut(u);

            if (m.kind === "card") {
              bezier2(state.tmpV, m.p0, m.p1, m.p2, eu);
              m.obj.position.copy(state.tmpV);

              state.tmpQ.copy(m.q0).slerp(m.q1, eu);
              m.obj.quaternion.copy(state.tmpQ);

              // travel tilt + end flip
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

      return api;
    }
  };
})();
