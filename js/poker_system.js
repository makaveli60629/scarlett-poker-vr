// /js/systems/poker_system.js — ScarlettVR Prime 10.0
// Instanced Dealer (FULL)
// ✅ InstancedMesh cards/chips (performance)
// ✅ Signals bus integration only
// ✅ Repo-safe textures via manifest.resolve()
// ✅ No XR controller models (Hands Only rule is enforced elsewhere)
// ✅ Zero per-frame allocations (reuses temps)

export const PokerSystem = (() => {
  // ---- constants ----
  const CARD_COUNT = 52;
  const MAX_COMMUNITY = 5;
  const DEFAULT_SEATS = 6;
  const DEG2RAD = Math.PI / 180;

  // ---- helpers ----
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  function safeTex(THREE, url, log) {
    try {
      const loader = new THREE.TextureLoader();
      const tex = loader.load(
        url,
        () => log?.(`[tex] loaded ✅ ${url}`),
        undefined,
        () => log?.(`[tex] missing ⚠️ ${url} (fallback used)`)
      );
      tex.anisotropy = 2;
      return tex;
    } catch (e) {
      log?.(`[tex] load failed ⚠️ ${url} ${e?.message || String(e)}`);
      return null;
    }
  }

  // Creates a CanvasTexture banner (lightweight)
  function makeBannerTex(THREE, text, bg = "#0a1020", fg = "#ffd36b") {
    const c = document.createElement("canvas");
    c.width = 768; c.height = 256;
    const g = c.getContext("2d");
    g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = "rgba(255,211,107,0.55)";
    g.lineWidth = 10;
    g.strokeRect(14, 14, c.width - 28, c.height - 28);
    g.fillStyle = fg;
    g.font = `900 120px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, c.width / 2, c.height / 2);
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 2;
    return tex;
  }

  // ---- main ----
  return {
    init(world) {
      const { THREE, root, Signals, manifest, log } = world;

      // ----- config -----
      const seatCount = manifest?.get?.("poker.seats") ?? DEFAULT_SEATS;
      const seatRadius = manifest?.get?.("poker.seatRadius") ?? 2.35;

      const tableCenter = (manifest?.get?.("poker.tableCenter")) || { x: 0, y: 0.95, z: -9.5 };
      const deckPos = (manifest?.get?.("poker.deckPos")) || { x: tableCenter.x - 1.1, y: tableCenter.y + 0.10, z: tableCenter.z - 0.05 };
      const potPos  = (manifest?.get?.("poker.potPos"))  || { x: tableCenter.x, y: tableCenter.y + 0.06, z: tableCenter.z + 0.10 };

      const chipsPool = manifest?.get?.("poker.chipsPool") ?? 512;

      // ----- reusable temps (no allocations per frame) -----
      const tmpV = new THREE.Vector3();
      const tmpV2 = new THREE.Vector3();
      const tmpV3 = new THREE.Vector3();
      const dummy = new THREE.Object3D();

      // ----- computed seats -----
      const seats = new Array(seatCount);
      for (let i = 0; i < seatCount; i++) {
        const ang = (i / seatCount) * Math.PI * 2 + Math.PI;
        seats[i] = {
          x: tableCenter.x + Math.cos(ang) * seatRadius,
          y: tableCenter.y + 0.03,
          z: tableCenter.z + Math.sin(ang) * seatRadius,
          yaw: -ang + Math.PI / 2
        };
      }

      // ----- textures/materials -----
      const texCardBackUrl = manifest?.resolve?.("textures.cardBack") ?? "./assets/textures/card_back.png";
      const texChipUrl     = manifest?.resolve?.("textures.chip")     ?? "./assets/textures/chip_stack.png";
      const texTableUrl    = manifest?.resolve?.("textures.tableTop") ?? "./assets/textures/table_top.png";

      const cardBackTex = safeTex(THREE, texCardBackUrl, log);
      const chipTex     = safeTex(THREE, texChipUrl, log);
      const tableTex    = safeTex(THREE, texTableUrl, log);

      // cards: one material (we keep it simple for instancing)
      const cardMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.65,
        metalness: 0.05,
        map: cardBackTex || null
      });

      // felt/table mat (non-instanced)
      const tableMat = new THREE.MeshStandardMaterial({
        color: 0x134536,
        roughness: 0.78,
        metalness: 0.04,
        map: tableTex || null
      });

      // chips instanced mat
      if (chipTex) {
        chipTex.wrapS = chipTex.wrapT = THREE.RepeatWrapping;
        chipTex.repeat.set(1, 1);
      }
      const chipMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.45,
        metalness: 0.25,
        map: chipTex || null,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0.08
      });

      // ----- geometry -----
      const cardGeom = new THREE.BoxGeometry(0.062, 0.0016, 0.092);
      const chipGeom = new THREE.CylinderGeometry(0.022, 0.022, 0.010, 18);

      // ----- world visuals (table + pot ring) -----
      const felt = new THREE.Mesh(new THREE.CylinderGeometry(3.05, 3.25, 0.35, 64), tableMat);
      felt.position.set(tableCenter.x, tableCenter.y + 0.10, tableCenter.z);
      felt.name = "POKER_FELT";
      root.add(felt);

      const potRing = new THREE.Mesh(
        new THREE.RingGeometry(0.24, 0.30, 36),
        new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
      );
      potRing.rotation.x = -Math.PI / 2;
      potRing.position.set(potPos.x, potPos.y + 0.003, potPos.z);
      potRing.userData.noRay = true;
      root.add(potRing);

      // ----- instanced meshes -----
      const deckIM = new THREE.InstancedMesh(cardGeom, cardMat, CARD_COUNT);
      deckIM.frustumCulled = false;
      deckIM.name = "DECK_INST";
      root.add(deckIM);

      // hole cards pool (seatCount * 2)
      const holeCount = seatCount * 2;
      const holeIM = new THREE.InstancedMesh(cardGeom, cardMat, holeCount);
      holeIM.frustumCulled = false;
      holeIM.name = "HOLE_INST";
      root.add(holeIM);

      // community (5)
      const commIM = new THREE.InstancedMesh(cardGeom, cardMat, MAX_COMMUNITY);
      commIM.frustumCulled = false;
      commIM.name = "COMM_INST";
      root.add(commIM);

      // chips pool (instanced)
      const chipsIM = new THREE.InstancedMesh(chipGeom, chipMat, chipsPool);
      chipsIM.frustumCulled = false;
      chipsIM.name = "CHIPS_INST";
      root.add(chipsIM);

      // ----- banner -----
      const bannerTex = makeBannerTex(THREE, "WINNER");
      const bannerMat = new THREE.MeshBasicMaterial({ map: bannerTex, transparent: true });
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.55), bannerMat);
      banner.position.set(tableCenter.x, tableCenter.y + 0.75, tableCenter.z + 0.15);
      banner.visible = false;
      banner.userData.noRay = true;
      root.add(banner);

      // ----- state -----
      const S = {
        seatCount,
        seats,
        tableCenter: { ...tableCenter },
        deckPos: { ...deckPos },
        potPos: { ...potPos },

        deckIM, holeIM, commIM, chipsIM,
        holeUsed: 0,
        chipsUsed: 0,

        commFaceUp: new Array(MAX_COMMUNITY).fill(false),
        commTint: new Array(MAX_COMMUNITY).fill(0xffffff),

        motions: [], // motion jobs pooled-ish
        t: 0,

        banner,
        bannerOn: false,

        // deal animation tuning
        dealHop: manifest?.get?.("poker.dealHop") ?? 0.16,
        dealDur: manifest?.get?.("poker.dealDur") ?? 0.52,
        chipDur: manifest?.get?.("poker.chipDur") ?? 0.45
      };

      // ----- init transforms -----
      function setCardMatrixAt(inst, idx, x, y, z, yaw = 0, pitch = -90, roll = 0, scale = 1) {
        dummy.position.set(x, y, z);
        dummy.rotation.set(pitch * DEG2RAD, yaw, roll);
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        inst.setMatrixAt(idx, dummy.matrix);
      }

      function initDeckStack() {
        for (let i = 0; i < CARD_COUNT; i++) {
          setCardMatrixAt(deckIM, i, S.deckPos.x, S.deckPos.y + i * 0.001, S.deckPos.z, 0, -90, 0, 1);
        }
        deckIM.instanceMatrix.needsUpdate = true;
      }

      function initHolesHidden() {
        // park below floor
        for (let i = 0; i < holeCount; i++) {
          setCardMatrixAt(holeIM, i, 0, -50, 0, 0, -90, 0, 1);
        }
        holeIM.instanceMatrix.needsUpdate = true;
        S.holeUsed = 0;
      }

      function initCommunitySpots() {
        const baseX = S.tableCenter.x - 0.32;
        const y = S.tableCenter.y + 0.02;
        const z = S.tableCenter.z + 0.08;
        const dx = 0.16;
        for (let i = 0; i < MAX_COMMUNITY; i++) {
          setCardMatrixAt(commIM, i, baseX + i * dx, y, z, 0, -90, 0, 1);
          S.commFaceUp[i] = false;
          S.commTint[i] = 0xffffff;
        }
        commIM.instanceMatrix.needsUpdate = true;
      }

      function initChipsHidden() {
        for (let i = 0; i < chipsPool; i++) {
          dummy.position.set(0, -50, 0);
          dummy.rotation.set(Math.PI / 2, 0, 0);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          chipsIM.setMatrixAt(i, dummy.matrix);
        }
        chipsIM.instanceMatrix.needsUpdate = true;
        S.chipsUsed = 0;
      }

      initDeckStack();
      initHolesHidden();
      initCommunitySpots();
      initChipsHidden();

      // ----- Signals integration -----
      // We listen for GAME_STATE and render accordingly when needed.
      // We also listen for animation requests (DEAL_REQUEST / BET_REQUEST / REVEAL_REQUEST / WINNER)

      function resetRound() {
        S.motions.length = 0;
        S.bannerOn = false;
        S.banner.visible = false;
        initDeckStack();
        initHolesHidden();
        initCommunitySpots();
        initChipsHidden();
        log?.("[poker] reset ✅");
      }

      Signals?.on?.("GAME_RESET", resetRound);

      Signals?.on?.("DEAL_REQUEST", (p) => {
        const seat = (p?.toSeat ?? 0) | 0;
        const count = (p?.count ?? 1) | 0;
        for (let i = 0; i < count; i++) dealToSeat(seat);
      });

      Signals?.on?.("BET_REQUEST", (p) => {
        const seat = (p?.seat ?? 0) | 0;
        const amt  = (p?.amount ?? 25) | 0;
        bet(amt, seat);
      });

      Signals?.on?.("REVEAL_REQUEST", (p) => {
        const street = String(p?.street || "FLOP");
        if (street === "FLOP") revealCommunity(3);
        if (street === "TURN") revealCommunity(4);
        if (street === "RIVER") revealCommunity(5);
      });

      Signals?.on?.("WINNER", (p) => {
        const seat = (p?.seat ?? 0) | 0;
        setWinner(seat);
      });

      // Optional: When rules emit GAME_STATE, you can sync visuals (future)
      Signals?.on?.("GAME_STATE", (p) => {
        // Keep light: no heavy work here unless needed.
        // This exists so the rules engine can drive visuals later.
        // p.state could include communityUpTo, pot, etc.
      });

      // ----- animation jobs -----
      // Job structure:
      // { kind:'card'|'chip', inst:InstancedMesh, idx:number, t:number, dur:number, p0:{x,y,z}, p1:{x,y,z}, p2:{x,y,z}, yaw:number }

      function bez2(out, p0, p1, p2, t) {
        const a = (1 - t) * (1 - t);
        const b = 2 * (1 - t) * t;
        const c = t * t;
        out.x = p0.x * a + p1.x * b + p2.x * c;
        out.y = p0.y * a + p1.y * b + p2.y * c;
        out.z = p0.z * a + p1.z * b + p2.z * c;
        return out;
      }

      function dealToSeat(seatIndex = 0) {
        if (S.holeUsed >= holeCount) {
          log?.("[poker] hole pool exhausted ⚠️ (increase seats or pool)");
          return;
        }
        const seat = S.seats[(seatIndex | 0) % S.seatCount];
        const idx = S.holeUsed++;
        const tgtX = seat.x;
        const tgtY = seat.y + 0.04;
        const tgtZ = seat.z - 0.18;

        // start from deck
        setCardMatrixAt(holeIM, idx, S.deckPos.x, S.deckPos.y, S.deckPos.z, 0, -90, 0, 1);
        holeIM.instanceMatrix.needsUpdate = true;

        // motion
        const p0 = { x: S.deckPos.x, y: S.deckPos.y, z: S.deckPos.z };
        const p2 = { x: tgtX, y: tgtY, z: tgtZ };
        const p1 = { x: (p0.x + p2.x) * 0.5, y: (p0.y + p2.y) * 0.5 + S.dealHop, z: (p0.z + p2.z) * 0.5 };

        S.motions.push({
          kind: "card",
          inst: holeIM,
          idx,
          t: 0,
          dur: S.dealDur,
          p0, p1, p2,
          yaw: seat.yaw
        });
      }

      function revealCommunity(count = 3) {
        // We simulate reveal by "lifting" slightly and tint effect.
        // True face mapping can be added later with a sprite atlas.
        const n = Math.max(0, Math.min(MAX_COMMUNITY, count | 0));
        for (let i = 0; i < n; i++) S.commFaceUp[i] = true;
      }

      function bet(amount = 25, seatIndex = 0) {
        if (S.chipsUsed >= chipsPool) {
          log?.("[poker] chip pool exhausted ⚠️ (increase poker.chipsPool)");
          return;
        }
        const seat = S.seats[(seatIndex | 0) % S.seatCount];
        const idx = S.chipsUsed++;

        const start = { x: seat.x, y: seat.y + 0.04, z: seat.z - 0.25 };
        const end   = { x: S.potPos.x, y: S.potPos.y + 0.01, z: S.potPos.z };

        const mid = {
          x: (start.x + end.x) * 0.5,
          y: (start.y + end.y) * 0.5 + 0.18,
          z: (start.z + end.z) * 0.5
        };

        // place at start
        dummy.position.set(start.x, start.y, start.z);
        dummy.rotation.set(Math.PI / 2, 0, 0);
        dummy.updateMatrix();
        chipsIM.setMatrixAt(idx, dummy.matrix);
        chipsIM.instanceMatrix.needsUpdate = true;

        S.motions.push({
          kind: "chip",
          inst: chipsIM,
          idx,
          t: 0,
          dur: S.chipDur,
          p0: start, p1: mid, p2: end,
          yaw: 0
        });
      }

      function setWinner(winnerSeatIndex = 0) {
        S.bannerOn = true;
        S.banner.visible = true;
        // simple shimmer; tint community (optional)
        for (let i = 0; i < MAX_COMMUNITY; i++) {
          S.commTint[i] = (i % 2 === 0) ? 0xfff2c2 : 0xd8f0ff;
        }
        log?.(`[poker] winner seat=${winnerSeatIndex}`);
      }

      // ----- tick/update -----
      function updateMotions(dt) {
        // iterate backwards to remove finished jobs
        for (let i = S.motions.length - 1; i >= 0; i--) {
          const m = S.motions[i];
          m.t += dt;
          const u = clamp01(m.t / m.dur);
          const eu = easeInOut(u);

          // bezier
          const p = bez2(tmpV, m.p0, m.p1, m.p2, eu);

          if (m.kind === "card") {
            setCardMatrixAt(m.inst, m.idx, p.x, p.y, p.z, m.yaw, -90, Math.sin(u * Math.PI) * 0.22, 1);
            if (u >= 1) {
              setCardMatrixAt(m.inst, m.idx, m.p2.x, m.p2.y, m.p2.z, m.yaw, -90, 0, 1);
              S.motions.splice(i, 1);
            }
            m.inst.instanceMatrix.needsUpdate = true;
          }

          if (m.kind === "chip") {
            dummy.position.set(p.x, p.y, p.z);
            dummy.rotation.set(Math.PI / 2, 0, 0);
            dummy.updateMatrix();
            m.inst.setMatrixAt(m.idx, dummy.matrix);
            if (u >= 1) {
              dummy.position.set(m.p2.x, m.p2.y, m.p2.z);
              dummy.updateMatrix();
              m.inst.setMatrixAt(m.idx, dummy.matrix);
              S.motions.splice(i, 1);
            }
            m.inst.instanceMatrix.needsUpdate = true;
          }
        }
      }

      function updateCommunity(dt, t) {
        // "Reveal" effect: slight lift + pulse
        const baseX = S.tableCenter.x - 0.32;
        const baseY = S.tableCenter.y + 0.02;
        const baseZ = S.tableCenter.z + 0.08;
        const dx = 0.16;

        for (let i = 0; i < MAX_COMMUNITY; i++) {
          const up = S.commFaceUp[i] ? 0.010 + Math.sin(t * 2.2 + i) * 0.002 : 0.0;
          const x = baseX + i * dx;
          const y = baseY + up;
          const z = baseZ;

          // Note: material tinting per instance needs instanceColor (optional).
          // We keep it matrix-only here for performance. You can add instanceColor later.
          setCardMatrixAt(commIM, i, x, y, z, 0, -90, 0, 1);
        }
        commIM.instanceMatrix.needsUpdate = true;
      }

      function updateBanner(t) {
        if (!S.bannerOn) return;
        S.banner.position.y = S.tableCenter.y + 0.75 + Math.sin(t * 2.2) * 0.02;
      }

      const api = {
        // For debugging/tools
        reset: resetRound,

        // Tick called by world
        update(dt, t) {
          S.t = t;
          if (dt) updateMotions(dt);
          updateCommunity(dt, t);
          updateBanner(t);
        },

        // Optional direct command helpers (still Signals-first recommended)
        commands: {
          dealToSeat,
          bet,
          revealCommunity,
          setWinner
        }
      };

      log?.("[poker] PokerSystem Prime 10.0 init ✅ (instanced)");
      Signals?.emit?.("UI_MESSAGE", { text: "PokerSystem Prime 10.0 online", level: "info" });

      return api;
    }
  };
})();
