// js/dealingMix.js
import * as THREE from "three";

export const DealingMix = {
  init: function (opts) {
    const scene = opts.scene;
    const tablePos = opts.tablePos || new THREE.Vector3(0, 0, 0);
    const seats = opts.seats || [];
    const HUD = opts.HUD;

    // ===== Table anchors =====
    const deckPos = new THREE.Vector3(tablePos.x + 0.65, tablePos.y + 0.93, tablePos.z + 0.15);

    // 5 community slots (center line)
    const comm = [];
    for (let i = 0; i < 5; i++) {
      comm.push(new THREE.Vector3(
        tablePos.x + (-0.30 + i * 0.15),
        tablePos.y + 0.93,
        tablePos.z + 0.00
      ));
    }

    // ===== Card Factory =====
    function makeCard(color) {
      const g = new THREE.Group();
      g.name = "card";

      const w = 0.065;
      const h = 0.090;
      const t = 0.002;

      const front = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0.0 })
      );
      front.position.z = t / 2;

      const back = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshStandardMaterial({ color: color, roughness: 0.6, metalness: 0.0 })
      );
      back.rotation.y = Math.PI;
      back.position.z = -t / 2;

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, t),
        new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 })
      );

      g.add(body);
      g.add(front);
      g.add(back);

      g.rotation.x = -Math.PI / 2; // lay flat on table
      return g;
    }

    // Slightly different back color per dealt card to look varied
    const backColors = [0x2b7cff, 0x6bff8f, 0xffcc00, 0xff6b6b, 0xffffff];

    // ===== Dealing Queue =====
    const queue = []; // each item: { obj, from, to, t, dur, rotFrom, rotTo, onDone }
    const activeCards = [];
    let started = false;
    let phase = 0;
    let dealing = false;

    function lerpVec(out, a, b, t) {
      out.set(
        a.x + (b.x - a.x) * t,
        a.y + (b.y - a.y) * t,
        a.z + (b.z - a.z) * t
      );
    }

    function easeOutCubic(t) {
      const p = 1 - Math.pow(1 - t, 3);
      return p;
    }

    function enqueueMove(obj, from, to, dur, rotFrom, rotTo, onDone) {
      queue.push({
        obj: obj,
        from: from.clone(),
        to: to.clone(),
        t: 0,
        dur: Math.max(0.12, dur),
        rotFrom: rotFrom ? rotFrom.clone() : null,
        rotTo: rotTo ? rotTo.clone() : null,
        onDone: onDone || null
      });
    }

    function seatCardTarget(seatIndex, cardIndex) {
      // cardIndex 0 or 1
      const s = seats[seatIndex];
      const base = s.pos.clone();

      // Move from chair location inward toward table edge
      const inward = new THREE.Vector3(-base.x, 0, -base.z);
      if (inward.length() < 0.001) inward.set(0, 0, -1);
      inward.normalize().multiplyScalar(0.52);

      // Place cards on table edge near that seat
      const tpos = base.clone().add(inward);
      tpos.y = 0.93;

      // Offset left/right card
      const side = new THREE.Vector3().crossVectors(inward, new THREE.Vector3(0, 1, 0)).normalize();
      const spacing = (cardIndex === 0) ? -0.04 : 0.04;
      tpos.add(side.multiplyScalar(spacing));

      return tpos;
    }

    function startHand() {
      if (seats.length < 2) return;

      // Clear previous
      for (let i = 0; i < activeCards.length; i++) scene.remove(activeCards[i]);
      activeCards.length = 0;
      queue.length = 0;

      started = true;
      phase = 0;
      dealing = true;

      // Deal 2 rounds to all 6 seats (seat 0 = player placeholder, seats 1-5 bots)
      let dealIndex = 0;
      for (let round = 0; round < 2; round++) {
        for (let s = 0; s < Math.min(6, seats.length); s++) {
          const card = makeCard(backColors[(dealIndex++) % backColors.length]);
          card.position.copy(deckPos);
          scene.add(card);
          activeCards.push(card);

          const target = seatCardTarget(s, round);
          // Rotate slightly toward seat
          const rotTo = new THREE.Euler(-Math.PI / 2, 0, 0);
          const rotFrom = card.rotation.clone();

          enqueueMove(
            card,
            deckPos,
            target,
            0.22,
            rotFrom,
            rotTo,
            null
          );
        }
      }

      // Burn + flop/turn/river placeholders (face down for now)
      // We’ll just “deal” 5 community cards after hole cards
      for (let i = 0; i < 5; i++) {
        const card = makeCard(0x9b59ff);
        card.position.copy(deckPos);
        scene.add(card);
        activeCards.push(card);

        enqueueMove(card, deckPos, comm[i], 0.24, card.rotation.clone(), card.rotation.clone(), null);
      }

      if (HUD && HUD.log) HUD.log("DealingMix: dealing started.");
    }

    // Optional: restart on demand from UI action
    function handleAction(action) {
      if (action === "deal_new_hand") {
        startHand();
      }
    }

    function update(dt) {
      // Process one move at a time for clean dealing feel
      if (!queue.length) {
        dealing = false;
        return;
      }

      const m = queue[0];
      m.t += dt;
      const t = Math.min(1, m.t / m.dur);
      const e = easeOutCubic(t);

      lerpVec(m.obj.position, m.from, m.to, e);

      if (m.rotFrom && m.rotTo) {
        m.obj.rotation.set(
          m.rotFrom.x + (m.rotTo.x - m.rotFrom.x) * e,
          m.rotFrom.y + (m.rotTo.y - m.rotFrom.y) * e,
          m.rotFrom.z + (m.rotTo.z - m.rotFrom.z) * e
        );
      }

      if (t >= 1) {
        if (m.onDone) {
          try { m.onDone(); } catch (e2) {}
        }
        queue.shift();
      }
    }

    return {
      startHand: startHand,
      handleAction: handleAction,
      update: update
    };
  }
};
