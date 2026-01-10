// /js/poker_sim.js — PokerSim v4.1 (FULL)
// Fixes:
// - Cards/chips no longer deal under table (uses table.userData.surfaceY if available)
// - Per-table surfaceY fallback + sane defaults
// - Exposes ctx.poker + world.poker hooks

export const PokerSim = {
  init(ctx) {
    const { THREE, scene, world, log } = ctx;

    const state = {
      ctx,
      THREE,
      scene,
      world,
      running: true,
      tableKey: "lobby",        // "lobby" | "scorpion"
      players: 8,
      minBet: 50,
      pot: 0,
      handId: 0,
      entities: {
        cards: [],
        chips: [],
      },
      timers: {
        t: 0,
        nextHandAt: 2.0,
      },
    };

    // attach
    ctx.poker = state;
    if (world) world.poker = state;

    // helper: pick the active table mesh/group
    function getActiveTable() {
      const w = state.world || {};
      // allow world to provide explicit handles
      if (state.tableKey === "scorpion") {
        return w.scorpionTable || w.tables?.scorpion || w.tables?.scorpionTable || w.table_scorpion || null;
      }
      return w.lobbyTable || w.tables?.lobby || w.tables?.lobbyTable || w.table_lobby || w.table || null;
    }

    function getTableSurfaceY(table) {
      // Preferred: table.userData.surfaceY set by table builders (lobby + scorpion)
      const ud = table?.userData || {};
      if (Number.isFinite(ud.surfaceY)) return ud.surfaceY;

      // Fallback: if table has a known position and approximate height
      // This is conservative so we don't spawn under geometry.
      const baseY = table?.position?.y ?? 0;
      const approxTop = baseY + (ud.tableHeight ?? 0.95); // typical VR table height
      return approxTop;
    }

    function clearEntities() {
      for (const m of state.entities.cards) scene.remove(m);
      for (const m of state.entities.chips) scene.remove(m);
      state.entities.cards.length = 0;
      state.entities.chips.length = 0;
    }

    function makeCardMesh() {
      const geo = new THREE.PlaneGeometry(0.065, 0.09);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.35,
        metalness: 0.05,
        side: THREE.DoubleSide,
      });
      const m = new THREE.Mesh(geo, mat);
      m.rotation.x = -Math.PI / 2;
      m.castShadow = true;
      m.receiveShadow = true;
      return m;
    }

    function makeChipMesh() {
      const geo = new THREE.CylinderGeometry(0.018, 0.018, 0.006, 24);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xff2d7a,
        roughness: 0.3,
        metalness: 0.1,
      });
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = true;
      m.receiveShadow = true;
      return m;
    }

    function dealHand() {
      clearEntities();
      state.handId++;

      const table = getActiveTable();
      const surfaceY = getTableSurfaceY(table);
      const base = new THREE.Vector3(
        table?.position?.x ?? 0,
        surfaceY,
        table?.position?.z ?? 0
      );

      // Slight lift so it NEVER z-fights / spawns under
      const yLift = 0.018;

      // simple circle layout around table center
      const radius = (table?.userData?.dealRadius ?? 0.62);
      const center = base.clone();
      center.y = surfaceY + yLift;

      // 2 cards each
      for (let p = 0; p < state.players; p++) {
        const ang = (p / state.players) * Math.PI * 2;
        const px = center.x + Math.cos(ang) * radius;
        const pz = center.z + Math.sin(ang) * radius;

        for (let c = 0; c < 2; c++) {
          const card = makeCardMesh();
          card.position.set(px + (c * 0.03), center.y + 0.002, pz);
          card.rotation.y = -ang + Math.PI; // face inward-ish
          scene.add(card);
          state.entities.cards.push(card);
        }
      }

      // pot chips in middle
      const potCount = 12;
      for (let i = 0; i < potCount; i++) {
        const chip = makeChipMesh();
        chip.position.set(
          center.x + (Math.random() - 0.5) * 0.10,
          center.y + 0.003 + i * 0.0062,
          center.z + (Math.random() - 0.5) * 0.10
        );
        scene.add(chip);
        state.entities.chips.push(chip);
      }

      log?.(`[PokerSim] hand ✅ table=${state.tableKey} minBet=$${state.minBet} players=${state.players}`);
    }

    function update(dt) {
      if (!state.running) return;
      state.timers.t += dt;

      // auto-hands
      if (state.timers.t >= state.timers.nextHandAt) {
        state.timers.t = 0;
        state.timers.nextHandAt = 6.0; // slower, watchable
        dealHand();
      }

      // soft idle animation
      const t = performance.now() * 0.001;
      for (let i = 0; i < state.entities.chips.length; i++) {
        const m = state.entities.chips[i];
        m.rotation.y = t * 0.35 + i * 0.12;
      }
    }

    // public API
    state.setTable = (key) => {
      state.tableKey = key === "scorpion" ? "scorpion" : "lobby";
      // redeal on switch
      state.timers.t = 0;
      state.timers.nextHandAt = 0.05;
    };

    state.dealNow = () => {
      state.timers.t = 0;
      state.timers.nextHandAt = 0.01;
    };

    state.stop = () => { state.running = false; };
    state.start = () => { state.running = true; };

    // first hand soon
    state.timers.nextHandAt = 0.25;

    // hook world update
    if (world) {
      const prevUpdate = world.update;
      world.update = (dt) => {
        try { prevUpdate?.(dt); } catch {}
        try { update(dt); } catch (e) { console.error("[PokerSim] update error", e); }
      };
    }

    log?.("[PokerSim] init ✅ visual loop");
    return state;
  },
};
