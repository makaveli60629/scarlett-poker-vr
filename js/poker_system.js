// /js/poker_system.js — PokerSystem v2 (Textures + Smooth Deal + Hover-Peek + Winner Overlay + Pot)
// ✅ Update-driven (no requestAnimationFrame spam)
// ✅ Safe texture loader (missing files won't crash)

export const PokerSystem = (() => {
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

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

  function safeLoadTexture(THREE, url, log) {
    // Safe: returns null if missing; never throws
    try {
      const loader = new THREE.TextureLoader();
      const tex = loader.load(
        url,
        () => log?.(`[tex] loaded ✅ ${url}`),
        undefined,
        () => log?.(`[tex] missing ⚠️ ${url} (fallback material used)`)
      );
      tex.anisotropy = 2;
      return tex;
    } catch (e) {
      log?.(`[tex] load failed ⚠️ ${url}`, String(e?.message || e));
      return null;
    }
  }

  function makeCardMesh(THREE, mats) {
    const geo = new THREE.BoxGeometry(0.062, 0.0016, 0.092);

    // BoxGeometry material order:
    // [ +x, -x, +y, -y, +z, -z ] (varies by build, but we'll keep consistent)
    // We'll treat +y as "face" and -y as "back" by rotating cards flat.
    const card = new THREE.Mesh(geo, mats);
    card.castShadow = false;
    card.receiveShadow = false;

    // Lay flat
    card.rotation.x = -Math.PI / 2;
    return card;
  }

  function makeChipMesh(THREE, color = 0xffd36b, chipTex = null) {
    const geo = new THREE.CylinderGeometry(0.022, 0.022, 0.010, 18);
    let mat;
    if (chipTex) {
      chipTex.wrapS = chipTex.wrapT = THREE.RepeatWrapping;
      chipTex.repeat.set(1, 1);
      mat = new THREE.MeshStandardMaterial({
        map: chipTex,
        color,
        roughness: 0.45,
        metalness: 0.25,
        emissive: new THREE.Color(color),
        emissiveIntensity: 0.10
      });
    } else {
      mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.45,
        metalness: 0.25,
        emissive: new THREE.Color(color),
        emissiveIntensity: 0.10
      });
    }
    const chip = new THREE.Mesh(geo, mat);
    chip.rotation.x = Math.PI / 2;
    return chip;
  }

  return {
    init(ctx, opt = {}) {
      const { THREE, root, scene, log, camera } = ctx;

      const state = {
        THREE,
        root: root || scene,
        camera,

        tableCenter: opt.tableCenter || new THREE.Vector3(0, 0.95, -9.5),

        deckPos: null,
        potPos: null,

        seats: [],
        seatCount: opt.seatCount ?? 6,
        seatRadius: opt.seatRadius ?? 2.35,

        // cards & chips
        cards: [],
        chips: [],
        motions: [],

        // community cards
        community: [],
        communityFaceUp: [],

        // hover-peek settings
        hoverPeek: true,
        peekDistance: 0.16,

        // winner overlay
        winnerBanner: null,
        winnerActive: false,

        // materials/textures
        tex: {
          cardBack: null,
          tableTop: null,
          chip: null
        },
        mats: {
          cardMats: null,
          deckMat: null
        },

        // temp
        tmpV: new THREE.Vector3(),
        tmpQ: new THREE.Quaternion(),

        // anim config
        dealHop: opt.dealHop ?? 0.16,
        dealDur: opt.dealDur ?? 0.52,
        chipDur: opt.chipDur ?? 0.45
      };

      // Paths (safe)
      const base = opt.assetBase || "./assets/textures";
      state.tex.cardBack = safeLoadTexture(THREE, `${base}/card_back.png`, log);
      state.tex.tableTop = safeLoadTexture(THREE, `${base}/table_top.png`, log);
      state.tex.chip = safeLoadTexture(THREE, `${base}/chip_stack.png`, log);

      // Deck & pot positions
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
      for (let i = 0; i < state.seatCount; i++) {
        const ang = (i / state.seatCount) * Math.PI * 2 + Math.PI;
        const pos = new THREE.Vector3(
          state.tableCenter.x + Math.cos(ang) * state.seatRadius,
          state.tableCenter.y + 0.03,
          state.tableCenter.z + Math.sin(ang) * state.seatRadius
        );
        const yaw = -ang + Math.PI / 2;
        state.seats.push({ pos, yaw });
      }

      // Card materials (face/back + edges)
      const edgeMat = new THREE.MeshStandardMaterial({ color: 0xe6e6e6, roughness: 0.8, metalness: 0.05 });
      const faceMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.65,
        metalness: 0.05,
        emissive: new THREE.Color(0x000000),
        emissiveIntensity: 0
      });

      const backMat = state.tex.cardBack
        ? new THREE.MeshStandardMaterial({ map: state.tex.cardBack, roughness: 0.65, metalness: 0.05 })
        : new THREE.MeshStandardMaterial({ color: 0x1a2a48, roughness: 0.65, metalness: 0.05 });

      // We’ll map:
      // +y = face, -y = back, edges = everything else
      state.mats.cardMats = [edgeMat, edgeMat, faceMat, backMat, edgeMat, edgeMat];

      // Deck placeholder (uses backMat if exists)
      const deckMat = state.tex.cardBack
        ? new THREE.MeshStandardMaterial({ map: state.tex.cardBack, roughness: 0.55, metalness: 0.15 })
        : new THREE.MeshStandardMaterial({ color: 0x0a1020, roughness: 0.6, metalness: 0.2 });

      const deck = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.26), deckMat);
      deck.position.copy(state.deckPos);
      state.root.add(deck);

      // Pot ring
      const potRing = new THREE.Mesh(
        new THREE.RingGeometry(0.24, 0.30, 36),
        new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
      );
      potRing.rotation.x = -Math.PI / 2;
      potRing.position.copy(state.potPos);
      potRing.position.y += 0.003;
      state.root.add(potRing);

      // Winner banner
      state.winnerBanner = makeBanner(THREE, "WINNER", 0x0a1020, 0xffd36b);
      state.winnerBanner.position.set(state.tableCenter.x, state.tableCenter.y + 0.75, state.tableCenter.z + 0.15);
      state.winnerBanner.visible = false;
      state.root.add(state.winnerBanner);

      // Community card spots (5)
      const c0 = new THREE.Vector3(state.tableCenter.x - 0.32, state.tableCenter.y + 0.02, state.tableCenter.z + 0.08);
      const dx = 0.16;
      for (let i = 0; i < 5; i++) {
        const p = c0.clone().add(new THREE.Vector3(i * dx, 0, 0));
        const card = makeCardMesh(THREE, state.mats.cardMats);
        card.position.copy(p);
        card.userData.kind = "community";
        card.userData.index = i;
        card.userData.faceUp = false;
        card.userData.peek = false;
        card.userData.baseYaw = 0;
        // start face-down
        card.rotation.z = 0;
        card.rotation.y = 0;
        card.material[2].color.setHex(0x1b1b1b); // face dark until "revealed"
        state.root.add(card);
        state.community.push(card);
        state.communityFaceUp.push(false);
      }

      log?.("[poker] PokerSystem v2 init ✅");

      const api = {
        state,
        resetRound() {
          state.winnerActive = false;
          state.winnerBanner.visible = false;
          // reset community
          for (let i = 0; i < state.community.length; i++) {
            const c = state.community[i];
            c.userData.faceUp = false;
            c.userData.peek = false;
            c.material[2].color.setHex(0x1b1b1b);
          }
          // clean motions (safe)
          state.motions.length = 0;
        },

        // Deal a facedown card to seat index
        dealToSeat(seatIndex = 0) {
          const seat = state.seats[(seatIndex | 0) % state.seats.length];
          const targetPos = seat.pos.clone().add(new THREE.Vector3(0, 0.04, -0.18));
          const targetYaw = seat.yaw;

          const card = makeCardMesh(THREE, state.mats.cardMats);
          card.position.copy(state.deckPos);
          card.rotation.y = 0;
          card.userData.kind = "hole";
          card.userData.seatIndex = seatIndex | 0;
          card.userData.faceUp = false; // never show opponent cards by default
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
            yaw: targetYaw
          };
          state.motions.push(job);
          return card;
        },

        // Reveal community cards (flop/turn/river)
        revealCommunity(count = 3) {
          for (let i = 0; i < Math.min(count, 5); i++) {
            state.communityFaceUp[i] = true;
            // brighten face (placeholder “revealed”)
            state.community[i].material[2].color.setHex(0xffffff);
          }
        },

        // Smooth chip bet from seat to pot
        bet(amount = 1, seatIndex = 0) {
          const seat = state.seats[(seatIndex | 0) % state.seats.length];
          const color = amount >= 100 ? 0xffd36b : amount >= 25 ? 0x66ccff : 0xff6bd6;

          const chip = makeChipMesh(THREE, color, state.tex.chip);
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
            p2: state.potPos.clone()
          };
          state.motions.push(job);
          return chip;
        },

        // Winner overlay demo: highlight winners by “overlaying” community cards
        setWinner(winnerSeatIndex = 0) {
          state.winnerActive = true;
          state.winnerBanner.visible = true;

          // overlay effect: tint non-winning community darker, winning brighter
          for (let i = 0; i < 5; i++) {
            const c = state.community[i];
            if (state.communityFaceUp[i]) {
              c.material[2].color.setHex(i % 2 === 0 ? 0xfff2c2 : 0xd8f0ff);
            }
          }
        },

        // Hover-peek for community cards (faces player only while hovered)
        updateHoverPeek() {
          if (!state.hoverPeek || !state.camera) return;

          const camPos = state.tmpV.setFromMatrixPosition(state.camera.matrixWorld);

          for (let i = 0; i < state.community.length; i++) {
            const card = state.community[i];

            // Only peek if card is "revealed"
            if (!state.communityFaceUp[i]) continue;

            const d = camPos.distanceTo(card.position);
            const shouldPeek = d < 2.2; // broad comfort range

            // "aim" requirement simplified: if close enough, peek
            card.userData.peek = shouldPeek;

            if (shouldPeek) {
              // face the player (yaw only)
              const dx = camPos.x - card.position.x;
              const dz = camPos.z - card.position.z;
              const yaw = Math.atan2(dx, dz);
              card.rotation.y = yaw;
              card.rotation.z = 0;
              card.userData.faceUp = true;
            } else {
              // relax back down
              card.rotation.y *= 0.90;
              card.userData.faceUp = false;
            }
          }
        },

        update(dt, t) {
          // update motions
          for (let i = state.motions.length - 1; i >= 0; i--) {
            const m = state.motions[i];
            if (!m.active) { state.motions.splice(i, 1); continue; }

            m.t += dt;
            const u = clamp01(m.t / m.duration);
            const eu = easeInOut(u);

            if (m.kind === "card") {
              bezier2(state.tmpV, m.p0, m.p1, m.p2, eu);
              m.obj.position.copy(state.tmpV);

              // slight travel wobble
              m.obj.rotation.z = Math.sin(u * Math.PI) * 0.22;

              // settle yaw
              m.obj.rotation.y = m.yaw;

              if (u >= 1) {
                m.obj.position.copy(m.p2);
                m.obj.rotation.z = 0;
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

          // hover-peek
          api.updateHoverPeek();

          // winner banner shimmer
          if (state.winnerActive && state.winnerBanner) {
            state.winnerBanner.position.y = state.tableCenter.y + 0.75 + Math.sin(t * 2.2) * 0.02;
          }
        }
      };

      return api;
    }
  };

  function makeBanner(THREE, text, bg = 0x0a1020, fg = 0xffd36b) {
    const canvas = document.createElement("canvas");
    canvas.width = 768; canvas.height = 256;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = hex(bg);
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(255,211,107,0.55)";
    ctx.lineWidth = 10;
    ctx.strokeRect(14, 14, canvas.width - 28, canvas.height - 28);

    ctx.fillStyle = hex(fg);
    ctx.font = `900 120px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 2;

    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.55), mat);
    return mesh;
  }

  function hex(n) {
    const c = Number(n >>> 0).toString(16).padStart(6, "0");
    return `#${c}`;
  }
})();
